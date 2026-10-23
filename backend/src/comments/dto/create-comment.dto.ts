import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
