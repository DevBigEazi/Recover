"use client";

import { ReactNode } from "react";
import { Permission, Role, hasPermission } from "@/lib/permissions";
import { useTeam } from "@/context/TeamContext";

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  overrideRole?: Role;
}

/**
 * Conditionally renders children if the current user (or specified role)
 * has the required permission.
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  overrideRole,
}: PermissionGateProps) {
  const { currentRole } = useTeam();
  const role = overrideRole || currentRole;

  if (hasPermission(role, permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
