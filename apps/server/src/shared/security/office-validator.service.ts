import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type OfficeValidation = {
  pass: boolean;
  ext: string;
  format: 'OOXML' | 'OLE' | 'UNKNOWN';
  reason?: string;
};

@Injectable()
export class OfficeValidatorService {
  private allowedExt = new Set([
    '.doc', '.docx', '.docm',
    '.xls', '.xlsx', '.xlsm', '.xlam',
    '.ppt', '.pptx', '.pptm',
  ]);

  private allowedMime = new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.ms-excel.addin.macroEnabled.12',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  ]);

  validateOffice(filePath: string, originalName: string, mime?: string): OfficeValidation {
    const ext = (path.extname(originalName || '') || '').toLowerCase();
    if (!this.allowedExt.has(ext)) {
      return { pass: false, ext, format: 'UNKNOWN', reason: 'not-allowed-ext' };
    }

    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(8);
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);
      // OOXML: ZIP header PK\x03\x04
      const isZip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
      // OLE Compound: D0 CF 11 E0 A1 B1 1A E1
      const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
      const isOle = ole.every((b, i) => buf[i] === b);
      if (isZip) return { pass: true, ext, format: 'OOXML' };
      if (isOle) return { pass: true, ext, format: 'OLE' };
      // 头不匹配，拒绝
      return { pass: false, ext, format: 'UNKNOWN', reason: 'header-mismatch' };
    } catch (e: any) {
      return { pass: false, ext, format: 'UNKNOWN', reason: `read-error:${e?.message || e}` };
    }
  }
}