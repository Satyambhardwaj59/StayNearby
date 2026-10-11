export const USER_ROLES = ['TENANT', 'OWNER', 'MODERATOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
