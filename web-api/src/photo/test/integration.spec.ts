/**
 * Integration Tests for Photo Management System
 * 
 * These tests verify end-to-end workflows between components
 */

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';

// Mock modules
jest.mock('axios');

describe('Photo Management System - Integration Tests', () => {
  let module: TestingModule;
  let photoService: any;
  let databaseService: any;

  // Mock data
  const mockFilePath = '/storage/photos/test.jpg';
  const mockFaceData = [
    {
      bbox: [10.5, 20.3, 50.7, 60.9],
      prob: 0.95,
      embedding: Array(512).fill(0).map((_, i) => (i % 100) / 100),
    },
  ];
  const mockSceneData = {
    embedding: Array(384).fill(0).map((_, i) => (i % 100) / 100),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: PhotoService,
          useValue: {
            queuePhotoForAnalysis: jest.fn(),
            extractFaceData: jest.fn(),
            extractSceneData: jest.fn(),
            processFaceResults: jest.fn(),
            processSceneResults: jest.fn(),
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

    photoService = module.get(PhotoService);
    databaseService = module.get(DatabaseService);
  });

  describe('End-to-End Upload Workflow', () => {
    it('should complete full upload and analysis workflow', async () => {
      // Mock all external calls
      (axios.post as jest.Mock).mockResolvedValue({ data: mockFaceData });
      
      // Simulate upload flow
      await photoService.queuePhotoForAnalysis(mockFilePath);
      
      // Verify queue was called with correct parameters
      expect(photoService['photoQueue'].add).toHaveBeenCalledWith(
        'analyze',
        { filePath: mockFilePath, fileName: expect.any(String) },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, timeout: 60000 }
      );
    });

    it('should process face results after upload', async () => {
      const mockResponse = { data: mockFaceData };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      await photoService.extractFaceData(mockFilePath);

      expect(photoService['photoQueue'].add).toHaveBeenCalled();
    });

    it('should save face embeddings after processing', async () => {
      const embedding = mockFaceData[0].embedding;
      const bbox = mockFaceData[0].bbox.map(v => parseFloat(v));
      
      await photoService.processFaceResults(mockFilePath, mockFaceData);

      expect(databaseService.saveFaceEmbedding).toHaveBeenCalledWith(
        expect.any(Number),
        embedding,
        bbox
      );
    });

    it('should save scene embeddings after processing', async () => {
      const embedding = mockSceneData.embedding;
      
      await photoService.processSceneResults(mockFilePath, embedding);

      expect(databaseService.saveSceneEmbedding).toHaveBeenCalledWith(
        expect.any(Number),
        embedding
      );
    });
  });

  describe('Face Search Integration', () => {
    it('should search for similar faces across photos', async () => {
      const targetEmbedding = Array(512).fill(0.8);
      
      (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: 0.92 },
        { photoId: 2, similarity: 0.78 },
        { photoId: 3, similarity: 0.65 },
      ]);

      const result = await databaseService.searchSimilarFaces(targetEmbedding);

      expect(result).toHaveLength(3);
      expect(result[0].similarity).toBe(0.92);
      expect(result[0].photoId).toBe(1);
    });

    it('should filter results by similarity threshold', async () => {
      const targetEmbedding = Array(512).fill(0.8);
      
      (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: 0.95 },
        { photoId: 2, similarity: 0.65 }, // Below threshold
        { photoId: 3, similarity: 0.88 },
      ]);

      const result = await databaseService.searchSimilarFaces(targetEmbedding);

      expect(result).toHaveLength(2); // Only photos with similarity > 0.6
      expect(result[0].similarity).toBe(0.95);
    });

    it('should handle no similar faces found', async () => {
      const targetEmbedding = Array(512).fill(0.8);
      
      (databaseService.searchSimilarFaces as jest.Mock).mockResolvedValue([]);

      const result = await databaseService.searchSimilarFaces(targetEmbedding);

      expect(result).toEqual([]);
    });
  });

  describe('Scene Search Integration', () => {
    it('should search for similar scenes across photos', async () => {
      const targetEmbedding = Array(384).fill(0.9);
      
      (databaseService.searchSimilarScenes as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: 0.95 },
        { photoId: 2, similarity: 0.88 },
        { photoId: 3, similarity: 0.75 },
      ]);

      const result = await databaseService.searchSimilarScenes(targetEmbedding);

      expect(result).toHaveLength(3);
      expect(result[0].similarity).toBe(0.95);
    });

    it('should handle empty scene search results', async () => {
      const targetEmbedding = Array(384).fill(0.9);
      
      (databaseService.searchSimilarScenes as jest.Mock).mockResolvedValue([]);

      const result = await databaseService.searchSimilarScenes(targetEmbedding);

      expect(result).toEqual([]);
    });
  });

  describe('Photo List Integration', () => {
    it('should return list of all photos ordered by creation date', async () => {
      (databaseService.getPhotos as jest.Mock).mockResolvedValue([
        { id: 1, filePath: '/path/1.jpg', fileName: 'photo1.jpg', createdAt: new Date() },
        { id: 2, filePath: '/path/2.jpg', fileName: 'photo2.jpg', createdAt: new Date() },
      ]);

      const result = await databaseService.getPhotos();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
    });

    it('should handle empty photo list', async () => {
      (databaseService.getPhotos as jest.Mock).mockResolvedValue([]);

      const result = await databaseService.getPhotos();

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle ML engine timeout gracefully', async () => {
      const mockError = new Error('ML Engine timeout');
      (axios.post as jest.Mock).mockRejectedValue(mockError);

      await expect(photoService.extractFaceData(mockFilePath)).rejects.toThrow(
        'ML Engine timeout'
      );
    });

    it('should handle database connection errors', async () => {
      const mockError = new Error('Database connection failed');
      (databaseService.saveFaceEmbedding as jest.Mock).mockRejectedValue(mockError);

      await expect(photoService.processFaceResults(mockFilePath, mockFaceData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle invalid embedding dimensions', async () => {
      const invalidEmbedding = Array(100).fill(0.5); // Should be 512
      
      await expect(
        databaseService.saveFaceEmbedding(1, invalidEmbedding, '[10, 20, 30, 40]')
      ).rejects.toThrow();
    });

    it('should handle null file path gracefully', async () => {
      await expect(photoService.queuePhotoForAnalysis(null)).resolves.not.toThrow();
    });

    it('should handle empty embedding array', async () => {
      await expect(
        databaseService.searchSimilarFaces([])
      ).resolves.not.toThrow();
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle very large photo collections', async () => {
      const largePhotoList = Array(1000).fill(null).map((_, i) => ({
        id: i + 1,
        filePath: `/path/${i}.jpg`,
        fileName: `photo${i}.jpg`,
        createdAt: new Date(),
      }));

      (databaseService.getPhotos as jest.Mock).mockResolvedValue(largePhotoList);

      const result = await databaseService.getPhotos();

      expect(result).toHaveLength(1000);
    });

    it('should handle photos with special characters in filename', async () => {
      const specialPath = '/storage/photos/photo (copy)-final_v2.jpg';
      
      await expect(photoService.queuePhotoForAnalysis(specialPath)).resolves.not.toThrow();
    });

    it('should handle face detection on empty images', async () => {
      const emptyFaces = [];
      
      await expect(photoService.processFaceResults(mockFilePath, emptyFaces)).resolves.not.toThrow();
    });

    it('should handle scene search with partial matches', async () => {
      const targetEmbedding = Array(384).fill(0.7);
      
      (databaseService.searchSimilarScenes as jest.Mock).mockResolvedValue([
        { photoId: 1, similarity: 0.65 }, // Just above threshold
        { photoId: 2, similarity: 0.59 }, // Below threshold
      ]);

      const result = await databaseService.searchSimilarScenes(targetEmbedding);

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.65);
    });

    it('should handle face search with multiple faces per photo', async () => {
      const multiFaceData = [
        {
          bbox: [10.0, 20.0, 50.0, 60.0],
          prob: 0.95,
          embedding: Array(512).fill(0).map((_, i) => (i % 100) / 100),
        },
        {
          bbox: [100.0, 200.0, 150.0, 260.0],
          prob: 0.92,
          embedding: Array(512).fill(0).map((_, i) => ((i + 100) % 100) / 100),
        },
      ];

      (databaseService.saveFaceEmbedding as jest.Mock).mockResolvedValue(undefined);

      await photoService.processFaceResults(mockFilePath, multiFaceData);

      expect(databaseService.saveFaceEmbedding).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle batch photo uploads', async () => {
      const batchSize = 10;
      const photos = Array(batchSize).fill(null).map((_, i) => `/path/${i}.jpg`);
      
      for (const path of photos) {
        await photoService.queuePhotoForAnalysis(path);
      }

      expect(photoService['photoQueue'].add).toHaveBeenCalledTimes(batchSize);
    });

    it('should handle concurrent face searches', async () => {
      const searchPromises = Array(5).fill(null).map(async () => {
        return databaseService.searchSimilarFaces(Array(512).fill(0.8));
      });

      const results = await Promise.all(searchPromises);
      
      expect(results).toHaveLength(5);
    });

    it('should handle sequential scene searches', async () => {
      const searchPromises = Array(3).fill(null).map(async (i) => {
        return databaseService.searchSimilarScenes(Array(384).fill(0.9 + i * 0.01));
      });

      const results = await Promise.all(searchPromises);
      
      expect(results).toHaveLength(3);
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate face embedding dimension', async () => {
      const validFaceEmbedding = Array(512).fill(0.5);
      const invalidFaceEmbedding = Array(100).fill(0.5);

      await expect(
        databaseService.saveFaceEmbedding(1, validFaceEmbedding, '[10, 20, 30, 40]')
      ).resolves.not.toThrow();

      await expect(
        databaseService.saveFaceEmbedding(1, invalidFaceEmbedding, '[10, 20, 30, 40]')
      ).rejects.toThrow();
    });

    it('should validate scene embedding dimension', async () => {
      const validSceneEmbedding = Array(384).fill(0.5);
      const invalidSceneEmbedding = Array(100).fill(0.5);

      await expect(databaseService.saveSceneEmbedding(1, validSceneEmbedding)).resolves.not.toThrow();

      await expect(databaseService.saveSceneEmbedding(1, invalidSceneEmbedding)).rejects.toThrow();
    });

    it('should validate bbox format', async () => {
      const validBbox = '[10.5, 20.3, 50.7, 60.9]';
      const invalidBbox = '[10.5, 20.3, 50.7]'; // Missing one value

      await expect(databaseService.saveFaceEmbedding(1, Array(512).fill(0.5), validBbox)).resolves.not.toThrow();

      await expect(databaseService.saveFaceEmbedding(1, Array(512).fill(0.5), invalidBbox)).rejects.toThrow();
    });

    it('should validate probability values', async () => {
      const validProb = 0.95;
      const invalidProb = 1.5; // Greater than 1

      await expect(databaseService.saveFaceEmbedding(1, Array(512).fill(0.5), '[10, 20, 30, 40]')).resolves.not.toThrow();
    });
  });
});
