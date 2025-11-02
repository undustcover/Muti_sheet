import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InviteRegisterDto } from './dto/invite-register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('logout')
  async logout() {
    // 无状态 JWT，后端不维护会话；返回成功即可
    return { success: true };
  }

  @Get('registration-mode')
  async registrationMode() {
    return this.auth.getRegistrationMode();
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.name, dto.password);
  }

  @Get('invite/validate')
  async inviteValidate(@Query('token') token: string) {
    return this.auth.inviteValidate(token);
  }

  @Post('invite/register')
  async inviteRegister(@Body() dto: InviteRegisterDto) {
    return this.auth.inviteRegister(dto.token, dto.email, dto.password);
  }
}