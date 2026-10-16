import { IsString } from 'class-validator';

export class LectureResourceInputDto {
  @IsString()
  title: string;

  @IsString()
  url: string;
}
