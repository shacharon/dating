import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvaluateModule } from './evaluate/evaluate.module';
import { ExtractionModule } from './extraction/extraction.module';
import { SimpleLoggerModule } from './logger/simple-logger.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    SimpleLoggerModule,
    LlmModule,
    EvaluateModule,
    ExtractionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
