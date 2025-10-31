import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: '我的项目' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: false, description: '项目级匿名只读开关' })
  @IsOptional()
  @IsBoolean()
  isAnonymousReadEnabled?: boolean;
}