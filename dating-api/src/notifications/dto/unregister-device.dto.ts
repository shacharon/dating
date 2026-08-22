import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnregisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  token!: string;
}
