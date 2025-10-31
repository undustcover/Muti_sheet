import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('home')
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '最近编辑过的数据表列表（按记录更新排序）' })
  @ApiOkResponse({ description: '返回最近有更新记录的表列表（去重）' })
  @UseGuards(JwtAuthGuard)
  @Get('recent-tables')
  async recentTables(@Req() req: any) {
    const userId = req.user?.userId as string;
    void userId; // 未来可用于按用户过滤

    // 取最近记录按 updatedAt 倒序，去重 tableId，再返回表信息
    const recentRecords = await this.prisma.record.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: { id: true, tableId: true, updatedAt: true },
    });
    const seen = new Set<string>();
    const tableIds: string[] = [];
    for (const r of recentRecords) {
      if (!seen.has(r.tableId)) {
        seen.add(r.tableId);
        tableIds.push(r.tableId);
      }
      if (tableIds.length >= 20) break;
    }
    if (tableIds.length === 0) {
      // 如果没有记录，按表 updatedAt 降序兜底返回若干表
      const fallback = await this.prisma.table.findMany({ orderBy: { updatedAt: 'desc' }, take: 20 });
      return fallback;
    }
    const tables = await this.prisma.table.findMany({ where: { id: { in: tableIds } } });
    // 保持与 tableIds 相同顺序
    const orderMap = new Map<string, number>();
    tableIds.forEach((id, idx) => orderMap.set(id, idx));
    return tables.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!));
  }
}