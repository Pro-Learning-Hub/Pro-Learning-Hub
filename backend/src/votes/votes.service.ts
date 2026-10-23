import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { votes } from '../database/schema';

export type VoteTarget = { questionId: string } | { replyId: string };
export type VoteAction = 'upvote' | 'downvote';

type VoteExecutor = {
  select: typeof DrizzleService.prototype.db.select;
  insert: typeof DrizzleService.prototype.db.insert;
  delete: typeof DrizzleService.prototype.db.delete;
};

@Injectable()
export class VotesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  private targetFilter(userId: string, target: VoteTarget) {
    if ('questionId' in target) {
      return and(eq(votes.userId, userId), eq(votes.questionId, target.questionId));
    }
    return and(eq(votes.userId, userId), eq(votes.replyId, target.replyId));
  }

  async hasVoted(userId: string, target: VoteTarget, executor: VoteExecutor = this.db): Promise<boolean> {
    const rows = await executor
      .select({ userId: votes.userId })
      .from(votes)
      .where(this.targetFilter(userId, target))
      .limit(1);
    return rows.length > 0;
  }

  async votedIds(
    userId: string,
    resourceType: 'question' | 'reply',
    ids: string[],
  ): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    if (resourceType === 'question') {
      const rows = await this.db
        .select({ questionId: votes.questionId })
        .from(votes)
        .where(and(eq(votes.userId, userId), inArray(votes.questionId, ids)));
      return new Set(rows.map((row) => row.questionId).filter((id): id is string => Boolean(id)));
    }
    const rows = await this.db
      .select({ replyId: votes.replyId })
      .from(votes)
      .where(and(eq(votes.userId, userId), inArray(votes.replyId, ids)));
    return new Set(rows.map((row) => row.replyId).filter((id): id is string => Boolean(id)));
  }

  async apply(
    executor: VoteExecutor,
    userId: string,
    action: VoteAction,
    target: VoteTarget,
  ): Promise<boolean> {
    const alreadyVoted = await this.hasVoted(userId, target, executor);
    if (action === 'upvote') {
      if (alreadyVoted) {
        return false;
      }
      await executor.insert(votes).values({ userId, ...target });
      return true;
    }
    if (!alreadyVoted) {
      return false;
    }
    await executor.delete(votes).where(this.targetFilter(userId, target));
    return true;
  }
}
