import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("settings").take(1);
    return docs[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
    coinsPerBooking: v.optional(v.number()),
    monthlyTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("settings").take(1);
    const patch: Record<string, number> = {};
    if (args.coinsPerBooking !== undefined) patch.coinsPerBooking = args.coinsPerBooking;
    if (args.monthlyTarget !== undefined) patch.monthlyTarget = args.monthlyTarget;
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, patch);
    } else {
      await ctx.db.insert("settings", {
        id: "global",
        coinsPerBooking: args.coinsPerBooking ?? 0,
        monthlyTarget: args.monthlyTarget,
      });
    }
  },
});
