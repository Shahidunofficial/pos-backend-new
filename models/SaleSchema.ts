import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
}

@Schema()
export class Sale {
  @Prop({
    type: [{
      productId: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }],
    required: true
  })
  items: SaleItem[];

  @Prop({ required: true })
  total: number;
  //each sale will have a profit
  @Prop({ required: true })
  profit: number;

  @Prop()
  customerName?: string;

  @Prop()
  warrantyTerms?: string;

  @Prop()
  termsAndConditions?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop({ type: String, ref: 'User', required: true })
  userId: string;
}

export type SaleDocument = Sale & Document;

export const SaleSchema = SchemaFactory.createForClass(Sale);

// Update timestamp on save
SaleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});