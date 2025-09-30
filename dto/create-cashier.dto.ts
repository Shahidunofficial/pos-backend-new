import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCashierDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
