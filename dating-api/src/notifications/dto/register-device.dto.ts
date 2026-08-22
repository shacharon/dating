import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  token!: string;

  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';
}
