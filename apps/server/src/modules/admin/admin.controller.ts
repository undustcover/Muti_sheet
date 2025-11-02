import { BadRequestException, Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateInviteDto } from './dto/create-invite.dto';
import { randomUUID } from 'crypto';
import { Param } from '@nestjs/common';


@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '获取系统设置（注册模式）' })
  @ApiOkResponse({ description: '返回当前注册模式设置' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('settings')
  async getSettings() {
    let setting = await this.prisma.systemSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.systemSetting.create({ data: { inviteOnlyRegistration: false } });
    }
    return setting;
  }

  @ApiOperation({ summary: '更新系统设置（注册模式）' })
  @ApiOkResponse({ description: '更新成功返回设置' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('settings')
  async updateSettings(@Body() dto: { inviteOnlyRegistration?: boolean }) {
    let setting = await this.prisma.systemSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.systemSetting.create({ data: { inviteOnlyRegistration: !!dto.inviteOnlyRegistration } });
    } else {
      setting = await this.prisma.systemSetting.update({ where: { id: setting.id }, data: { inviteOnlyRegistration: !!dto.inviteOnlyRegistration } });
    }
    return setting;
  }

  @ApiOperation({ summary: '创建邀请链接（同名仅允许一个未使用邀请）' })
  @ApiBody({ type: CreateInviteDto })
  @ApiOkResponse({ description: '返回邀请实体与令牌' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('invites')
  async createInvite(@Body() dto: CreateInviteDto, req?: any) {
    const name = dto.name.trim();
    const existsUser = await this.prisma.user.findFirst({ where: { name } });
    if (existsUser) throw new BadRequestException('该名字已存在用户，无法再次邀请');
    const existsInvite = await this.prisma.invite.findFirst({ where: { name, usedAt: null } });
    if (existsInvite) throw new BadRequestException('该名字已有未使用邀请，无法重复生成');
    const token = randomUUID();
    const createdById = req?.user?.userId;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const invite = await this.prisma.invite.create({ data: { name, token, createdById, expiresAt: expiresAt ?? undefined } });
    return { invite };
  }

  @ApiOperation({ summary: '邀请列表' })
  @ApiOkResponse({ description: '返回全部邀请（含已使用）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('invites')
  async listInvites() {
    return this.prisma.invite.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @ApiOperation({ summary: '用户列表（管理员）' })
  @ApiOkResponse({ description: '返回全部用户' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('users')
  async listUsers() {
    return this.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isLocked: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }

  @ApiOperation({ summary: '更新用户角色/锁定' })
  @ApiOkResponse({ description: '返回更新后的用户' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:userId')
  async updateUser(@Param('userId') userId: string, @Body() dto: { role?: 'OWNER'|'ADMIN'|'EDITOR'|'VIEWER'; isLocked?: boolean }) {
    const data: any = {};
    if (dto.role) data.role = dto.role;
    if (typeof dto.isLocked === 'boolean') data.isLocked = dto.isLocked;
    return this.prisma.user.update({ where: { id: userId }, data, select: { id: true, email: true, name: true, role: true, isLocked: true, createdAt: true } });
  }

  @ApiOperation({ summary: '删除用户' })
  @ApiOkResponse({ description: '删除成功返回ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('users/:userId:delete')
  async deleteUser(@Param('userId') userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { id: userId };
  }
}