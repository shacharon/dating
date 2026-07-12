import { Module } from '@nestjs/common';
import { EvaluateController } from './evaluate.controller';
import { EvaluateServiceModule } from './evaluate-service.module';

@Module({
  imports: [EvaluateServiceModule],
  controllers: [EvaluateController],
  exports: [EvaluateServiceModule],
})
export class EvaluateModule {}
