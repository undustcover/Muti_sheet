import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({ description: '邀请注册的用户名（唯一）' })
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: '过期时间（可选）' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}