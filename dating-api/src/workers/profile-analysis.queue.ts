export const PROFILE_ANALYSIS_QUEUE = 'profile-analysis';

export type ProfileAnalysisJobData = {
  userId: string;
  profileId: string;
};

/** Stable Bull jobId — duplicate pending/active enqueues coalesce. */
export function profileAnalysisJobId(userId: string): string {
  return `analysis:${userId}`;
}
