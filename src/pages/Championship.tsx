import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import {
  computeLeaderboard, avatarColor, levelFor,
  ALL_BADGES, LEVELS, PERIOD_LABELS,
  type Period, type PerfRow,
} from "@/lib/championship";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trophy, Crown, Flame, Target, Coins, Users, Award, Medal,
  TrendingUp, TrendingDown, ChevronUp, ChevronDown, Sparkles,
  IndianRupee, Wallet, Ticket, Percent, Zap, Star,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const PERIODS: Period[] = ["daily", "weekly", "monthly", "quarterly", "yearly", "all"];
const MEDALS = ["🥇", "🥈", "🥉"];
const C = { rev: "#16a34a", col: "#2563eb", conv: "#7c3aed", rec: "#ea580c", book: "#db2777", brand: "#E23B33", gold: "#F5B705" };
const BADGE_GRADS = [
  "from-amber-400 to-orange-500", "from-violet-500 to-fuchsia-500", "from-sky-400 to-blue-600",
  "from-emerald-400 to-green-600", "from-pink-500 to-rose-600", "from-cyan-400 to-teal-600",
];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function prevNow(period: Period, now: Date): Date {
  const d = new Date(now);
  if (period === "daily") d.setDate(d.getDate() - 1);
  else if (period === "weekly") d.setDate(d.getDate() - 7);
  else if (period === "monthly") d.setMonth(d.getMonth() - 1);
  else if (period === "quarterly") d.setMonth(d.getMonth() - 3);
  else if (period === "yearly") d.setFullYear(d.getFullYear() - 1);
  return d;
}
function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Shared pieces ─────────────────────────────────────────────────────────────
function GAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const cls = size === "xl" ? "w-20 h-20 text-3xl" : size === "lg" ? "w-14 h-14 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${cls} ${avatarColor(name)} rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
function Spark({ data, gid, color }: { data: number[]; gid: string; color: string }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={38}>
      <AreaChart data={d} margin={{ top: 3, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive />
      </AreaChart>
    </ResponsiveContainer>
  );
}
function Move({ m }: { m: number | null }) {
  if (m === null) return <span className="text-[10px] font-bold text-sky-500">NEW</span>;
  if (m > 0) return <span className="text-emerald-600 text-xs font-bold inline-flex items-center"><ChevronUp className="h-3 w-3" />{m}</span>;
  if (m < 0) return <span className="text-red-500 text-xs font-bold inline-flex items-center"><ChevronDown className="h-3 w-3" />{-m}</span>;
  return <span className="text-slate-400 text-xs">—</span>;
}
const tip = { contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12, color: "#0f172a", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }, labelStyle: { color: "#64748b" } };
const GRID = "rgba(15,23,42,0.06)";
const AXIS = "#94a3b8";

export default function Championship() {
  const { bookings, staff, trips, monthlyTarget } = useData();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("weekly");
  const [tripId, setTripId] = useState("all");
  const [team, setTeam] = useState("all");
  const now = useMemo(() => new Date(), []);

  const departments = useMemo(() => Array.from(new Set(staff.map((s) => s.department).filter(Boolean))).sort(), [staff]);
  const result = useMemo(() => computeLeaderboard(bookings, staff, { period, tripId, team, target: monthlyTarget, now }), [bookings, staff, period, tripId, team, monthlyTarget, now]);
  const prev = useMemo(() => computeLeaderboard(bookings, staff, { period, tripId, team, target: monthlyTarget, now: prevNow(period, now) }), [bookings, staff, period, tripId, team, monthlyTarget, now]);

  const { rows, totals, teams, leaders } = result;
  const target = monthlyTarget > 0 ? monthlyTarget : 150000;
  const myName = user?.name ?? "";
  const me = rows.find((r) => r.name.toLowerCase() === myName.toLowerCase());
  const hero: PerfRow | undefined = me ?? rows[0];
  const prevRank = useMemo(() => new Map(prev.rows.map((r) => [r.name.toLowerCase(), r.rank])), [prev]);
  const moveOf = (r: PerfRow): number | null => { const p = prevRank.get(r.name.toLowerCase()); return p === undefined ? null : p - r.rank; };

  const daily = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, k) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - k));
      return { key: ymd(d), label: d.toLocaleDateString("en-IN", { weekday: "short" }), revenue: 0, collection: 0, bookings: 0, leads: 0, converted: 0 };
    });
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const b of bookings) {
      if (tripId !== "all" && b.tripId !== tripId) continue;
      const i = idx.get((b.bookingDate || "").slice(0, 10));
      if (i === undefined) continue;
      days[i].leads++;
      if (b.status === "cancelled") continue;
      days[i].revenue += b.finalAmount; days[i].collection += b.advancePaid; days[i].bookings++;
      if (b.status === "confirmed" || b.status === "fully_paid") days[i].converted++;
    }
    return days;
  }, [bookings, tripId, now]);

  const trend = daily.map((d) => ({ label: d.label, revenue: d.revenue, collection: d.collection, points: Math.round(d.revenue / 1000 + (d.collection / 1000) * 1.5 + d.bookings * 8) }));
  const spark = {
    revenue: daily.map((d) => d.revenue), collection: daily.map((d) => d.collection), bookings: daily.map((d) => d.bookings),
    conversion: daily.map((d) => (d.leads > 0 ? (d.converted / d.leads) * 100 : 0)),
    recovery: daily.map((d) => (d.revenue > 0 ? (d.collection / d.revenue) * 100 : 0)),
  };
  const pct = (cur: number, prv: number) => (prv > 0 ? ((cur - prv) / prv) * 100 : cur > 0 ? 100 : 0);

  if (!hero) {
    return (
      <div className="min-h-full bg-slate-50 text-slate-900 p-4 md:p-6">
        <Header period={period} setPeriod={setPeriod} tripId={tripId} setTripId={setTripId} team={team} setTeam={setTeam} trips={trips} departments={departments} range={PERIOD_LABELS[period]} />
        <div className="mt-10 text-center">
          <Trophy className="h-14 w-14 mx-auto text-amber-400/50 mb-3 animate-float" />
          <p className="font-bold text-lg">The arena is empty… for now</p>
          <p className="text-sm text-slate-500">Once staff record bookings this period, the championship comes alive.</p>
        </div>
      </div>
    );
  }

  const lvl = levelFor(hero.points);
  const lvlIdx = LEVELS.findIndex((l) => l.level === lvl.level);
  const nextName = lvlIdx > 0 ? LEVELS[lvlIdx - 1].level : null;
  const leaguePct = lvl.next ? Math.min(100, (hero.points / lvl.next) * 100) : 100;
  const heroIsYou = !!me;

  const weekStartStr = (() => { const d = new Date(now); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return ymd(d); })();
  const heroWeekDates = new Set(bookings.filter((b) => b.collectedBy?.toLowerCase() === hero.name.toLowerCase() && b.status !== "cancelled" && (b.bookingDate || "").slice(0, 10) >= weekStartStr).map((b) => (b.bookingDate || "").slice(0, 10)));
  const weekGrid = Array.from({ length: 7 }, (_, k) => { const d = new Date(`${weekStartStr}T00:00:00`); d.setDate(d.getDate() + k); return { label: ["M", "T", "W", "T", "F", "S", "S"][k], done: heroWeekDates.has(ymd(d)), future: d > now }; });

  const pb = [
    { name: "Revenue", value: Math.round(hero.revenue / 1000), color: C.rev },
    { name: "Collection", value: Math.round((hero.collection / 1000) * 1.5), color: C.col },
    { name: "Bookings", value: hero.bookings * 8, color: C.book },
    { name: "Conversion", value: Math.round(hero.conversionRate), color: C.conv },
    { name: "Recovery", value: Math.round(hero.recoveryRate * 1.5), color: C.rec },
  ].filter((x) => x.value > 0);

  const dist = [
    { name: "High", value: rows.filter((r) => r.points >= 400).length, color: C.rev },
    { name: "Average", value: rows.filter((r) => r.points >= 150 && r.points < 400).length, color: C.conv },
    { name: "Low", value: rows.filter((r) => r.points < 150).length, color: C.brand },
  ].filter((x) => x.value > 0);

  const top = rows[0];
  const youRow = me ?? rows[0];
  const maxOf = (sel: (r: PerfRow) => number) => Math.max(1, ...rows.map(sel));
  const cmp = [
    { cat: "Revenue", you: (youRow.revenue / maxOf((r) => r.revenue)) * 100, top: (top.revenue / maxOf((r) => r.revenue)) * 100 },
    { cat: "Collection", you: (youRow.collection / maxOf((r) => r.collection)) * 100, top: (top.collection / maxOf((r) => r.collection)) * 100 },
    { cat: "Conversion", you: youRow.conversionRate, top: top.conversionRate },
    { cat: "Recovery", you: youRow.recoveryRate, top: top.recoveryRate },
    { cat: "Bookings", you: (youRow.bookings / maxOf((r) => r.bookings)) * 100, top: (top.bookings / maxOf((r) => r.bookings)) * 100 },
  ];

  const feed = [...bookings]
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => (b.bookingDateTime || b.bookingDate).localeCompare(a.bookingDateTime || a.bookingDate))
    .slice(0, 6)
    .map((b) => ({
      name: b.collectedBy, when: ago(b.bookingDateTime || `${b.bookingDate}T00:00:00`),
      text: b.advancePaid >= b.finalAmount && b.finalAmount > 0 ? `Fully closed ${formatCurrency(b.finalAmount)}` : b.advancePaid > 0 ? `Booked & collected ${formatCurrency(b.advancePaid)}` : `New booking ${b.id}`,
    }));

  const podium = rows.slice(0, 3);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-4 md:p-6 space-y-5 ar-scroll">
      <Header period={period} setPeriod={setPeriod} tripId={tripId} setTripId={setTripId} team={team} setTeam={setTeam} trips={trips} departments={departments} range={PERIOD_LABELS[period]} />

      {/* ── Champion hero (stays vibrant) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-300/40 bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#9d174d] text-white p-5 md:p-6 shadow-lg animate-pop">
        <div className="absolute inset-0 ar-shimmer pointer-events-none" />
        {["#f5b705", "#ec4899", "#22c55e", "#06b6d4", "#a855f7", "#fff"].map((c, i) => (
          <span key={i} className="ar-confetti" style={{ background: c, left: `${8 + i * 16}%`, top: 0, animationDelay: `${i * 0.6}s` }} />
        ))}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-full bg-amber-400/30 blur-xl" />
              <div className="relative rounded-full ring-4 ring-amber-400 animate-glow animate-float"><GAvatar name={hero.name} size="xl" /></div>
              <Crown className="h-7 w-7 text-amber-300 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow animate-float" />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-[9px] font-black px-2 py-0.5 rounded-full shadow">CHAMPION</span>
            </div>
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-black tracking-widest uppercase text-amber-200 bg-white/10 border border-white/20 rounded-full px-2 py-0.5">
                {heroIsYou ? (hero.rank === 1 ? "You are the champion" : "Your standing") : `Champion · ${PERIOD_LABELS[period]}`}
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <h2 className="text-2xl font-black truncate">{hero.name}</h2>
                <span className="bg-white/15 border border-white/25 rounded-lg px-2 py-0.5 text-sm font-black">#{hero.rank}</span>
              </div>
              <p className="text-xs text-violet-100 mt-1">{hero.rank === 1 ? "Keep it up! You are leading the championship." : `${nextName ? `Climb to ${nextName} League!` : "You're at the top tier!"}`}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 border border-white/25">{lvl.level}</span>
                {hero.streak >= 3 && <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-orange-200"><Flame className="h-3 w-3" />{hero.streak}d</span>}
                {hero.badges.slice(0, 5).map((b) => <span key={b.key} title={`${b.label} — ${b.desc}`} className="text-base">{b.icon}</span>)}
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { l: "Total Points", v: hero.points.toLocaleString() },
              { l: "Revenue", v: formatCurrency(hero.revenue) },
              { l: "Collection", v: formatCurrency(hero.collection) },
              { l: "Conversion", v: `${hero.conversionRate.toFixed(0)}%` },
              { l: "Recovery", v: `${hero.recoveryRate.toFixed(0)}%` },
            ].map((s) => (
              <div key={s.l} className="text-center rounded-xl bg-white/10 border border-white/15 py-2">
                <p className="text-sm font-black leading-tight truncate px-1">{s.v}</p>
                <p className="text-[10px] text-violet-100">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-white/10 border border-white/15 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center"><Star className="h-4 w-4 text-white" /></div>
                <div>
                  <p className="text-xs font-bold">{nextName ? `Progress to ${nextName} League` : "Top League reached"}</p>
                  <p className="text-[10px] text-violet-100">{lvl.next ? `${hero.points} / ${lvl.next} Points` : `${hero.points} pts`}</p>
                </div>
                <span className="ml-auto text-sm font-black text-amber-200">{leaguePct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${leaguePct}%` }} />
              </div>
              {nextName && <p className="text-[10px] text-violet-100 mt-1.5">Next: {nextName} I</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={IndianRupee} label="Total Revenue" value={formatCurrency(totals.revenue)} change={pct(totals.revenue, prev.totals.revenue)} color={C.rev} gid="k1" series={spark.revenue} />
        <Kpi icon={Wallet} label="Total Collection" value={formatCurrency(totals.collection)} change={pct(totals.collection, prev.totals.collection)} color={C.col} gid="k2" series={spark.collection} />
        <Kpi icon={Ticket} label="Total Bookings" value={String(totals.bookings)} change={pct(totals.bookings, prev.totals.bookings)} color={C.book} gid="k3" series={spark.bookings} />
        <Kpi icon={Percent} label="Conversion Rate" value={`${totals.conversionRate.toFixed(0)}%`} change={pct(totals.conversionRate, prev.totals.conversionRate)} color={C.conv} gid="k4" series={spark.conversion} />
        <Kpi icon={Percent} label="Recovery Rate" value={`${totals.recoveryRate.toFixed(0)}%`} change={pct(totals.recoveryRate, prev.totals.recoveryRate)} color={C.rec} gid="k5" series={spark.recovery} />
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1"><Flame className="h-4 w-4 text-orange-500" /><p className="text-[11px] text-slate-500">Win Streak</p></div>
          <p className="text-2xl font-black leading-none text-slate-900">{hero.streak} <span className="text-sm font-medium text-slate-500">days</span></p>
          <div className="flex justify-between mt-2">
            {weekGrid.map((d, i) => (
              <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${d.done ? "bg-emerald-500 text-white" : d.future ? "bg-slate-100 text-slate-400" : "bg-slate-200 text-slate-500"}`}>
                {d.done ? "✓" : d.label}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Podium · Leaderboard · Achievements ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-5 p-5 relative overflow-hidden">
          <p className="relative flex items-center justify-center gap-2 text-amber-600 font-bold uppercase tracking-wider text-xs mb-6"><Crown className="h-4 w-4" /> Top 3 Champions · {PERIOD_LABELS[period]}</p>
          <div className="relative grid grid-cols-3 gap-2 items-end max-w-md mx-auto">
            {[podium[1], podium[0], podium[2]].map((r, i) => {
              if (!r) return <div key={i} />;
              const place = r.rank;
              const h = place === 1 ? "h-28" : place === 2 ? "h-20" : "h-16";
              const grad = place === 1 ? "from-amber-300 to-yellow-500" : place === 2 ? "from-slate-300 to-slate-400" : "from-orange-300 to-orange-500";
              const ring = place === 1 ? "ring-4 ring-amber-400 animate-glow" : place === 2 ? "ring-2 ring-slate-300" : "ring-2 ring-orange-300";
              return (
                <div key={r.name} className="flex flex-col items-center text-center">
                  <div className="relative mb-2">
                    {place === 1 && <Crown className="h-5 w-5 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-float" />}
                    <div className={`rounded-full ${ring}`}><GAvatar name={r.name} size="lg" /></div>
                    <span className="absolute -bottom-1 -right-1 text-base">{MEDALS[place - 1]}</span>
                  </div>
                  <p className="font-bold text-sm truncate max-w-[6rem] text-slate-900">{r.name.split(" ")[0]}</p>
                  <p className="text-[11px] font-bold text-slate-700">{r.points.toLocaleString()} Points</p>
                  <p className="text-[10px] text-slate-400">{formatCurrency(r.revenue)} Revenue</p>
                  <div className={`${h} ar-rise w-full rounded-t-xl mt-2 bg-gradient-to-t ${grad} flex items-center justify-center shadow-inner`} style={{ animationDelay: `${i * 0.12}s` }}>
                    <span className="text-3xl font-black text-white drop-shadow">{place}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-4 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-bold text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Leaderboard</p>
            <span className="text-[11px] text-brand font-semibold">View Full Leaderboard</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="text-left font-semibold px-3 py-2">Rank</th>
                <th className="text-left font-semibold px-1 py-2">Staff</th>
                <th className="text-right font-semibold px-2 py-2">Revenue</th>
                <th className="text-right font-semibold px-2 py-2">Points</th>
                <th className="text-right font-semibold px-3 py-2">Move</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r) => {
                const mine = r.name.toLowerCase() === myName.toLowerCase();
                const rc = r.rank === 1 ? "bg-amber-400" : r.rank === 2 ? "bg-slate-400" : r.rank === 3 ? "bg-orange-400" : "bg-slate-200 text-slate-600";
                return (
                  <tr key={r.name} className={`border-b border-slate-50 last:border-0 ${mine ? "bg-brand/5" : ""}`}>
                    <td className="px-3 py-2"><span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white ${rc}`}>{r.rank}</span></td>
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-2">
                        <GAvatar name={r.name} size="sm" />
                        <span className="font-medium text-slate-800 truncate">{r.name.split(" ")[0]}{mine && <span className="text-brand"> · You</span>}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">{formatCurrency(r.revenue)}</td>
                    <td className="px-2 py-2 text-right font-bold text-slate-900">{r.points}</td>
                    <td className="px-3 py-2 text-right"><Move m={moveOf(r)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card className="xl:col-span-3 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-bold text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-pink-500" /> Recent Achievements</p>
            <span className="text-[11px] text-brand font-semibold">View All</span>
          </div>
          <div className="divide-y divide-slate-50">
            {feed.length === 0 && <p className="text-xs text-slate-400 p-4">No activity yet.</p>}
            {feed.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 animate-slidein" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${BADGE_GRADS[i % BADGE_GRADS.length]} flex items-center justify-center shrink-0`}><Zap className="h-3.5 w-3.5 text-white" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-slate-800">{a.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{a.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{a.when}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Badges · Target · Points ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="flex items-center gap-2 font-bold text-sm"><Medal className="h-4 w-4 text-amber-500" /> Badges Earned</p>
            <span className="text-[11px] text-brand font-semibold">View All</span>
          </div>
          {hero.badges.length === 0 ? (
            <p className="text-xs text-slate-400">No badges yet — keep selling to unlock them!</p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {hero.badges.slice(0, 5).map((b, i) => (
                <div key={b.key} title={`${b.label} — ${b.desc}`} className="flex flex-col items-center gap-1">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${BADGE_GRADS[i % BADGE_GRADS.length]} flex items-center justify-center text-xl shadow`}>{b.icon}</div>
                  <span className="text-[9px] text-slate-500 text-center leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-2 font-bold text-sm mb-3"><Target className="h-4 w-4 text-emerald-500" /> {PERIOD_LABELS[period]} Target</p>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(hero.revenue)}</p>
              <p className="text-[11px] text-slate-500">Revenue Target {formatCurrency(target)}</p>
            </div>
            <span className={`text-lg font-black ${hero.targetPct >= 100 ? "text-emerald-600" : "text-amber-600"}`}>{hero.targetPct.toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${hero.targetPct >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`} style={{ width: `${Math.min(100, hero.targetPct)}%` }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">{hero.targetPct >= 100 ? "🎉 Target smashed!" : `${formatCurrency(Math.max(0, target - hero.revenue))} to go`}</p>
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-2 font-bold text-sm mb-2"><Coins className="h-4 w-4 text-amber-500" /> Points Breakdown</p>
          <div className="flex items-center gap-3">
            <div className="relative w-28 h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pb} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={2} stroke="none">
                    {pb.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black leading-none text-slate-900">{hero.points}</span>
                <span className="text-[9px] text-slate-400">Total Points</span>
              </div>
            </div>
            <div className="space-y-1 flex-1">
              {pb.map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
                  <span className="text-slate-600 flex-1">{e.name}</span>
                  <span className="font-bold text-slate-900">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Category leaders + Teams ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CatCard medal="🥇" title="Highest Revenue" row={leaders.revenue} value={leaders.revenue ? formatCurrency(leaders.revenue.revenue) : "—"} icon={IndianRupee} />
          <CatCard medal="🥈" title="Most Bookings" row={leaders.bookings} value={leaders.bookings ? `${leaders.bookings.bookings} bookings` : "—"} icon={Ticket} />
          <CatCard medal="🥉" title="Top Collections" row={leaders.collection} value={leaders.collection ? formatCurrency(leaders.collection.collection) : "—"} icon={Wallet} />
        </div>
        <Card className="lg:col-span-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="flex items-center gap-2 font-bold text-sm"><Users className="h-4 w-4 text-violet-500" /> Top Teams · This Week</p>
            <span className="text-[11px] text-brand font-semibold">View All</span>
          </div>
          {teams.length === 0 ? <p className="text-xs text-slate-400">No teams yet.</p> : (
            <div className="space-y-3">
              {teams.slice(0, 3).map((t) => (
                <div key={t.team} className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-400 w-4">{t.rank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 flex items-center gap-1 truncate">{t.rank === 1 && <Trophy className="h-3 w-3 text-amber-500" />}{t.team}</span>
                      <span className="text-slate-500">{formatCurrency(t.revenue)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${(t.points / (teams[0].points || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <Trophy className={`h-4 w-4 ${t.rank === 1 ? "text-amber-500" : t.rank === 2 ? "text-slate-400" : "text-orange-400"}`} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5 p-4">
          <p className="flex items-center gap-2 font-bold text-sm mb-3"><TrendingUp className="h-4 w-4 text-emerald-500" /> Weekly Performance Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip {...tip} formatter={(v: any, n: any) => [n === "points" ? `${v} pts` : formatCurrency(Number(v)), n] as [string, string]} />
              <Line type="monotone" dataKey="revenue" stroke={C.rev} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="collection" stroke={C.col} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="points" stroke={C.conv} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center text-[10px] text-slate-500 mt-1">
            <Legend c={C.rev} l="Revenue" /><Legend c={C.col} l="Collection" /><Legend c={C.conv} l="Points" />
          </div>
        </Card>

        <Card className="lg:col-span-4 p-4">
          <p className="flex items-center gap-2 font-bold text-sm mb-3"><Award className="h-4 w-4 text-amber-500" /> Performance Comparison</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cmp} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="cat" tick={{ fontSize: 9, fill: AXIS }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 9, fill: AXIS }} axisLine={false} tickLine={false} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip {...tip} formatter={(v: any) => `${Number(v).toFixed(0)}%`} />
              <Bar dataKey="you" name={heroIsYou ? "You" : "Field"} fill={C.book} radius={[3, 3, 0, 0]} />
              <Bar dataKey="top" name="Top" fill={C.gold} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center text-[10px] text-slate-500 mt-1">
            <Legend c={C.book} l={heroIsYou ? "You" : "Field"} /><Legend c={C.gold} l="Top Performer" />
          </div>
        </Card>

        <Card className="lg:col-span-3 p-4">
          <p className="flex items-center gap-2 font-bold text-sm mb-3"><Users className="h-4 w-4 text-cyan-500" /> Performance Distribution</p>
          <div className="flex items-center gap-2">
            <div className="relative w-28 h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={3} stroke="none">
                    {dist.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black leading-none text-slate-900">{rows.length}</span>
                <span className="text-[9px] text-slate-400">Total Staff</span>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              {dist.map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
                  <span className="text-slate-600 flex-1">{e.name} Performers</span>
                  <span className="font-bold text-slate-900">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Badge legend ── */}
      <Card className="p-4">
        <p className="flex items-center gap-2 font-bold text-sm mb-3"><Medal className="h-4 w-4 text-amber-500" /> All Achievement Badges</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {ALL_BADGES.map((b, i) => (
            <div key={b.key} className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${BADGE_GRADS[i % BADGE_GRADS.length]} flex items-center justify-center text-base shrink-0`}>{b.icon}</div>
              <div><p className="text-xs font-semibold leading-tight text-slate-800">{b.label}</p><p className="text-[10px] text-slate-500 leading-tight">{b.desc}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Header({ period, setPeriod, tripId, setTripId, team, setTeam, trips, departments, range }: {
  period: Period; setPeriod: (p: Period) => void; tripId: string; setTripId: (v: string) => void;
  team: string; setTeam: (v: string) => void; trips: { id: string; tripName: string }[]; departments: string[]; range: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md animate-glow">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sales Championship</h1>
            <p className="text-slate-500 text-sm">Compete. Achieve. Win Together! · {range}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={tripId} onValueChange={setTripId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Trips" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Trips</SelectItem>{trips.map((t) => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Teams" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Teams</SelectItem>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${period === p ? "bg-gradient-to-r from-brand to-amber-500 text-white border-transparent shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, change, color, gid, series }: {
  icon: React.ElementType; label: string; value: string; change: number; color: string; gid: string; series: number[];
}) {
  const up = change >= 0;
  return (
    <Card className="p-3 overflow-hidden animate-pop">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1a`, color }}><Icon className="h-4 w-4" /></div>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
      <p className="text-lg font-black mt-1.5 leading-tight text-slate-900">{value}</p>
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(change).toFixed(1)}% <span className="text-slate-400 font-normal">vs last</span>
      </span>
      <div className="-mx-1 mt-1"><Spark data={series} gid={gid} color={color} /></div>
    </Card>
  );
}

function CatCard({ medal, title, row, value, icon: Icon }: { medal: string; title: string; row?: PerfRow; value: string; icon: React.ElementType }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-slate-500">{title}</p>
        <span className="text-lg">{medal}</span>
      </div>
      {row ? (
        <div className="flex items-center gap-2.5">
          <GAvatar name={row.name} />
          <div className="min-w-0">
            <p className="font-bold truncate text-sm text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1"><Icon className="h-3 w-3" />{value}</p>
          </div>
        </div>
      ) : <p className="text-xs text-slate-400 py-1.5">No data yet</p>}
    </Card>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>;
}
