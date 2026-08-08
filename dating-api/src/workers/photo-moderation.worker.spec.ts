import { PhotoModerationQueueService } from './photo-moderation.worker';
import { photoModerationJobId } from './photo-moderation.queue';
import type { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { ErrorCodes } from '../logging/error-codes';

describe('PhotoModerationQueueService', () => {
  const moderation = {
    processPendingPhoto: jest.fn().mockResolvedValue(undefined),
  } as unknown as PhotoModerationService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: PhotoModerationQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhotoModerationQueueService(moderation, obs);
  });

  it('coalesces when Bull rejects duplicate jobId', async () => {
    const jobId = photoModerationJobId('photo_1');
    const add = jest
      .fn()
      .mockRejectedValue(new Error(`Job ${jobId} already exists`));
    (
      service as unknown as {
        queue: { add: jest.Mock };
        bullEnabled: boolean;
      }
    ).queue = { add };
    (
      service as unknown as { bullEnabled: boolean }
    ).bullEnabled = true;

    const result = await service.enqueueOrRunInline('photo_1');

    expect(result).toBe(jobId);
    expect(add).toHaveBeenCalledWith(
      { photoId: 'photo_1' },
      expect.objectContaining({ jobId }),
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('coalesced'),
      ErrorCodes.QUEUE_PHOTO_MODERATION_COALESCED,
    );
  });

  it('enqueues with stable jobId', async () => {
    const jobId = photoModerationJobId('photo_2');
    const add = jest.fn().mockResolvedValue({ id: jobId });
    (
      service as unknown as {
        queue: { add: jest.Mock };
        bullEnabled: boolean;
      }
    ).queue = { add };
    (
      service as unknown as { bullEnabled: boolean }
    ).bullEnabled = true;

    const result = await service.enqueueOrRunInline('photo_2');

    expect(result).toBe(jobId);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('enqueued'),
      ErrorCodes.QUEUE_PHOTO_MODERATION_ENQUEUED,
    );
  });

  it('inline when Bull disabled', async () => {
    const result = await service.enqueueOrRunInline('photo_3');
    expect(result).toBe('inline:photo_3');
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('inline'),
      ErrorCodes.QUEUE_PHOTO_MODERATION_INLINE,
    );
  });
});
