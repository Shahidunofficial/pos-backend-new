import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  CASHIER = 'cashier'
}

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({
    required: function(this: User) { return this.role === UserRole.ADMIN; },
    unique: true,
    trim: true,
    lowercase: true,
    sparse: true
  })
  email?: string;

  @Prop({
    required: function(this: User) { return this.role === UserRole.CASHIER; },
    unique: true,
    trim: true,
    sparse: true
  })
  username?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({ required: true })
  name: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Update timestamp on save
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});