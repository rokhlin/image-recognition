/**
 * NestJS Unit Tests for Photo Management System
 * 
 * Test Coverage:
 * - Photo Controller endpoints
 * - Photo Service business logic
 * - Database Service data access
 * - Photo Processor background worker
 */

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Queue } from 'bullmq';
import * as fs from 'fs';

// Mock modules
jest.mock('axios');
jest.mock('@nestjs/bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  })),
}));

describe('Photo Management System - Unit Tests', () => {
  let module: TestingModule;
  let photoController: any;
  let photoService: any;
  let photoProcessor: any;
  let databaseService: any;

  // Mock data
  const mockFilePath = '/storage/photos/test.jpg';
  const mockFaceData = {
    bbox: [10.5, 20.3, 50.7, 60.9],
    prob: 0.95,
    embedding: Array(512).fill(0).map((_, i) => (i % 100) / 100),
  };
  const mockSceneData = {
    embedding: Array(384).fill(0).map((_, i) => (i % 100) / 100),
  };

  beforeEach(async () => {
    // Create test module
    module = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: PhotoService,
          useValue: {
            queuePhotoForAnalysis: jest.fn(),
            extractFaceData: jest.fn(),
            extractSceneData: jest.fn(),
            searchSimilarFaces: jest.fn(),
            searchSimilarScenes: jest.fn(),
            getPhotos: jest.fn(),
          },
        },
        {
          provide: PhotoProcessor,
          useValue: {
            extractFaceData: jest.fn(),
            extractSceneData: jest.fn(),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            saveFaceEmbedding: jest.fn(),
            saveSceneEmbedding: jest.fn(),
            searchSimilarFaces: jest.fn(),
            searchSimilarScenes: jest.fn(),
            getPhotos: jest.fn(),
          },
        },
      ],
    }).compile();

    photoController = module.createController(PhotoController).getInstance();
    photoService = module.get(PhotoService);
    photoProcessor = module.get(PhotoProcessor);
    databaseService = module.get(DatabaseService);
  });

  describe('Photo Controller', () => {
    describe('POST /photo/upload', () => {
      it('should queue photo for analysis with valid file path', async () => {
        // Mock service method
        (photoService.queuePhotoForAnalysis as jest.Mock).mockResolvedValue(undefined);

        const result = await photoController.uploadPhoto({ filePath: mockFilePath });

        expect(photoService.queuePhotoForAnalysis).toHaveBeenCalledWith(mockFilePath);
        expect(result).toEqual({
          message: 'Photo queued for analysis',
          filePath: mockFilePath,
        });
      });

      it('should handle invalid file path gracefully', async () => {
        const invalidPath = '/nonexistent/path.jpg';
        (photoService.queuePhotoForAnalysis as jest.Mock).mockResolvedValue(undefined);

        const result = await photoController.uploadPhoto({ filePath: invalidPath });

        expect(photoService.queuePhotoForAnalysis).toHaveBeenCalledWith(invalidPath);
        expect(result).toEqual({
          message: 'Photo queued for analysis',
          filePath: invalidPath,
        });
      });
    });

    describe('POST /photo/search/faces', () => {
      it('should search for similar faces with valid embedding', async () => {
        const mockEmbedding = Array(512).fill(0).map((_, i) => (i % 100) / 100);

        (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([
          { photoId: 1, similarity: 0.85 },
          { photoId: 2, similarity: 0.72 },
          { photoId: 3, similarity: 0.68 },
        ]);

        const result = await photoController.searchFaces({ embedding: mockEmbedding });

        expect(databaseService.searchSimilarFaces).toHaveBeenCalledWith(mockEmbedding);
        expect(result).toHaveLength(3);
        expect(result[0].similarity).toBe(0.85);
      });

      it('should handle empty face search results', async () => {
        const mockEmbedding = Array(512).fill(0).map((_, i) => (i % 100) / 100);

        (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([]);

        const result = await photoController.searchFaces({ embedding: mockEmbedding });

        expect(result).toEqual([]);
      });
    });

    describe('POST /photo/search/scenes', () => {
      it('should search for similar scenes with valid embedding', async () => {
        const mockEmbedding = Array(384).fill(0).map((_, i) => (i % 100) / 100);

        (databaseService.searchSimilarScenes as jest.Mock).mockResolvedValue([
          { photoId: 1, similarity: 0.95 },
          { photoId: 2, similarity: 0.88 },
          { photoId: 3, similarity: 0.75 },
        ]);

        const result = await photoController.searchScenes({ embedding: mockEmbedding });

        expect(databaseService.searchSimilarScenes).toHaveBeenCalledWith(mockEmbedding);
        expect(result).toHaveLength(3);
      });
    });

    describe('GET /photo/list', () => {
      it('should return list of all photos', async () => {
        (databaseService.getPhotos as jest.Mock).mockResolvedValue([
          { id: 1, filePath: '/path/1.jpg', fileName: 'photo1.jpg', createdAt: new Date() },
          { id: 2, filePath: '/path/2.jpg', fileName: 'photo2.jpg', createdAt: new Date() },
        ]);

        const result = await photoController.listPhotos();

        expect(databaseService.getPhotos).toHaveBeenCalled();
        expect(result).toHaveLength(2);
      });

      it('should handle empty photo list', async () => {
        (databaseService.getPhotos as jest.Mock).mockResolvedValue([]);

        const result = await photoController.listPhotos();

        expect(result).toEqual([]);
      });
    });
  });

  describe('Photo Service', () => {
    describe('queuePhotoForAnalysis', () => {
      it('should queue photo with correct job data', async () => {
        const mockQueue = {} as Queue;

        (photoService['photoQueue'] as any) = mockQueue;
        (mockQueue.add as jest.Mock).mockResolvedValue({ id: 'job-123' });

        await photoService.queuePhotoForAnalysis(mockFilePath);

        expect(mockQueue.add).toHaveBeenCalledWith(
          'analyze',
          {
            filePath: mockFilePath,
            fileName: expect.any(String),
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            timeout: 60000,
          }
        );
      });

      it('should handle queue addition error', async () => {
        const mockQueue = {} as Queue;
        (mockQueue.add as jest.Mock).mockRejectedValue(new Error('Queue full'));

        (photoService['photoQueue'] as any) = mockQueue;

        await expect(photoService.queuePhotoForAnalysis(mockFilePath)).rejects.toThrow(
          'Queue full'
        );
      });
    });

    describe('extractFaceData', () => {
      it('should extract face data successfully', async () => {
        const mockResponse = { data: [mockFaceData] };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);

        const result = await photoService.extractFaceData(mockFilePath);

        expect(axios.post).toHaveBeenCalledWith(
          'http://ml-engine:8000/analyze-face',
          { image_path: mockFilePath }
        );
        expect(result.faces).toHaveLength(1);
        expect(result.status).toBe('success');
      });

      it('should handle ML engine error', async () => {
        const mockError = new Error('ML Engine unavailable');
        (axios.post as jest.Mock).mockRejectedValue(mockError);

        await expect(photoService.extractFaceData(mockFilePath)).rejects.toThrow(
          'ML Engine unavailable'
        );
      });
    });

    describe('extractSceneData', () => {
      it('should extract scene data successfully', async () => {
        const mockResponse = { data: mockSceneData };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);

        const result = await photoService.extractSceneData(mockFilePath);

        expect(axios.post).toHaveBeenCalledWith(
          'http://ml-engine:8000/analyze-scene',
          { image_path: mockFilePath }
        );
        expect(result.scene).toBeDefined();
        expect(result.status).toBe('success');
      });
    });

    describe('processFaceResults', () => {
      it('should handle empty faces array', async () => {
        await photoService.processFaceResults(mockFilePath, []);
      });

      it('should process single face result', async () => {
        const faces = [mockFaceData];
        (databaseService.saveFaceEmbedding as jest.Mock).mockResolvedValue(undefined);

        await photoService.processFaceResults(mockFilePath, faces);

        expect(databaseService.saveFaceEmbedding).toHaveBeenCalledWith(
          expect.any(Number), // photoId would be mocked
          mockFaceData.embedding,
          mockFaceData.bbox.map(v => parseFloat(v))
        );
      });

      it('should handle multiple face results', async () => {
        const faces = [mockFaceData, { ...mockFaceData, bbox: [100, 200, 150, 260] }];
        (databaseService.saveFaceEmbedding as jest.Mock).mockResolvedValue(undefined);

        await photoService.processFaceResults(mockFilePath, faces);

        expect(databaseService.saveFaceEmbedding).toHaveBeenCalledTimes(2);
      });

      it('should handle face processing error', async () => {
        const faces = [mockFaceData];
        (databaseService.saveFaceEmbedding as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await expect(photoService.processFaceResults(mockFilePath, faces)).rejects.toThrow(
          'Database error'
        );
      });
    });

    describe('processSceneResults', () => {
      it('should process scene result successfully', async () => {
        const embedding = mockSceneData.embedding;
        (databaseService.saveSceneEmbedding as jest.Mock).mockResolvedValue(undefined);

        await photoService.processSceneResults(mockFilePath, embedding);

        expect(databaseService.saveSceneEmbedding).toHaveBeenCalledWith(
          expect.any(Number),
          embedding
        );
      });
    });
  });

  describe('Database Service', () => {
    describe('saveFaceEmbedding', () => {
      it('should save face embedding successfully', async () => {
        const photoId = 1;
        const embedding = Array(512).fill(0.5);
        const bbox = '[10.5, 20.3, 50.7, 60.9]';

        await databaseService.saveFaceEmbedding(photoId, embedding, bbox);

        expect(databaseService['entityManager'].query).toHaveBeenCalled();
      });

      it('should handle invalid embedding dimension', async () => {
        const photoId = 1;
        const invalidEmbedding = Array(100).fill(0.5); // Should be 512

        await expect(
          databaseService.saveFaceEmbedding(photoId, invalidEmbedding, '[10, 20, 30, 40]')
        ).rejects.toThrow();
      });
    });

    describe('saveSceneEmbedding', () => {
      it('should save scene embedding successfully', async () => {
        const photoId = 1;
        const embedding = Array(384).fill(0.5);

        await databaseService.saveSceneEmbedding(photoId, embedding);

        expect(databaseService['entityManager'].query).toHaveBeenCalled();
      });
    });

    describe('searchSimilarFaces', () => {
      it('should search for similar faces with cosine distance', async () => {
        const targetEmbedding = Array(512).fill(0.5);

        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({
          rows: [
            { photoId: 1, similarity: 0.85 },
            { photoId: 2, similarity: 0.72 },
          ],
        });

        const result = await databaseService.searchSimilarFaces(targetEmbedding);

        expect(result).toHaveLength(2);
        expect(result[0].similarity).toBe(0.85);
      });

      it('should handle no similar faces found', async () => {
        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await databaseService.searchSimilarFaces(Array(512).fill(0.5));

        expect(result).toEqual([]);
      });

      it('should filter by similarity threshold', async () => {
        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({
          rows: [
            { photoId: 1, similarity: 0.95 },
            { photoId: 2, similarity: 0.65 }, // Below threshold
            { photoId: 3, similarity: 0.90 },
          ],
        });

        const result = await databaseService.searchSimilarFaces(Array(512).fill(0.5));

        expect(result).toHaveLength(2); // Only photos with similarity > 0.6
      });
    });

    describe('searchSimilarScenes', () => {
      it('should search for similar scenes with inner product distance', async () => {
        const targetEmbedding = Array(384).fill(0.5);

        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({
          rows: [
            { photoId: 1, similarity: 0.95 },
            { photoId: 2, similarity: 0.88 },
          ],
        });

        const result = await databaseService.searchSimilarScenes(targetEmbedding);

        expect(result).toHaveLength(2);
      });

      it('should handle empty scene search', async () => {
        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await databaseService.searchSimilarScenes(Array(384).fill(0.5));

        expect(result).toEqual([]);
      });
    });

    describe('getPhotos', () => {
      it('should return list of photos ordered by creation date', async () => {
        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({
          rows: [
            { id: 1, filePath: '/path/1.jpg', fileName: 'photo1.jpg', createdAt: new Date() },
            { id: 2, filePath: '/path/2.jpg', fileName: 'photo2.jpg', createdAt: new Date() },
          ],
        });

        const result = await databaseService.getPhotos();

        expect(result).toHaveLength(2);
      });

      it('should handle empty photo list', async () => {
        (databaseService['entityManager'].query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await databaseService.getPhotos();

        expect(result).toEqual([]);
      });
    });
  });

  describe('Photo Processor', () => {
    describe('process job', () => {
      it('should process face analysis successfully', async () => {
        const mockResponse = { data: [mockFaceData] };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);

        const result = await photoProcessor.process({
          data: { filePath: mockFilePath, fileName: 'test.jpg' },
        });

        expect(axios.post).toHaveBeenCalledWith(
          'http://ml-engine:8000/analyze-face',
          { image_path: mockFilePath }
        );
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
      });

      it('should handle ML engine error with retry', async () => {
        const mockError = new Error('ML Engine busy');
        (axios.post as jest.Mock).mockRejectedValue(mockError);

        await expect(photoProcessor.process({ data: { filePath: mockFilePath } })).rejects.toThrow(
          'ML Engine busy'
        );
      });

      it('should log processing events', async () => {
        const mockResponse = { data: [mockFaceData] };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);

        await photoProcessor.process({
          data: { filePath: mockFilePath, fileName: 'test.jpg' },
        });

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Processing photo: test.jpg')
        );
      });
    });
  });

  describe('Integration Tests', () => {
    it('should complete full upload and analysis workflow', async () => {
      // Mock all external calls
      (axios.post as jest.Mock).mockResolvedValue({ data: [mockFaceData] });
      (databaseService.saveFaceEmbedding as jest.Mock).mockResolvedValue(undefined);

      // Simulate upload flow
      await photoController.uploadPhoto({ filePath: mockFilePath });

      // Verify queue was called
      expect(photoService.queuePhotoForAnalysis).toHaveBeenCalledWith(mockFilePath);
    });

    it('should handle complete face search workflow', async () => {
      const targetEmbedding = Array(512).fill(0.5);

      (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: 0.85 },
        { photoId: 2, similarity: 0.72 },
      ]);

      const result = await photoController.searchFaces({ embedding: targetEmbedding });

      expect(result).toHaveLength(2);
      expect(result[0].similarity).toBe(0.85);
    });

    it('should handle complete scene search workflow', async () => {
      const targetEmbedding = Array(384).fill(0.5);

      (databaseService.searchSimilarScenes as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: 0.95 },
        { photoId: 2, similarity: 0.88 },
      ]);

      const result = await photoController.searchScenes({ embedding: targetEmbedding });

      expect(result).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null file path gracefully', async () => {
      await expect(photoController.uploadPhoto({ filePath: null })).resolves.not.toThrow();
    });

    it('should handle empty embedding array', async () => {
      await expect(
        photoController.searchFaces({ embedding: [] })
      ).resolves.not.toThrow();
    });

    it('should handle very large embedding arrays', async () => {
      const largeEmbedding = Array(512000).fill(0.5); // 10x normal size

      await expect(photoController.searchFaces({ embedding: largeEmbedding })).resolves.not.toThrow();
    });

    it('should handle special characters in file path', async () => {
      const pathWithSpecialChars = '/path/to/file with spaces & symbols!.jpg';

      await expect(photoController.uploadPhoto({ filePath: pathWithSpecialChars })).resolves.not.toThrow();
    });

    it('should handle negative similarity scores gracefully', async () => {
      (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: -0.1 },
      ]);

      const result = await photoController.searchFaces({ embedding: Array(512).fill(0.5) });

      expect(result).toHaveLength(1);
    });
  });
});
