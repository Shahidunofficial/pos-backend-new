import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class StoreSignupDto {
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  adminPassword: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;
}
