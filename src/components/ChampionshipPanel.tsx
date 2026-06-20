import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { formatCurrency } from "@/lib/utils";
import { computeLeaderboard, avatarColor, levelFor, PERIOD_LABELS, type Period } from "@/lib/championship";
import { MyRankCard } from "@/components/MyRankCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, ArrowRight } from "lucide-react";

const PERIODS: Period[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function ChampionshipPanel({ myName }: { myName: string }) {
  const { bookings, staff, monthlyTarget } = useData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("monthly");

  const result = useMemo(
    () => computeLeaderboard(bookings, staff, { period, target: monthlyTarget }),
    [bookings, staff, period, monthlyTarget],
  );
  const target = monthlyTarget > 0 ? monthlyTarget : 150000;

  const me = result.rows.find((r) => r.name.toLowerCase() === myName.toLowerCase());
  const top = result.rows.slice(0, 6);
  const showMeSeparately = me && !top.some((r) => r.name === me.name);

  return (
    <div className="space-y-4">
      {/* Period pills */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              period === p ? "bg-brand text-white border-brand shadow-sm" : "bg-background hover:bg-muted border-border text-muted-foreground"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <MyRankCard result={result} myName={myName} target={target} />

      {/* Compact leaderboard */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> {PERIOD_LABELS[period]} Leaderboard</CardTitle>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate("/championship")}>
            Full board <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {result.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales recorded for {PERIOD_LABELS[period].toLowerCase()} yet.</p>
          ) : (
            <div className="divide-y">
              {top.map((r) => <Row key={r.name} r={r} mine={r.name === me?.name} target={target} />)}
              {showMeSeparately && (
                <>
                  <div className="text-center text-[11px] text-muted-foreground py-1">· · ·</div>
                  <Row r={me!} mine target={target} />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ r, mine, target }: { r: ReturnType<typeof computeLeaderboard>["rows"][number]; mine?: boolean; target: number }) {
  const lvl = levelFor(r.points);
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${mine ? "bg-brand/5 ring-1 ring-inset ring-brand/20" : ""}`}>
      <span className="w-7 text-center text-base shrink-0">
        {r.rank <= 3 ? MEDALS[r.rank - 1] : <span className="text-xs font-bold text-muted-foreground">#{r.rank}</span>}
      </span>
      <div className={`w-9 h-9 ${avatarColor(r.name)} rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0`}>
        {r.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate">{r.name}{mine && <span className="text-brand"> · You</span>}</p>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${lvl.color}`}>{lvl.level}</span>
          {r.streak >= 3 && <span className="flex items-center gap-0.5 text-[10px] text-orange-600 font-bold"><Flame className="h-2.5 w-2.5" />{r.streak}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">{r.bookings} bookings · {formatCurrency(r.revenue)} · {((r.revenue / target) * 100).toFixed(0)}% target</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-black text-brand text-sm">{r.points.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">points</p>
      </div>
    </div>
  );
}
