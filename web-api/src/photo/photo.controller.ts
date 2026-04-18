import { Controller, Post, Get, Body } from '@nestjs/common';
import { PhotoService } from './photo.service';

@Controller('photo')
export class PhotoController {
  constructor(private photoService: PhotoService) {}

  @Post('upload')
  async uploadPhoto(@Body() body: { filePath: string }) {
    const { filePath } = body;
    await this.photoService.queuePhotoForAnalysis(filePath);
    return { message: 'Photo queued for analysis', filePath };
  }

  @Post('search/faces')
  async searchFaces(@Body() body: { embedding: number[] }) {
    const { embedding } = body;
    return await this.photoService.searchSimilarFaces(embedding);
  }

  @Post('search/scenes')
  async searchScenes(@Body() body: { embedding: number[] }) {
    const { embedding } = body;
    return await this.photoService.searchSimilarScenes(embedding);
  }

  @Get('list')
  async listPhotos() {
    return await this.photoService.getPhotos();
  }
}
