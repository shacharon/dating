import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnblockContentViolationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export type UnblockContentViolationResponseDto = {
  success: true;
  userId: string;
  previousStatus: string;
  clearedAt: string;
};
