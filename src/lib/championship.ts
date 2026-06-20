import type { Booking, StaffMember } from "@/types";

// ── Time periods ──────────────────────────────────────────────────────────────
export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "all";

export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  quarterly: "This Quarter",
  yearly: "This Year",
  all: "All Time",
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Inclusive [start,end] date-string window for a period (ISO yyyy-mm-dd). */
export function periodRange(period: Period, now = new Date()): { start: string; end: string } {
  const end = ymd(now);
  switch (period) {
    case "daily":
      return { start: end, end };
    case "weekly": {
      const day = (now.getDay() + 6) % 7; // Monday = 0
      const monday = new Date(now);
      monday.setDate(now.getDate() - day);
      return { start: ymd(monday), end };
    }
    case "monthly":
      return { start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), end };
    case "quarterly": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return { start: ymd(new Date(now.getFullYear(), q, 1)), end };
    }
    case "yearly":
      return { start: ymd(new Date(now.getFullYear(), 0, 1)), end };
    case "all":
    default:
      return { start: "0000-01-01", end };
  }
}

// ── Levels & badges ───────────────────────────────────────────────────────────
export type Level = "Bronze" | "Silver" | "Gold" | "Platinum";

export const LEVELS: { level: Level; min: number; color: string; ring: string }[] = [
  { level: "Platinum", min: 800, color: "text-cyan-700 bg-cyan-100 border-cyan-300", ring: "ring-cyan-400" },
  { level: "Gold", min: 400, color: "text-amber-700 bg-amber-100 border-amber-300", ring: "ring-amber-400" },
  { level: "Silver", min: 150, color: "text-slate-600 bg-slate-200 border-slate-300", ring: "ring-slate-400" },
  { level: "Bronze", min: 0, color: "text-orange-800 bg-orange-100 border-orange-300", ring: "ring-orange-400" },
];

export function levelFor(points: number): { level: Level; min: number; next: number | null; color: string; ring: string } {
  const tier = LEVELS.find((l) => points >= l.min) ?? LEVELS[LEVELS.length - 1];
  const idx = LEVELS.findIndex((l) => l.level === tier.level);
  const next = idx > 0 ? LEVELS[idx - 1].min : null; // higher tier threshold
  return { ...tier, next };
}

export interface Badge { key: string; label: string; icon: string; desc: string; }

export const ALL_BADGES: Badge[] = [
  { key: "champion", label: "Champion", icon: "🏆", desc: "Ranked #1 on the leaderboard" },
  { key: "revenue_king", label: "Revenue King", icon: "👑", desc: "Highest revenue generated" },
  { key: "top_collector", label: "Top Collector", icon: "💰", desc: "Highest amount collected" },
  { key: "booking_machine", label: "Booking Machine", icon: "🎟️", desc: "Most bookings recorded" },
  { key: "century", label: "Century", icon: "💯", desc: "100+ bookings" },
  { key: "half_century", label: "Half Century", icon: "5️⃣", desc: "50+ bookings" },
  { key: "closer", label: "Closer", icon: "🎯", desc: "75%+ conversion rate" },
  { key: "recovery_pro", label: "Recovery Pro", icon: "🛡️", desc: "90%+ collection recovery" },
  { key: "on_fire", label: "On Fire", icon: "🔥", desc: "3+ day booking streak" },
  { key: "coin_master", label: "Coin Master", icon: "🪙", desc: "1,000+ reward coins earned" },
  { key: "target_crusher", label: "Target Crusher", icon: "🎖️", desc: "Reached the sales target" },
  { key: "rising_star", label: "Rising Star", icon: "⭐", desc: "Active newcomer this period" },
];

const badge = (key: string) => ALL_BADGES.find((b) => b.key === key)!;

// ── Per-performer row ─────────────────────────────────────────────────────────
export interface PerfRow {
  name: string;
  staffId?: string;
  department: string;
  bookings: number;
  revenue: number;
  collection: number;
  pending: number;
  avgValue: number;
  recoveryRate: number;
  conversionRate: number;
  followUpRate: number;
  occupancy: number;
  coins: number;
  streak: number;
  points: number;
  targetPct: number;
  level: Level;
  rank: number;
  badges: Badge[];
}

export interface TeamRow {
  team: string;
  members: number;
  bookings: number;
  revenue: number;
  collection: number;
  points: number;
  rank: number;
}

export interface LeaderboardResult {
  rows: PerfRow[];
  teams: TeamRow[];
  totals: {
    bookings: number;
    revenue: number;
    collection: number;
    pending: number;
    avgValue: number;
    conversionRate: number;
    recoveryRate: number;
  };
  leaders: {
    revenue?: PerfRow;
    bookings?: PerfRow;
    collection?: PerfRow;
    champion?: PerfRow;
  };
}

interface Acc {
  name: string;
  staffId?: string;
  department: string;
  bookings: number;
  leads: number;       // all bookings incl. tentative + cancelled
  converted: number;   // confirmed / fully_paid
  fullyPaid: number;
  withPending: number;
  revenue: number;
  collection: number;
  pending: number;
  coins: number;
  dates: Set<string>;
}

/** Consecutive days (ending today) the performer made at least one booking. */
function streakOf(dates: Set<string>, now = new Date()): number {
  let streak = 0;
  const cur = new Date(now);
  // allow the streak to start from today or yesterday (grace for "not yet today")
  if (!dates.has(ymd(cur))) cur.setDate(cur.getDate() - 1);
  while (dates.has(ymd(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function computeLeaderboard(
  bookings: Booking[],
  staff: StaffMember[],
  opts: { period: Period; tripId?: string; team?: string; target?: number; now?: Date },
): LeaderboardResult {
  const now = opts.now ?? new Date();
  const { start, end } = periodRange(opts.period, now);
  const target = opts.target && opts.target > 0 ? opts.target : 150000;
  const staffByName = new Map(staff.map((s) => [s.name.toLowerCase(), s]));

  const inWindow = bookings.filter((b) => {
    const d = (b.bookingDate || "").slice(0, 10);
    if (d < start || d > end) return false;
    if (opts.tripId && opts.tripId !== "all" && b.tripId !== opts.tripId) return false;
    return true;
  });

  const accs = new Map<string, Acc>();
  for (const b of inWindow) {
    const key = b.collectedBy || "Unknown";
    let a = accs.get(key);
    if (!a) {
      const sm = staffByName.get(key.toLowerCase());
      a = {
        name: key, staffId: b.staffId ?? sm?.id, department: sm?.department ?? "Field",
        bookings: 0, leads: 0, converted: 0, fullyPaid: 0, withPending: 0,
        revenue: 0, collection: 0, pending: 0, coins: 0, dates: new Set(),
      };
      accs.set(key, a);
    }
    a.leads++;
    if (b.status === "cancelled") continue;
    a.bookings++;
    a.revenue += b.finalAmount;
    a.collection += b.advancePaid;
    a.pending += b.pendingAmount;
    a.coins += b.rewardCoins ?? 0;
    a.dates.add((b.bookingDate || "").slice(0, 10));
    if (b.status === "confirmed" || b.status === "fully_paid") a.converted++;
    if (b.status === "fully_paid") a.fullyPaid++;
    if (b.pendingAmount > 0) a.withPending++;
  }

  const totalSeats = [...accs.values()].reduce((s, a) => s + a.bookings, 0) || 1;

  // First pass → metrics + points
  let rows: PerfRow[] = [...accs.values()].map((a) => {
    const recoveryRate = a.revenue > 0 ? Math.min(100, (a.collection / a.revenue) * 100) : 0;
    const conversionRate = a.leads > 0 ? (a.converted / a.leads) * 100 : 0;
    const followUpRate = a.fullyPaid + a.withPending > 0 ? (a.fullyPaid / (a.fullyPaid + a.withPending)) * 100 : 0;
    const occupancy = (a.bookings / totalSeats) * 100;
    const avgValue = a.bookings > 0 ? a.revenue / a.bookings : 0;
    const streak = streakOf(a.dates, now);
    const points = Math.round(
      a.revenue / 1000 + (a.collection / 1000) * 1.5 + a.bookings * 8 + recoveryRate * 1.5 + conversionRate,
    );
    const targetPct = (a.revenue / target) * 100;
    return {
      name: a.name, staffId: a.staffId, department: a.department,
      bookings: a.bookings, revenue: a.revenue, collection: a.collection, pending: a.pending,
      avgValue, recoveryRate, conversionRate, followUpRate, occupancy, coins: a.coins,
      streak, points, targetPct, level: levelFor(points).level, rank: 0, badges: [],
    };
  });

  rows.sort((x, y) => y.points - x.points);
  rows.forEach((r, i) => (r.rank = i + 1));

  // Category leaders (for badges + dashboard widgets)
  const maxBy = (sel: (r: PerfRow) => number) =>
    rows.reduce<PerfRow | undefined>((best, r) => (!best || sel(r) > sel(best) ? r : best), undefined);
  const revLeader = maxBy((r) => r.revenue);
  const bookLeader = maxBy((r) => r.bookings);
  const colLeader = maxBy((r) => r.collection);

  // Second pass → badges
  for (const r of rows) {
    const earned: Badge[] = [];
    if (r.rank === 1 && r.points > 0) earned.push(badge("champion"));
    if (revLeader && r.name === revLeader.name && r.revenue > 0) earned.push(badge("revenue_king"));
    if (colLeader && r.name === colLeader.name && r.collection > 0) earned.push(badge("top_collector"));
    if (bookLeader && r.name === bookLeader.name && r.bookings > 0) earned.push(badge("booking_machine"));
    if (r.bookings >= 100) earned.push(badge("century"));
    else if (r.bookings >= 50) earned.push(badge("half_century"));
    if (r.conversionRate >= 75) earned.push(badge("closer"));
    if (r.recoveryRate >= 90 && r.revenue > 0) earned.push(badge("recovery_pro"));
    if (r.streak >= 3) earned.push(badge("on_fire"));
    if (r.coins >= 1000) earned.push(badge("coin_master"));
    if (r.targetPct >= 100) earned.push(badge("target_crusher"));
    if (r.bookings > 0 && r.bookings <= 10 && r.streak >= 1) earned.push(badge("rising_star"));
    r.badges = earned;
  }

  // Optional team filter (applied to displayed rows only)
  if (opts.team && opts.team !== "all") {
    rows = rows.filter((r) => r.department === opts.team);
    rows.forEach((r, i) => (r.rank = i + 1));
  }

  // Teams (by department)
  const teamMap = new Map<string, TeamRow>();
  for (const r of rows) {
    let t = teamMap.get(r.department);
    if (!t) { t = { team: r.department, members: 0, bookings: 0, revenue: 0, collection: 0, points: 0, rank: 0 }; teamMap.set(r.department, t); }
    t.members++; t.bookings += r.bookings; t.revenue += r.revenue; t.collection += r.collection; t.points += r.points;
  }
  const teams = [...teamMap.values()].sort((a, b) => b.points - a.points);
  teams.forEach((t, i) => (t.rank = i + 1));

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCollection = rows.reduce((s, r) => s + r.collection, 0);
  const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const totalLeads = [...accs.values()].reduce((s, a) => s + a.leads, 0);
  const totalConverted = [...accs.values()].reduce((s, a) => s + a.converted, 0);

  return {
    rows,
    teams,
    totals: {
      bookings: totalBookings,
      revenue: totalRevenue,
      collection: totalCollection,
      pending: totalPending,
      avgValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
      conversionRate: totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0,
      recoveryRate: totalRevenue > 0 ? Math.min(100, (totalCollection / totalRevenue) * 100) : 0,
    },
    leaders: {
      revenue: revLeader && revLeader.revenue > 0 ? revLeader : undefined,
      bookings: bookLeader && bookLeader.bookings > 0 ? bookLeader : undefined,
      collection: colLeader && colLeader.collection > 0 ? colLeader : undefined,
      champion: rows[0] && rows[0].points > 0 ? rows[0] : undefined,
    },
  };
}

/** Stable colour for an avatar based on the name. */
export function avatarColor(name: string): string {
  const colors = [
    "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
    "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-fuchsia-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}
