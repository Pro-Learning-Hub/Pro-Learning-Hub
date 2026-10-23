import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LectureResourceInputDto } from './lecture-resource.dto';

export class UpdateLectureDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  tags?: string[] | string;

  @IsString()
  @IsOptional()
  youtubeLink?: string;

  @IsString()
  @IsOptional()
  videoLink?: string;

  @IsString()
  @IsOptional()
  notesLink?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  slidesLink?: string;

  @IsString()
  @IsOptional()
  slides?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LectureResourceInputDto)
  demos?: LectureResourceInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LectureResourceInputDto)
  extras?: LectureResourceInputDto[];
}
