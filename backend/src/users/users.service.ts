import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      pictureThumbnail: user.pictureThumbnail,
    };
  }
}
