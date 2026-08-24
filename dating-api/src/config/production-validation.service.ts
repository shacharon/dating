import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { assertProductionPhotoConfig } from '../photo-storage/photo-storage.config';
import { isProductionEnv } from './is-production-env';

/**
 * Fail-fast production configuration checks during Nest module init
 * (before listen). Redis connect fail-fast remains in RedisIoAdapter.
 */
@Injectable()
export class ProductionValidationService implements OnModuleInit {
  private readonly logger = new Logger(ProductionValidationService.name);

  onModuleInit(): void {
    if (!isProductionEnv()) {
      return;
    }

    this.logger.log('Running production configuration validation...');
    assertProductionPhotoConfig(process.env);

    if (!process.env.REDIS_URL?.trim()) {
      throw new Error(
        'REDIS_URL is required in production for multi-instance WebSocket support. ' +
          'Without Redis, messages will not be delivered across pods.',
      );
    }

    this.logger.log('Production configuration validation passed');
  }
}
