import type { CustomUserRole } from "../types/User";

type RoleLike = CustomUserRole | string | null | undefined;

export function normalizeRole(role: RoleLike): string {
  return (role ?? "").toString().trim().toLowerCase();
}

export function isCandidateLikeRole(role: RoleLike): boolean {
  return ["candidat", "candidate", "stagiaire", "candidatuser"].includes(normalizeRole(role));
}

export function isCoreStaffRole(role: RoleLike): boolean {
  return ["admin", "superadmin", "staff", "staff_read", "commercial", "charge_recrutement"].includes(
    normalizeRole(role)
  );
}

export function isCoreWriteRole(role: RoleLike): boolean {
  return ["admin", "superadmin", "staff", "commercial", "charge_recrutement"].includes(normalizeRole(role));
}

export function canWriteFormationsRole(role: RoleLike): boolean {
  return ["admin", "superadmin", "staff"].includes(normalizeRole(role));
}

export function canAccessPrepaRole(role: RoleLike): boolean {
  return ["admin", "superadmin", "staff", "staff_read", "prepa_staff"].includes(normalizeRole(role));
}

export function canAccessDeclicRole(role: RoleLike): boolean {
  return ["admin", "superadmin", "staff", "staff_read", "declic_staff"].includes(normalizeRole(role));
}

export function isAdminLikeRole(role: RoleLike): boolean {
  return ["admin", "superadmin"].includes(normalizeRole(role));
}
