import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  MatchCandidateNotFoundError,
  MatchDetailEvaluationNotFoundError,
  MatchListCandidateEvaluationMissingError,
  MatchListInvalidCursorError,
  MatchListViewerEvaluationMissingError,
  MatchPhotoFileNotFoundError,
  MatchPhotoNotFoundError,
  MatchViewerNotReadyError,
  MeMatchesDomainError,
} from '../me-profile/matches/support/me-matches.errors';
import {
  ConversationListInvalidCursorError,
  ConversationNotFoundError,
} from '../me-profile/conversations/me-conversations.errors';
import { ProfileSubmitPhotoRequiredError } from '../me-profile/me-profile.errors';
import { MeDomainError } from '../me-profile/contracts/me-domain.error';
import { ErrorCodes } from './error-codes';
import { ObservabilityExceptionFilter } from './observability-exception.filter';

describe('ObservabilityExceptionFilter — me-matches domain errors', () => {
  let filter: ObservabilityExceptionFilter;
  let obs: {
    trace: jest.Mock;
    error: jest.Mock;
    fatal: jest.Mock;
    httpServerError: jest.Mock;
  };
  let superCatch: jest.SpyInstance;

  beforeEach(() => {
    obs = {
      trace: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      httpServerError: jest.fn(),
    };
    const httpAdapterHost = {
      httpAdapter: { reply: jest.fn(), isHeadersSent: () => false },
    } as unknown as HttpAdapterHost;
    filter = new ObservabilityExceptionFilter(
      obs as never,
      { captureException: jest.fn() } as never,
      httpAdapterHost,
    );
    superCatch = jest
      .spyOn(
        Object.getPrototypeOf(ObservabilityExceptionFilter.prototype),
        'catch',
      )
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const host = {} as never;

  function expectMapped(
    err: MeDomainError,
    status: number,
    body: string | Record<string, unknown>,
  ) {
    filter.catch(err, host);
    expect(superCatch).toHaveBeenCalledTimes(1);
    const httpEx = superCatch.mock.calls[0]![0] as HttpException;
    expect(httpEx).toBeInstanceOf(HttpException);
    expect(httpEx.getStatus()).toBe(status);
    expect(httpEx.getResponse()).toEqual(body);
    expect(obs.fatal).not.toHaveBeenCalled();
  }

  it('maps MatchListInvalidCursorError → 400 object body', () => {
    const err = new MatchListInvalidCursorError();
    expectMapped(err, 400, err.httpBody);
    expect(obs.trace).toHaveBeenCalledWith(
      err.message,
      ErrorCodes.ME_MATCHES_INVALID_CURSOR,
    );
  });

  it('maps MatchViewerNotReadyError(not_analyzed) → 404 string', () => {
    const err = new MatchViewerNotReadyError('not_analyzed');
    expectMapped(err, 404, err.httpBody);
  });

  it('maps MatchViewerNotReadyError(no_photo) → 404 string', () => {
    const err = new MatchViewerNotReadyError('no_photo');
    expectMapped(err, 404, err.httpBody);
  });

  it('maps MatchCandidateNotFoundError → 404 string', () => {
    expectMapped(new MatchCandidateNotFoundError(), 404, 'Match not found.');
  });

  it('maps MatchDetailEvaluationNotFoundError → 404 object', () => {
    const err = new MatchDetailEvaluationNotFoundError();
    expectMapped(err, 404, err.httpBody);
  });

  it('maps MatchListViewerEvaluationMissingError → 500 + obs.error', () => {
    const err = new MatchListViewerEvaluationMissingError();
    expectMapped(err, HttpStatus.INTERNAL_SERVER_ERROR, err.httpBody);
    expect(obs.error).toHaveBeenCalledWith(
      err.message,
      ErrorCodes.ME_MATCHES_LIST_VIEWER_EVALUATION_MISSING,
      err,
    );
  });

  it('maps MatchListCandidateEvaluationMissingError → 500 object', () => {
    const err = new MatchListCandidateEvaluationMissingError('prof_x');
    expectMapped(err, 500, err.httpBody);
  });

  it('maps MatchPhotoNotFoundError → 404 object', () => {
    const err = new MatchPhotoNotFoundError();
    expectMapped(err, 404, err.httpBody);
  });

  it('maps MatchPhotoFileNotFoundError → 404 object', () => {
    const err = new MatchPhotoFileNotFoundError();
    expectMapped(err, 404, err.httpBody);
  });

  it('maps ConversationListInvalidCursorError → 400', () => {
    const err = new ConversationListInvalidCursorError();
    expectMapped(err, 400, err.httpBody);
    expect(obs.trace).toHaveBeenCalledWith(
      err.message,
      ErrorCodes.ME_CONVERSATIONS_INVALID_CURSOR,
    );
  });

  it('maps ConversationNotFoundError → 404', () => {
    const err = new ConversationNotFoundError();
    expectMapped(err, 404, err.httpBody);
  });

  it('maps ProfileSubmitPhotoRequiredError → 422', () => {
    const err = new ProfileSubmitPhotoRequiredError();
    expectMapped(err, 422, err.httpBody);
    expect(obs.trace).toHaveBeenCalledWith(
      err.message,
      ErrorCodes.ME_PROFILE_PHOTO_REQUIRED,
    );
  });

  it('MeMatchesDomainError remains instanceof MeDomainError', () => {
    expect(new MatchCandidateNotFoundError()).toBeInstanceOf(MeDomainError);
    expect(new MatchCandidateNotFoundError()).toBeInstanceOf(
      MeMatchesDomainError,
    );
  });
});
