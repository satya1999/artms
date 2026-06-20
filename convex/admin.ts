import { mutation } from "./_generated/server";

/** Wipes every row from all app tables. */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const del = async (docs: Array<{ _id: Parameters<typeof ctx.db.delete>[0] }>) => {
      for (const doc of docs) await ctx.db.delete(doc._id);
    };

    await del(await ctx.db.query("trips").take(1000));
    await del(await ctx.db.query("bookings").take(5000));
    await del(await ctx.db.query("payments").take(5000));
    await del(await ctx.db.query("expenses").take(2000));
    await del(await ctx.db.query("categories").take(500));
    await del(await ctx.db.query("cashEntries").take(5000));
    await del(await ctx.db.query("bankAccounts").take(100));
    await del(await ctx.db.query("bankTransactions").take(5000));
    await del(await ctx.db.query("employees").take(500));
    await del(await ctx.db.query("salaries").take(2000));
    await del(await ctx.db.query("buses").take(200));
    await del(await ctx.db.query("staff").take(500));
    await del(await ctx.db.query("staffLoans").take(1000));
    await del(await ctx.db.query("loanRepayments").take(2000));

    return { cleared: true };
  },
});

/**
 * Removes duplicate documents (same app `id` field, different Convex _id).
 * Keeps the first document seen for each app id; deletes the rest.
 */
export const deduplicateAll = mutation({
  args: {},
  handler: async (ctx) => {
    let removed = 0;

    const dedup = async (docs: Array<{ _id: Parameters<typeof ctx.db.delete>[0]; id?: string }>) => {
      const seen = new Set<string>();
      for (const doc of docs) {
        const appId = (doc as { id?: string }).id;
        if (!appId) continue;
        if (seen.has(appId)) {
          await ctx.db.delete(doc._id);
          removed++;
        } else {
          seen.add(appId);
        }
      }
    };

    await dedup(await ctx.db.query("trips").take(1000));
    await dedup(await ctx.db.query("bookings").take(5000));
    await dedup(await ctx.db.query("payments").take(5000));
    await dedup(await ctx.db.query("expenses").take(2000));
    await dedup(await ctx.db.query("categories").take(500));
    await dedup(await ctx.db.query("cashEntries").take(5000));
    await dedup(await ctx.db.query("bankAccounts").take(100));
    await dedup(await ctx.db.query("bankTransactions").take(5000));
    await dedup(await ctx.db.query("employees").take(500));
    await dedup(await ctx.db.query("salaries").take(2000));
    await dedup(await ctx.db.query("buses").take(200));
    await dedup(await ctx.db.query("staff").take(500));
    await dedup(await ctx.db.query("staffLoans").take(1000));
    await dedup(await ctx.db.query("loanRepayments").take(2000));

    return { removed };
  },
});
