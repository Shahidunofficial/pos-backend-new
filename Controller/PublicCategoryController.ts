import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Category, CategoryDocument } from '../models/CategorySchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Controller('categories')
export class PublicCategoryController {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}

  @Get('public')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async getPublicCategories(): Promise<any[]> {
    try {
      // Fetch all main categories (level 1) with their subcategories
      const categories = await this.categoryModel
        .find({ level: 1 })
        .populate({
          path: 'subCategories',
          populate: {
            path: 'subCategories'
          }
        })
        .lean();
      
      // Transform _id to id for frontend compatibility
      const transformCategory = (cat: any): any => {
        if (!cat) return null;
        return {
          ...cat,
          id: cat._id.toString(),
          subCategories: cat.subCategories ? cat.subCategories.map(transformCategory) : []
        };
      };
      
      return categories.map(transformCategory);
    } catch (error) {
      throw new HttpException('Failed to fetch categories', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

