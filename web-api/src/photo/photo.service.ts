import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { DatabaseService } from './database.service';
import { PhotoProcessor } from './photo.processor';

@Injectable()
export class PhotoService {
  constructor(
    @InjectQueue('photo-analysis') private photoQueue: Queue,
    private databaseService: DatabaseService,
    private photoProcessor: PhotoProcessor
  ) {}

  async queuePhotoForAnalysis(filePath: string) {
    // Generate unique job ID based on filename and timestamp
    const fileName = filePath.split('/').pop() || 'unknown';
    const jobData = {
      filePath,
      fileName: fileName,
    };

    await this.photoQueue.add(
      'analyze',
      jobData,
      {
        attempts: 3, // Retry 3 times if ML engine is busy
        backoff: {
          type: 'exponential',
          delay: 5000, // Wait 5s between retries
        },
        timeout: 60000, // Max execution time before failure
      }
    );

    console.log(`Photo analysis job queued for: ${filePath}`);
  }

  async processFaceResults(filePath: string, faces: any[]): Promise<void> {
    if (!faces || faces.length === 0) return;

    for (const face of faces) {
      try {
        // Extract embedding and bbox
        const embedding = face.embedding;
        const bbox = face.bbox.map(v => parseFloat(v));
        const confidence = face.prob;

        // Get photo ID from file path (would be passed in real implementation)
        const photoId = await this.getPhotoIdFromPath(filePath);

        if (photoId) {
          await this.databaseService.saveFaceEmbedding(photoId, embedding, bbox);
        }
      } catch (error) {
        console.error('Error saving face embedding:', error.message);
      }
    }
  }

  async processSceneResults(filePath: string, scene: any): Promise<void> {
    try {
      const embedding = scene.embedding;
      const photoId = await this.getPhotoIdFromPath(filePath);

      if (photoId) {
        await this.databaseService.saveSceneEmbedding(photoId, embedding);
      }
    } catch (error) {
      console.error('Error saving scene embedding:', error.message);
    }
  }

  private async getPhotoIdFromPath(filePath: string): Promise<number | null> {
    // In a real implementation, this would match filePath with uploaded photos
    // For now, we'll return null since we don't have photo metadata yet
    return null;
  }

  async searchSimilarFaces(targetEmbedding: number[]): Promise<any[]> {
    return await this.databaseService.searchSimilarFaces(targetEmbedding);
  }

  async searchSimilarScenes(targetEmbedding: number[]): Promise<any[]> {
    return await this.databaseService.searchSimilarScenes(targetEmbedding);
  }

  async getPhotos(): Promise<any[]> {
    return await this.databaseService.getPhotos();
  }
}
