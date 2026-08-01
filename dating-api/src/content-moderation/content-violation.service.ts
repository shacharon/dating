import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ContentViolationAction,
  ContentViolationSurface,
} from './content-moderation.types';

@Injectable()
export class ContentViolationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async recordViolation(args: {
    userId: string;
    surface: ContentViolationSurface;
    flaggedText: string;
    category: string;
    score: number;
    action: ContentViolationAction;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userContentViolation.create({
        data: {
          userId: args.userId,
          surface: args.surface,
          flaggedText: args.flaggedText,
          category: args.category,
          score: args.score,
          action: args.action,
        },
      }),
      this.prisma.user.update({
        where: { id: args.userId },
        data: { contentViolationCount: { increment: 1 } },
      }),
    ]);

    this.obs.trace(
      `content violation recorded userId=${args.userId} surface=${args.surface} category=${args.category} action=${args.action} textLength=${args.flaggedText.length}`,
      ErrorCodes.CONTENT_VIOLATION_RECORDED,
    );
  }

  async getViolationCount(
    userId: string,
    options?: { surface?: string; since?: Date },
  ): Promise<number> {
    return this.prisma.userContentViolation.count({
      where: {
        userId,
        ...(options?.surface != null ? { surface: options.surface } : {}),
        ...(options?.since != null
          ? { createdAt: { gte: options.since } }
          : {}),
      },
    });
  }

  async getUserViolationStatus(userId: string): Promise<{
    status: string;
    mutedUntil: Date | null;
    violationCount: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentViolationStatus: true,
        contentViolationMutedUntil: true,
        contentViolationCount: true,
      },
    });

    return {
      status: user?.contentViolationStatus ?? 'ok',
      mutedUntil: user?.contentViolationMutedUntil ?? null,
      violationCount: user?.contentViolationCount ?? 0,
    };
  }
}
