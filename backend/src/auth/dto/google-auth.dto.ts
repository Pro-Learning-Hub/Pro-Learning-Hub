import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  courseId?: string;
}
