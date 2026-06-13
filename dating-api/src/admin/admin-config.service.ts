import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminConfigService {
  private readonly adminIds: Set<string>;

  constructor() {
    const raw = process.env.ADMIN_USER_IDS ?? '';
    this.adminIds = new Set(
      raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }

  isAdmin(userId: string): boolean {
    return this.adminIds.has(userId);
  }
}
