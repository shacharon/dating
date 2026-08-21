import { ErrorCodes } from './error-codes';
import {
  registerProcessErrorHandlers,
  resetProcessErrorHandlersForTests,
} from './process-error-handlers';

describe('registerProcessErrorHandlers', () => {
  let obs: { fatal: jest.Mock };
  let sentry: { captureException: jest.Mock };
  let onSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  const listeners = new Map<string | symbol, Array<(...args: unknown[]) => void>>();

  beforeEach(() => {
    resetProcessErrorHandlersForTests();
    listeners.clear();
    obs = { fatal: jest.fn() };
    sentry = { captureException: jest.fn() };
    onSpy = jest.spyOn(process, 'on').mockImplementation(((
      event: string | symbol,
      listener: (...args: unknown[]) => void,
    ) => {
      const list = listeners.get(event) ?? [];
      list.push(listener);
      listeners.set(event, list);
      return process;
    }) as typeof process.on);
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    onSpy.mockRestore();
    exitSpy.mockRestore();
    resetProcessErrorHandlersForTests();
  });

  it('registers uncaughtException and unhandledRejection once', () => {
    registerProcessErrorHandlers({ obs, sentry });
    registerProcessErrorHandlers({ obs, sentry });

    expect(onSpy).toHaveBeenCalledTimes(2);
    expect(listeners.get('uncaughtException')).toHaveLength(1);
    expect(listeners.get('unhandledRejection')).toHaveLength(1);
  });

  it('uncaughtException → fatal + Sentry + process.exit(1)', () => {
    registerProcessErrorHandlers({ obs, sentry });
    const err = new Error('boom');
    const handler = listeners.get('uncaughtException')![0]!;
    handler(err);

    expect(obs.fatal).toHaveBeenCalledWith(
      'Uncaught exception: boom',
      ErrorCodes.PROCESS_UNCAUGHT_EXCEPTION,
      err,
    );
    expect(sentry.captureException).toHaveBeenCalledWith(err, {
      errorCode: ErrorCodes.PROCESS_UNCAUGHT_EXCEPTION,
      tags: { subsystem: 'process' },
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('unhandledRejection → fatal + Sentry without exit', () => {
    registerProcessErrorHandlers({ obs, sentry });
    const reason = new Error('rejected');
    const handler = listeners.get('unhandledRejection')![0]!;
    handler(reason);

    expect(obs.fatal).toHaveBeenCalledWith(
      'Unhandled promise rejection: rejected',
      ErrorCodes.PROCESS_UNHANDLED_REJECTION,
      reason,
    );
    expect(sentry.captureException).toHaveBeenCalledWith(reason, {
      errorCode: ErrorCodes.PROCESS_UNHANDLED_REJECTION,
      tags: { subsystem: 'process' },
    });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('unhandledRejection with non-Error reason still captures', () => {
    registerProcessErrorHandlers({ obs, sentry });
    const handler = listeners.get('unhandledRejection')![0]!;
    handler('string-reason');

    expect(obs.fatal).toHaveBeenCalledWith(
      'Unhandled promise rejection',
      ErrorCodes.PROCESS_UNHANDLED_REJECTION,
      'string-reason',
    );
    expect(sentry.captureException).toHaveBeenCalledWith('string-reason', {
      errorCode: ErrorCodes.PROCESS_UNHANDLED_REJECTION,
      tags: { subsystem: 'process' },
    });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('still exits on uncaughtException if obs.fatal throws', () => {
    obs.fatal.mockImplementation(() => {
      throw new Error('obs down');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    registerProcessErrorHandlers({ obs, sentry });
    const err = new Error('boom');
    listeners.get('uncaughtException')![0]!(err);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
