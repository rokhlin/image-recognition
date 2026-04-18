import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PhotoProcessor {
  private mlEngineUrl = process.env.ML_ENGINE_URL || 'http://ml-engine:8000';

  async extractFaceData(filePath: string) {
    try {
      const mlResponse = await axios.post(
        `${this.mlEngineUrl}/analyze-face`,
        { image_path: filePath }
      );

      return { faces: mlResponse.data, status: 'success' };
    } catch (error) {
      console.error('Failed to extract face data:', error.message);
      throw error;
    }
  }

  async extractSceneData(filePath: string) {
    try {
      const mlResponse = await axios.post(
        `${this.mlEngineUrl}/analyze-scene`,
        { image_path: filePath }
      );

      return { scene: mlResponse.data, status: 'success' };
    } catch (error) {
      console.error('Failed to extract scene data:', error.message);
      throw error;
    }
  }
}
