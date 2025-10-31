import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class ViewAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    let viewId: string | undefined = req.params?.viewId;
    // 兼容导出等以 query 传递 viewId 的路由
    if (!viewId) {
      const q = req.query ?? {};
      const qViewId = (q.viewId ?? q.view_id ?? '').toString();
      viewId = qViewId || undefined;
    }
    if (!viewId) return true; // 无 viewId 时跳过

    const user = req.user as { userId?: string; role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' } | undefined;

    const view = await this.prisma.view.findUnique({ where: { id: viewId }, include: { table: true } });
    if (!view) throw new ForbiddenException('View not found');

    // 管理员/拥有者允许访问
    if (user?.role === 'ADMIN' || user?.role === 'OWNER') return true;

    // 导出意图识别（通过查询参数标记）；未来可在导出路由中复用该守卫
    const isExport = (() => {
      const q = req.query ?? {};
      const v = (q.export ?? q.isExport ?? '').toString().toLowerCase();
      return v === '1' || v === 'true';
    })();

    // 匿名只读：表级开关开启时允许 GET 请求匿名访问（禁止匿名导出）
    const method = req.method?.toUpperCase() || 'GET';
    if (!user?.userId && method === 'GET' && view.table.isAnonymousReadEnabled && !isExport) return true;

    // 视图配置共享：sharedRoles 命中则允许访问
    const cfg = (view as any).config ?? {};
    const sharedRoles: string[] = Array.isArray(cfg.sharedRoles) ? cfg.sharedRoles : [];
    if (user?.role && sharedRoles.includes(user.role)) {
      // 若为导出请求，继续检查导出开关与角色
      if (isExport) {
        const exportEnabled = !!cfg.exportEnabled;
        const canExportRole = ['EDITOR', 'ADMIN', 'OWNER'].includes(user.role);
        if (!exportEnabled || !canExportRole) throw new ForbiddenException('Export is disabled for this view');
      }
      return true;
    }

    // 导出请求：未命中共享角色的情况下，仍允许管理员/拥有者（已在上方返回），其他角色按导出开关与角色限制
    if (isExport) {
      if (!user?.userId) throw new ForbiddenException('Anonymous export is not allowed');
      const exportEnabled = !!cfg.exportEnabled;
      const canExportRole = user?.role ? ['EDITOR', 'ADMIN', 'OWNER'].includes(user.role) : false;
      if (!exportEnabled || !canExportRole) throw new ForbiddenException('Export is disabled for this view');
      // 允许导出，但继续检查是否具备访问权限（共享或分享）
    }

    // 用户共享：存在 ViewShare 关联即允许访问
    if (user?.userId) {
      const shared = await this.prisma.viewShare.findFirst({ where: { viewId, userId: user.userId } });
      if (shared) return true;
    }

    throw new ForbiddenException('View access denied');
  }
}