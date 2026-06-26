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

/** Format a date+time for transaction history (e.g. "22 Jun 2026, 4:35 PM"). */
export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Read an image File and return a compressed JPEG data URL, downscaled so the
 * longest edge is at most `maxEdge`px. Keeps receipt images small enough to
 * persist inside a Convex document.
 */
export function compressImage(file: File, maxEdge = 1024, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
