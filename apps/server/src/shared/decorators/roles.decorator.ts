import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type RoleType = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);