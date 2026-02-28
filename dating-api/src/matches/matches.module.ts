import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';

@Module({
  controllers: [MatchesController],
})
export class MatchesModule {}
