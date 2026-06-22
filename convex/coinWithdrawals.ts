import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("coinWithdrawals").take(1000),
});

export const create = mutation({
  args: { doc: v.any() },
  handler: async (ctx, { doc }) => {
    await ctx.db.insert("coinWithdrawals", doc);
  },
});

export const update = mutation({
  args: { id: v.string(), updates: v.any() },
  handler: async (ctx, { id, updates }) => {
    const doc = await ctx.db.query("coinWithdrawals").withIndex("by_appId", q => q.eq("id", id)).unique();
    if (doc) await ctx.db.patch(doc._id, updates);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.query("coinWithdrawals").withIndex("by_appId", q => q.eq("id", id)).unique();
    if (doc) await ctx.db.delete(doc._id);
  },
});
