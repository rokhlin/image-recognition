import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullMQModule } from '@nestjs/bullmq';
import { DatabaseService } from './photo/database.service';
import { PhotoProcessor } from './photo/photo.processor';
import { PhotoService } from './photo/photo.service';
import { PhotoController } from './photo/photo.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullMQModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'redis'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
    }),
  ],
  providers: [DatabaseService, PhotoProcessor, PhotoService],
  controllers: [PhotoController],
})
export class AppModule {}
