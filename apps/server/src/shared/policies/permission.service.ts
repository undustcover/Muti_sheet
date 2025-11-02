import { Injectable } from '@nestjs/common';

export type RoleType = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface FieldPermissionJson {
  visibility?: 'hidden' | 'readonly' | 'visible';
  writableRoles?: RoleType[];
  readableRoles?: RoleType[];
}

export interface FieldPermissionResult {
  visible: boolean;
  readOnlyVisible: boolean;
  writable: boolean;
}

@Injectable()
export class PermissionService {
  resolveFieldPermission(role: RoleType, permissionJson?: FieldPermissionJson | null): FieldPermissionResult {
    // 默认：viewer=只读、editor=可写、admin/owner=可写
    const defaults: Record<RoleType, FieldPermissionResult> = {
      VIEWER: { visible: true, readOnlyVisible: true, writable: false },
      EDITOR: { visible: true, readOnlyVisible: false, writable: true },
      ADMIN: { visible: true, readOnlyVisible: false, writable: true },
      OWNER: { visible: true, readOnlyVisible: false, writable: true },
    };

    const base = defaults[role];
    if (!permissionJson) return base;

    const visibility = permissionJson.visibility ?? (base.readOnlyVisible ? 'readonly' : 'visible');
    const writableRoles = permissionJson.writableRoles ?? ['EDITOR', 'ADMIN', 'OWNER'];
    const readableRoles = permissionJson.readableRoles ?? ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'];

    const writable = writableRoles.includes(role);
    const readable = readableRoles.includes(role);
    const visible = visibility !== 'hidden' && readable;
    const readOnlyVisible = visibility === 'readonly' || (!writable && visible);

    return { visible, readOnlyVisible, writable };
  }

  // 扩展：带资源上下文的权限解析；资源拥有者具备更高权限（等同 ADMIN）
  resolveFieldPermissionWithContext(role: RoleType, isResourceOwner: boolean, permissionJson?: FieldPermissionJson | null): FieldPermissionResult {
    const effectiveRole: RoleType = isResourceOwner ? 'ADMIN' : role;
    return this.resolveFieldPermission(effectiveRole, permissionJson);
  }
}