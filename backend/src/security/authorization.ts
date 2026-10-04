export type AppRole = "admin" | "executive" | "viewer";

export type Permission =
  | "dashboard:read"
  | "assistant:use"
  | "comments:write"
  | "data:read"
  | "data:write"
  | "data:rollback"
  | "audit:read";

const ROLE_PERMISSIONS: Readonly<Record<AppRole, readonly Permission[]>> = Object.freeze({
  admin: Object.freeze<Permission[]>([
    "dashboard:read",
    "assistant:use",
    "comments:write",
    "data:read",
    "data:write",
    "data:rollback",
    "audit:read",
  ]),
  executive: Object.freeze<Permission[]>(["dashboard:read", "assistant:use", "comments:write", "data:read"]),
  viewer: Object.freeze<Permission[]>(["dashboard:read", "assistant:use", "data:read"]),
});

export function permissionsForRole(role: AppRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "executive" || value === "viewer";
}
