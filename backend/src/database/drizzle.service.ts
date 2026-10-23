import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as relations from './relations';

const fullSchema = { ...schema, ...relations };

export type Database = NodePgDatabase<typeof fullSchema>;

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: Database;

  constructor() {
    this.pool = new Pool({
      connectionString: this.buildUrl(),
    });
    this.db = drizzle(this.pool, { schema: fullSchema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private buildUrl(): string {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const name = process.env.DB_NAME || 'pro_learning_hub';
    return `postgres://${user}:${password}@${host}:${port}/${name}`;
  }
}
