import {
  STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW,
  isAllowedStoryVoiceMime,
} from './story-voice-draft.constants';

describe('story-voice-draft.constants', () => {
  it('allows webm with codecs parameter', () => {
    expect(isAllowedStoryVoiceMime('audio/webm;codecs=opus')).toBe(true);
  });

  it('allows common audio types', () => {
    expect(isAllowedStoryVoiceMime('audio/mp4')).toBe(true);
    expect(isAllowedStoryVoiceMime('audio/mpeg')).toBe(true);
    expect(isAllowedStoryVoiceMime('audio/wav')).toBe(true);
    expect(isAllowedStoryVoiceMime('audio/ogg')).toBe(true);
  });

  it('rejects non-audio and unknown types', () => {
    expect(isAllowedStoryVoiceMime('video/webm')).toBe(false);
    expect(isAllowedStoryVoiceMime('application/octet-stream')).toBe(false);
    expect(isAllowedStoryVoiceMime('audio/webm-extra')).toBe(false);
    expect(isAllowedStoryVoiceMime('')).toBe(false);
  });

  it('rate limit max is 5 per architect', () => {
    expect(STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW).toBe(5);
  });
});
