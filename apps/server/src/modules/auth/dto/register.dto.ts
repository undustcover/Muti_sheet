import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '邮箱' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '姓名/昵称' })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: '密码（至少 6 位）' })
  @MinLength(6)
  password!: string;
}