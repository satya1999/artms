import { type LeaderboardResult, levelFor, avatarColor } from "@/lib/championship";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flame, Target, Ticket, Wallet, Percent, Coins, ChevronUp } from "lucide-react";

function MiniBar({ pct, className = "bg-amber-400" }: { pct: number; className?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function MyRankCard({ result, myName, target }: { result: LeaderboardResult; myName: string; target: number }) {
  const me = result.rows.find((r) => r.name.toLowerCase() === myName.toLowerCase());
  const total = result.rows.length;

  if (!me) {
    return (
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#9d174d] text-white">
        <CardContent className="p-6 text-center space-y-2">
          <Trophy className="h-10 w-10 mx-auto text-amber-400/70" />
          <p className="font-bold text-lg">You're not on the board yet</p>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            Record a booking this period to enter the championship and start earning points, levels and badges.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lvl = levelFor(me.points);
  const above = me.rank > 1 ? result.rows[me.rank - 2] : null;
  const gap = above ? Math.max(0, above.points - me.points) + 1 : 0;
  const topPct = Math.max(1, Math.round((me.rank / total) * 100));
  const nextLevelPct = lvl.next ? Math.min(100, (me.points / lvl.next) * 100) : 100;
  const rankToTopPct = above ? Math.min(100, (me.points / (above.points || 1)) * 100) : 100;

  const stats = [
    { icon: Ticket, label: "Bookings", value: String(me.bookings) },
    { icon: Trophy, label: "Revenue", value: formatCurrency(me.revenue) },
    { icon: Wallet, label: "Collection", value: formatCurrency(me.collection) },
    { icon: Percent, label: "Conversion", value: `${me.conversionRate.toFixed(0)}%` },
    { icon: Percent, label: "Recovery", value: `${me.recoveryRate.toFixed(0)}%` },
    { icon: Coins, label: "Coins", value: me.coins.toLocaleString() },
  ];

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#9d174d] text-white">
      <CardContent className="p-5 sm:p-6">
        {/* Top row: identity + rank */}
        <div className="flex items-center gap-4">
          <div className={`relative ${me.rank === 1 ? "ring-4 ring-amber-400" : "ring-2 ring-white/20"} rounded-full`}>
            <div className={`w-16 h-16 ${avatarColor(me.name)} rounded-full flex items-center justify-center text-2xl font-bold shadow-lg`}>
              {me.name.charAt(0).toUpperCase()}
            </div>
            {me.rank === 1 && <span className="absolute -top-2 -right-1 text-xl">👑</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Your Standing</p>
            <p className="text-lg font-bold truncate">{me.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${lvl.color}`}>{lvl.level}</span>
              {me.streak >= 3 && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-300"><Flame className="h-3 w-3" />{me.streak}-day streak</span>
              )}
              {me.badges.slice(0, 5).map((b) => <span key={b.key} title={`${b.label} — ${b.desc}`} className="text-sm">{b.icon}</span>)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black leading-none text-amber-300">#{me.rank}</p>
            <p className="text-[11px] text-slate-400">of {total} · Top {topPct}%</p>
            <p className="text-xs font-bold mt-1">{me.points.toLocaleString()} pts</p>
          </div>
        </div>

        {/* Progress bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <span className="flex items-center gap-1"><ChevronUp className="h-3 w-3" />Next rank</span>
              <span>{above ? `${gap} pts to #${me.rank - 1}` : "🏆 You're #1"}</span>
            </div>
            <MiniBar pct={rankToTopPct} className="bg-gradient-to-r from-amber-400 to-orange-500" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <span>Next level</span>
              <span>{lvl.next ? `${lvl.level} → ${lvl.next} pts` : "Max level 🏅"}</span>
            </div>
            <MiniBar pct={nextLevelPct} className="bg-gradient-to-r from-cyan-400 to-sky-500" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <span className="flex items-center gap-1"><Target className="h-3 w-3" />Target</span>
              <span>{me.targetPct.toFixed(0)}% of {formatCurrency(target)}</span>
            </div>
            <MiniBar pct={me.targetPct} className={me.targetPct >= 100 ? "bg-green-400" : "bg-gradient-to-r from-rose-400 to-red-500"} />
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 text-center">
              <s.icon className="h-3.5 w-3.5 mx-auto text-slate-400 mb-1" />
              <p className="text-sm font-bold leading-tight truncate">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
