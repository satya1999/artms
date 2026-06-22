import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SALT = "artms-2026-salt-";

/** SHA-256 hash a password with the app salt. Works in both default and Node runtimes. */
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const roleV = v.union(
  v.literal("super_admin"),
  v.literal("accountant"),
  v.literal("booking_executive"),
  v.literal("tour_manager"),
);

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Return all users with passwordHash stripped. */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("users").take(500);
    return docs.map(({ passwordHash: _ph, ...rest }) => rest);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a new user. Hashes the provided password (or default). */
export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: roleV,
    roles: v.optional(v.array(roleV)),
    password: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate email
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .take(1);
    if (existing.length > 0) {
      throw new Error("A user with this email already exists");
    }

    const pw = args.password ?? "artms@2026";
    const passwordHash = await hashPassword(pw);

    await ctx.db.insert("users", {
      id: args.id,
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: args.role,
      roles: args.roles,
      passwordHash,
      active: args.active,
      createdAt: args.createdAt,
    });
  },
});

/** Update a user's profile fields (NOT password). */
export const update = mutation({
  args: {
    id: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      role: v.optional(roleV),
      roles: v.optional(v.array(roleV)),
      active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, updates }) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_appId", (q) => q.eq("id", id))
      .unique();
    if (!doc) throw new Error("User not found");
    await ctx.db.patch(doc._id, updates);
  },
});

/** Delete a user by app id. */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_appId", (q) => q.eq("id", id))
      .unique();
    if (doc) await ctx.db.delete(doc._id);
  },
});

/** Reset a user's password to the default (super-admin action). */
export const resetPassword = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_appId", (q) => q.eq("id", id))
      .unique();
    if (!doc) throw new Error("User not found");
    const passwordHash = await hashPassword("artms@2026");
    await ctx.db.patch(doc._id, { passwordHash });
  },
});

// ─── Login (mutation — runs inside the DB transaction) ────────────────────────

/** Verify email + password and return the user (without hash), or null. */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(1);
    if (doc.length === 0) return null;

    const user = doc[0];
    if (!user.active) return null;

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return null;

    const { passwordHash: _ph, _id, _creationTime, ...safeUser } = user;
    void _ph;
    void _id;
    void _creationTime;
    return safeUser;
  },
});

/** Change a user's password. Verifies the current password first. */
export const changePassword = mutation({
  args: {
    userId: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { userId, currentPassword, newPassword }) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_appId", (q) => q.eq("id", userId))
      .unique();
    if (!doc) throw new Error("User not found");

    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== doc.passwordHash) {
      throw new Error("Current password is incorrect");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    const newHash = await hashPassword(newPassword);
    await ctx.db.patch(doc._id, { passwordHash: newHash });
  },
});

// ─── Seed (internal — called once to populate default users) ──────────────────

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").take(1);
    if (existing.length > 0) return { seeded: false, reason: "Users already exist" };

    const defaultPwHash = await hashPassword("artms@2026");

    const defaults = [
      { id: "U001", name: "Ananda Rath", email: "admin@artms.in", role: "super_admin" as const, roles: ["super_admin" as const], phone: "9876543210", createdAt: "2024-01-01" },
      { id: "U002", name: "Priya Sharma", email: "accounts@artms.in", role: "accountant" as const, roles: ["accountant" as const], phone: "9876543211", createdAt: "2024-01-15" },
      { id: "U003", name: "Rahul Das", email: "booking@artms.in", role: "booking_executive" as const, roles: ["booking_executive" as const], phone: "9876543212", createdAt: "2024-02-01" },
      { id: "U004", name: "Suresh Panda", email: "tours@artms.in", role: "tour_manager" as const, roles: ["tour_manager" as const], phone: "9876543213", createdAt: "2024-02-15" },
    ];

    for (const u of defaults) {
      await ctx.db.insert("users", {
        ...u,
        passwordHash: defaultPwHash,
        active: true,
      });
    }

    return { seeded: true, count: defaults.length };
  },
});
