import { IsNotEmpty, IsString, IsEnum, ValidateIf, IsEmail } from 'class-validator';
import { UserRole } from '../models/UserModel';

export class LoginDto {
  @ValidateIf(o => o.role === UserRole.ADMIN)
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ValidateIf(o => o.role === UserRole.CASHIER)
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
