import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../services/S3Service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRole } from '../models/UserModel';

@Controller('images')
export class ImageController {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * Upload a single image
   * POST /images/upload
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ): Promise<{ url: string }> {
    // Only admin and cashier can upload images
    if (req.user.role === UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const imageUrl = await this.s3Service.uploadImage(file);
      return { url: imageUrl };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to upload image',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Upload multiple images (max 3)
   * POST /images/upload-multiple
   */
  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 3))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ): Promise<{ urls: string[] }> {
    // Only admin and cashier can upload images
    if (req.user.role === UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const urls = await this.s3Service.uploadMultipleImages(files);
      return { urls };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to upload images',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete an image from S3
   * DELETE /images/:key
   */
  @Delete(':key')
  @UseGuards(JwtAuthGuard)
  async deleteImage(
    @Param('key') key: string,
    @Request() req
  ): Promise<{ message: string }> {
    // Only admin and cashier can delete images
    if (req.user.role === UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    try {
      // Decode the key (it might be URL encoded)
      const decodedKey = decodeURIComponent(key);
      await this.s3Service.deleteImage(decodedKey);
      return { message: 'Image deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete image',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
