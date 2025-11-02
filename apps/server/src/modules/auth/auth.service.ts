import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.isLocked) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { accessToken: token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isLocked: user.isLocked } };
  }

  async getRegistrationMode() {
    const setting = await this.prisma.systemSetting.findFirst();
    return { inviteOnly: !!setting?.inviteOnlyRegistration };
  }

  async register(email: string, name: string, password: string) {
    const setting = await this.prisma.systemSetting.findFirst();
    if (setting?.inviteOnlyRegistration) {
      throw new BadRequestException('当前为邀请注册模式，开放注册已禁用');
    }
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('邮箱已注册');
    const nameExists = await this.prisma.user.findFirst({ where: { name } });
    if (nameExists) throw new BadRequestException('该名字已存在用户');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({ data: { email, name, passwordHash, role: 'VIEWER' } });
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { accessToken: token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isLocked: user.isLocked } };
  }

  async inviteValidate(token: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new BadRequestException('邀请不存在');
    if (invite.usedAt) throw new BadRequestException('邀请已使用');
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) throw new BadRequestException('邀请已过期');
    return { name: invite.name };
  }

  async inviteRegister(token: string, email: string, password: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new BadRequestException('邀请不存在');
    if (invite.usedAt) throw new BadRequestException('邀请已使用');
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) throw new BadRequestException('邀请已过期');

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('邮箱已注册');
    const nameExistsUser = await this.prisma.user.findFirst({ where: { name: invite.name } });
    if (nameExistsUser) throw new BadRequestException('该名字已存在用户');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({ data: { email, name: invite.name, passwordHash, role: 'VIEWER' } });
    await this.prisma.invite.update({ where: { token }, data: { usedAt: new Date() } });
    const payload = { sub: user.id, email: user.email, role: user.role };
    const tokenJwt = await this.jwt.signAsync(payload);
    return { accessToken: tokenJwt, user: { id: user.id, email: user.email, name: user.name, role: user.role, isLocked: user.isLocked } };
  }
}