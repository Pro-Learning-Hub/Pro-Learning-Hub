import { IsString, IsIn } from 'class-validator';

export class VoteDto {
  @IsString()
  @IsIn(['upvote', 'downvote'])
  action: 'upvote' | 'downvote';
}
