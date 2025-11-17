import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand ,HeadBucketCommand} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

// AWS_ACCESS_KEY_ID=AKIA6C6KUGLMNGG6FOOL
// AWS_SECRET_ACCESS_KEY=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
// AWS_REGION=eu-north-1
// AWS_S3_BUCKET_NAME=cellcare-products
// AWS_S3_BUCKET_URL=https://cellcare-products.s3.eu-north-1.amazonaws.com

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private bucketUrl: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'eu-north-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'cellcare-products';
    this.bucketUrl = process.env.AWS_S3_BUCKET_URL || 'https://cellcare-products.s3.eu-north-1.amazonaws.com';

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured');
      console.log('AWS credentials are not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA6C6KUGLMNGG6FOOL',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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',
      },
    });
  }
  async onModuleInit() {
    await this.verifyBucket();
  }
  private async verifyBucket(): Promise<void> {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      console.log(
        `✅ S3 bucket "${this.bucketName}" is reachable in region "${this.region}"`,
      );
    } catch (error) {
      console.error(
        `❌ S3 bucket "${this.bucketName}" is NOT reachable. Check name/region/permissions.`,
        error,
      );
      throw new Error('S3 bucket is not available');
    }
  }
  /**
   * Generate a unique file name for the image
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const extension = originalName.split('.').pop();
    return `products/${timestamp}-${randomString}.${extension}`;
  }

  /**
   * Upload a single image to S3
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new HttpException(
        'File size exceeds 5MB limit',
        HttpStatus.BAD_REQUEST
      );
    }

    const fileName = this.generateFileName(file.originalname);
    const key = fileName;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Note: ACL is removed because the bucket doesn't allow ACLs
        // Make sure your bucket policy allows public read access
      });

      await this.s3Client.send(command);

      // Return the public URL
      // Make sure your bucket is configured for public access via bucket policy
      return `${this.bucketUrl}/${key}`;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new HttpException(
        `Failed to upload image to S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Upload multiple images to S3
   */
  async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }

    if (files.length > 3) {
      throw new HttpException(
        'Maximum 3 images allowed',
        HttpStatus.BAD_REQUEST
      );
    }

    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete an image from S3
   */
  async deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl) {
      throw new HttpException('Image URL is required', HttpStatus.BAD_REQUEST);
    }

    // Extract the key from the URL
    // URL format: https://bucket.s3.amazonaws.com/products/timestamp-randomstring.ext
    const urlParts = imageUrl.split('/');
    const key = urlParts.slice(3).join('/'); // Remove protocol, domain, and bucket name

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 Delete Error:', error);
      throw new HttpException(
        'Failed to delete image from S3',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a presigned URL for private images (optional, for future use)
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('S3 Presigned URL Error:', error);
      throw new HttpException(
        'Failed to generate presigned URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
