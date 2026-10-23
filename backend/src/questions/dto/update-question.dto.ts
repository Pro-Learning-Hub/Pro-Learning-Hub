import { IsString, IsOptional } from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
