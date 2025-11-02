import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class InviteRegisterDto {
  @ApiProperty({ description: '邀请令牌' })
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: '邮箱' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '密码（至少 6 位）' })
  @MinLength(6)
  password!: string;
}