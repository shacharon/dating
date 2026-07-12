import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UsePipes,
  Body,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthMeResponseDto } from '../../auth/auth.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MeProfileValidationPipe } from '../../me-profile/me-profile-validation.pipe';
import { AdminGuard } from '../admin.guard';
import { AdminPhotosService } from './admin-photos.service';
import { ListPendingPhotosQueryDto } from './dto/list-pending-photos.dto';
import { ModeratePhotoDto } from './dto/moderate-photo.dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminPhotosController {
  constructor(private readonly adminPhotos: AdminPhotosService) {}

  @Get('photos/pending')
  listPending(@Query() query: ListPendingPhotosQueryDto) {
    return this.adminPhotos.listPending(query.limit ?? 50, query.cursor);
  }

  @Get('photos/:photoId/file')
  async getPhotoFile(
    @Param('photoId') photoId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.adminPhotos.getPhotoFile(photoId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.content);
  }

  @Patch('photos/:photoId')
  @UsePipes(MeProfileValidationPipe)
  moderatePhoto(
    @CurrentUser() admin: AuthMeResponseDto,
    @Param('photoId') photoId: string,
    @Body() body: ModeratePhotoDto,
  ) {
    return this.adminPhotos.moderatePhoto(admin.id, photoId, body);
  }
}
