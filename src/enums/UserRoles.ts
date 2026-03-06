/**
 * User roles enumeration
 */
export enum UserRoles {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
}

/**
 * Role hierarchy for permission checking
 * Higher number = higher privilege
 */
export const RoleHierarchy: Record<UserRoles, number> = {
  [UserRoles.USER]: 1,
  [UserRoles.MODERATOR]: 2,
  [UserRoles.ADMIN]: 3,
};

/**
 * Default role for new users
 */
export const DEFAULT_ROLE = UserRoles.USER;
