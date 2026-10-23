import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  body?: string;
}
