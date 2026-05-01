import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ErrorCodes } from '../logging/error-codes';
import { SimpleLogger } from './simple-logger.service';

function loadConfig(
  extra: Record<string, string> = {},
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ NODE_ENV: 'test', ...extra })],
      }),
    ],
    providers: [SimpleLogger],
  }).compile();
}

describe('SimpleLogger', () => {
  it('emitStructured writes JSON to stdout', async () => {
    const mod = await loadConfig({ STRUCTURED_LOG_FILE: 'off' });
    const logger = mod.get(SimpleLogger);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logger.emitStructured({
        timestamp: '2026-01-01T00:00:00.000Z',
        level: 'trace',
        service: 'dating-api',
        env: 'test',
        requestId: 'r1',
        route: '/x',
        method: 'GET',
        userId: null,
        sessionId: null,
        message: 'hello',
        errorCode: ErrorCodes.AUTH_LOGIN_START,
      });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('"errorCode":"AUTH_LOGIN_START"'),
      );
    } finally {
      spy.mockRestore();
      await mod.close();
    }
  });

  it('emitStructured writes JSON line to current STRUCTURED_LOG_FILE path', async () => {
    const dir = join(tmpdir(), `dating-api-log-test-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const basePath = join(dir, 'structured.log');
    const mod = await loadConfig({ STRUCTURED_LOG_FILE: basePath });
    const logger = mod.get(SimpleLogger);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logger.emitStructured({
        timestamp: '2026-01-02T00:00:00.000Z',
        level: 'error',
        service: 'dating-api',
        env: 'test',
        requestId: 'r2',
        route: '/y',
        method: 'POST',
        userId: 'u1',
        sessionId: 's1',
        message: 'oops',
        errorCode: ErrorCodes.ME_PROFILE_VALIDATION_FAILED,
      });
      expect(spy).toHaveBeenCalled();
      const text = readFileSync(basePath, 'utf8').trim();
      const parsed = JSON.parse(text) as { errorCode: string; level: string };
      expect(parsed.errorCode).toBe('ME_PROFILE_VALIDATION_FAILED');
      expect(parsed.level).toBe('error');
    } finally {
      spy.mockRestore();
      try {
        unlinkSync(basePath);
      } catch {
        /* ignore */
      }
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      await mod.close();
    }
  });

  it('emitStructured does not write a file when STRUCTURED_LOG_FILE is off', async () => {
    const dir = join(tmpdir(), `dating-api-no-file-${process.pid}`);
    const logPath = join(dir, 'should-not-exist.log');
    const mod = await loadConfig({
      STRUCTURED_LOG_FILE: 'off',
    });
    const logger = mod.get(SimpleLogger);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      logger.emitStructured({
        timestamp: '2026-01-03T00:00:00.000Z',
        level: 'trace',
        service: 'dating-api',
        env: 'test',
        requestId: null,
        route: null,
        method: null,
        userId: null,
        sessionId: null,
        message: 'x',
      });
      expect(existsSync(logPath)).toBe(false);
    } finally {
      spy.mockRestore();
      await mod.close();
    }
  });

  it('defaults structured file to logs/logs.log in development', async () => {
    const prevCwd = process.cwd();
    const root = join(tmpdir(), `dating-api-cwd-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    process.chdir(root);
    const mod = await loadConfig({ NODE_ENV: 'development' });
    const logger = mod.get(SimpleLogger);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const localPath = join(root, 'logs', 'logs.log');
    try {
      logger.emitStructured({
        timestamp: '2026-01-04T00:00:00.000Z',
        level: 'trace',
        service: 'dating-api',
        env: 'development',
        requestId: null,
        route: '/z',
        method: 'GET',
        userId: null,
        sessionId: null,
        message: 'dev default path',
      });
      expect(spy).toHaveBeenCalled();
      expect(existsSync(localPath)).toBe(true);
      const tail = readFileSync(localPath, 'utf8').trim().split('\n').pop();
      expect(JSON.parse(tail!).message).toBe('dev default path');
    } finally {
      spy.mockRestore();
      process.chdir(prevCwd);
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      await mod.close();
    }
  });
});
