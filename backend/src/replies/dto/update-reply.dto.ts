import { IsString, IsOptional } from 'class-validator';

export class UpdateReplyDto {
  @IsString()
  @IsOptional()
  body?: string;
}
