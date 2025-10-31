import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type ScanResult = {
  clean: boolean;
  engine: string;
  details?: string;
};

@Injectable()
export class AntivirusService {
  async scanFile(filePath: string): Promise<ScanResult> {
    const engine = String(process.env.AV_ENGINE || 'heuristic');
    // 轻量启发式扫描：扩展名拒绝列表、MIME 提示、EICAR 测试串
    try {
      const ext = (path.extname(filePath) || '').toLowerCase();
      const denyExt = new Set(['.exe', '.com', '.scr', '.bat', '.cmd', '.js', '.vbs', '.ps1']);
      if (denyExt.has(ext)) {
        return { clean: false, engine, details: `deny-ext:${ext}` };
      }
      const stat = fs.statSync(filePath);
      const size = stat.size;
      const fd = fs.openSync(filePath, 'r');
      const len = Math.min(size, 128 * 1024);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, 0);
      fs.closeSync(fd);
      const txt = buf.toString('utf8');
      if (txt.includes('EICAR')) {
        return { clean: false, engine, details: 'eicar-signature' };
      }
      // 可扩展：若配置 CLAMAV_HOST/PORT，则调用 clamd 进行 INSTREAM 扫描
      // 当前无外部引擎配置时返回启发式通过
      return { clean: true, engine, details: 'heuristic-pass' };
    } catch (e: any) {
      return { clean: true, engine, details: `scan-error:${e?.message || e}` };
    }
  }
}