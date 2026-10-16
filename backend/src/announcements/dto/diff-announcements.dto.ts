import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

class AnnouncementDiffEntryDto {
  @IsString()
  id: string;

  @IsString()
  updatedAt: string;
}

export class DiffAnnouncementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnouncementDiffEntryDto)
  entries: AnnouncementDiffEntryDto[];
}
