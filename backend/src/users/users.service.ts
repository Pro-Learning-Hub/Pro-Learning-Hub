import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { users } from '../database/schema';

export type PublicUser = {
  id: string;
  name: string;
  pictureThumbnail: string | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async getUserPublicData(userId: string): Promise<PublicUser | null> {
    const byId = await this.getPublicUsersByIds([userId]);
    return byId.get(userId) ?? null;
  }

  async getPublicUsersByIds(userIds: string[]): Promise<Map<string, PublicUser>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const rows = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        pictureThumbnail: users.pictureThumbnail,
      })
      .from(users)
      .where(inArray(users.id, uniqueIds));
    return new Map(
      rows.map((user) => [
        user.id,
        {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          pictureThumbnail: user.pictureThumbnail,
        },
      ]),
    );
  }
}
