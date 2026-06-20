import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("bankTransactions").take(5000),
});

export const create = mutation({
  args: { doc: v.any() },
  handler: async (ctx, { doc }) => {
    await ctx.db.insert("bankTransactions", doc);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.query("bankTransactions").withIndex("by_appId", q => q.eq("id", id)).unique();
    if (doc) await ctx.db.delete(doc._id);
  },
});
