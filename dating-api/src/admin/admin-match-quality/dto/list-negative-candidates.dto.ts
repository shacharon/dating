export type NegativeCandidateRowDto = {
  matchProfileId: string;
  negativeCount: number;
  distinctViewers: number;
  lastNegativeAt: string;
};

export type ListNegativeCandidatesResponseDto = {
  windowDays: number;
  items: NegativeCandidateRowDto[];
  total: number;
  limit: number;
  offset: number;
};
