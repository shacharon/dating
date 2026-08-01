import type { MeProfileResponseDto } from '../me-profile.dto';

export type MeProfileSubmitResponseDto = {
  analysisJobId: string;
  profile: MeProfileResponseDto;
};
