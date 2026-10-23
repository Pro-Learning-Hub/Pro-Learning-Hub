import { IsString, IsEmail, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UserDataDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  pictureId?: string;

  @IsString()
  @IsOptional()
  pictureURL?: string;

  @IsString()
  @IsOptional()
  pictureThumbnail?: string;
}

export class RegisterDto {
  @ValidateNested()
  @Type(() => UserDataDto)
  userData: UserDataDto;

  @IsString()
  @IsOptional()
  courseId?: string;
}
