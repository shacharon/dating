import { Injectable } from '@nestjs/common';
import type { MeMatchDetailDto } from '../../dto/me-matches-response.dto';
import { MatchDetailQueryService } from './match-detail-query.service';
import { MatchDetailPhotoService } from './match-detail-photo.service';

@Injectable()
export class MatchDetailService {
  constructor(
    private readonly query: MatchDetailQueryService,
    private readonly photo: MatchDetailPhotoService,
  ) {}

  getById(
    userId: string,
    candidateProfileId: string,
  ): Promise<MeMatchDetailDto> {
    return this.query.getById(userId, candidateProfileId);
  }

  getPrimaryPhotoFileById(
    userId: string,
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    return this.photo.getPrimaryPhotoFileById(
      userId,
      candidateProfileId,
      photoId,
    );
  }

  readApprovedPrimaryPhotoFile(
    candidateProfileId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    return this.photo.readApprovedPrimaryPhotoFile(
      candidateProfileId,
      photoId,
    );
  }
}
