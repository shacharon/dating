export type StoryVoiceDraftUsageDto = {
  whisperSeconds: number;
  chatInputTokens: number;
  chatOutputTokens: number;
};

export type StoryVoiceDraftResponseDto = {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  language: string;
  durationSeconds: number;
  usage: StoryVoiceDraftUsageDto;
};

export type UploadedStoryVoiceFile = {
  mimetype: string;
  size: number;
  originalname?: string;
  buffer: Buffer;
};
