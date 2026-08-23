import { Injectable } from '@nestjs/common';
import type {
  CreateMeProfileDto,
  MeLatestAnalysisResponseDto,
  MeProfilePhotoDto,
  MeProfileResponseDto,
  PatchMeProfileDto,
} from '../me-profile.dto';
import type { AnalysisStatusResponseDto } from '../dto/analysis-status-response.dto';
import { ProfileCrudService } from './profile-crud.service';
import { ProfilePhotoService } from './profile-photo.service';
import { ProfileAnalysisSubmitService } from './profile-analysis-submit.service';
import type { UploadedPhotoFile } from './profile-photo.constants';
import type { MeProfileSubmitResponseDto } from './me-profile-submit.dto';

export type { MeProfileSubmitResponseDto };

/**
 * Controller-facing facade over the profile collaborators (Sprint 38 Story 4).
 * Holds no logic — each method delegates to Crud, Photo, or AnalysisSubmit.
 */
@Injectable()
export class MeProfileService {
  constructor(
    private readonly crud: ProfileCrudService,
    private readonly photos: ProfilePhotoService,
    private readonly analysisSubmit: ProfileAnalysisSubmitService,
  ) {}

  async getForUser(userId: string): Promise<MeProfileResponseDto | null> {
    return this.crud.getForUser(userId);
  }

  async createForUser(
    userId: string,
    body: CreateMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    return this.crud.createForUser(userId, body);
  }

  async patchForUser(
    userId: string,
    body: PatchMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    return this.crud.patchForUser(userId, body);
  }

  async listPhotosForUser(userId: string): Promise<MeProfilePhotoDto[]> {
    return this.photos.listPhotosForUser(userId);
  }

  async uploadPhotoForUser(
    userId: string,
    file: UploadedPhotoFile | undefined,
  ): Promise<MeProfilePhotoDto> {
    return this.photos.uploadPhotoForUser(userId, file);
  }

  async deletePhotoForUser(
    userId: string,
    photoId: string,
  ): Promise<{ deleted: true }> {
    return this.photos.deletePhotoForUser(userId, photoId);
  }

  async setPrimaryPhotoForUser(
    userId: string,
    photoId: string,
  ): Promise<MeProfilePhotoDto> {
    return this.photos.setPrimaryPhotoForUser(userId, photoId);
  }

  async getPhotoFileForUser(
    userId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    return this.photos.getPhotoFileForUser(userId, photoId);
  }

  async submitForUser(userId: string): Promise<MeProfileSubmitResponseDto> {
    return this.analysisSubmit.submitForUser(userId);
  }

  async getAnalysisStatusForUser(
    userId: string,
  ): Promise<AnalysisStatusResponseDto> {
    return this.analysisSubmit.getAnalysisStatusForUser(userId);
  }

  async getLatestAnalysisForUser(
    userId: string,
  ): Promise<MeLatestAnalysisResponseDto> {
    return this.analysisSubmit.getLatestAnalysisForUser(userId);
  }
}
