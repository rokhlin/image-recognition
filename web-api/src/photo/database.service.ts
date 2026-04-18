import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectEntityManager, EntityManager } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectEntityManager() private entityManager: EntityManager) {}

  async onModuleInit() {
    // Initialize connection if needed
  }

  async onModuleDestroy() {
    // Cleanup resources
  }

  async saveFaceEmbedding(photoId: number, embedding: number[], bbox: string[]) {
    const sql = `
      INSERT INTO "FaceEmbedding" (photoId, embedding, bbox) 
      VALUES ($1, $2, $3)
    `;
    
    this.entityManager.query(sql, [photoId, embedding, JSON.stringify(bbox)]);
  }

  async saveSceneEmbedding(photoId: number, embedding: number[]) {
    const sql = `
      INSERT INTO "SceneEmbedding" (photoId, embedding) 
      VALUES ($1, $2)
    `;
    
    this.entityManager.query(sql, [photoId, embedding]);
  }

  async searchSimilarFaces(targetEmbedding: number[]): Promise<any[]> {
    const vectorString = `[${targetEmbedding.join(',')}]`;
    
    return await this.entityManager.query(`
      SELECT "photoId", (1 - (embedding <=> ${vectorString}::vector)) as similarity
      FROM "FaceEmbedding"
      WHERE (1 - (embedding <=> ${vectorString}::vector)) > 0.6
      ORDER BY similarity DESC
      LIMIT 10;
    `);
  }

  async searchSimilarScenes(targetEmbedding: number[]): Promise<any[]> {
    const vectorString = `[${targetEmbedding.join(',')}]`;
    
    return await this.entityManager.query(`
      SELECT "photoId", (embedding <#> ${vectorString}::vector) as similarity
      FROM "SceneEmbedding"
      WHERE (embedding <#> ${vectorString}::vector) < 0.6
      ORDER BY similarity ASC
      LIMIT 10;
    `);
  }

  async getPhotos(): Promise<any[]> {
    return await this.entityManager.query(`
      SELECT * FROM "Photo" ORDER BY "createdAt" DESC;
    `);
  }
}
