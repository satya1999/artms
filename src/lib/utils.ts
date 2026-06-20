import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { User, UserRole } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

/** Returns true if the user has any of the specified roles.
 *  Checks user.roles[] when present; falls back to user.role for backward compat. */
export function hasRole(user: User | null | undefined, ...check: UserRole[]): boolean {
  if (!user) return false;
  const effective = user.roles ?? [user.role];
  return check.some((r) => effective.includes(r));
}

/** Returns the effective role list for a user. */
export function effectiveRoles(user: User | null | undefined): UserRole[] {
  if (!user) return [];
  return user.roles ?? [user.role];
}
