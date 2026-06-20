import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { formatCurrency } from "@/lib/utils";
import { computeLeaderboard, avatarColor, levelFor } from "@/lib/championship";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Flame, ArrowRight, IndianRupee, Ticket, Wallet } from "lucide-react";

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "w-14 h-14 text-xl" : "w-9 h-9 text-sm";
  return (
    <div className={`${cls} ${avatarColor(name)} rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ChampionshipWidget() {
  const { bookings, staff, monthlyTarget } = useData();
  const navigate = useNavigate();

  const { rows, leaders } = useMemo(
    () => computeLeaderboard(bookings, staff, { period: "monthly", target: monthlyTarget }),
    [bookings, staff, monthlyTarget],
  );

  const champ = leaders.champion;

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#2a0a08] via-[#1a1a1a] to-black text-white">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-300">
            <Trophy className="h-5 w-5" />
            <p className="font-bold uppercase tracking-wide text-xs">Sales Championship · This Month</p>
          </div>
          <Button size="sm" variant="ghost" className="text-amber-200 hover:text-white hover:bg-white/10 h-8" onClick={() => navigate("/championship")}>
            Leaderboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {!champ ? (
          <div className="py-6 text-center text-slate-300 text-sm">
            No bookings yet this month — the championship begins with your first sale. 🏁
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Champion */}
            <div className="lg:col-span-4 flex items-center gap-3 rounded-xl bg-white/5 border border-amber-400/30 p-3">
              <div className="relative">
                <Crown className="h-5 w-5 text-amber-400 absolute -top-3 left-1/2 -translate-x-1/2" />
                <div className="ring-2 ring-amber-400 rounded-full"><Avatar name={champ.name} size="lg" /></div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-amber-300 font-bold">Champion of the Month</p>
                <p className="font-bold truncate">{champ.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-amber-300">{champ.points.toLocaleString()} pts</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${levelFor(champ.points).color}`}>{levelFor(champ.points).level}</span>
                  {champ.streak >= 3 && <span className="flex items-center gap-0.5 text-[10px] text-orange-300 font-bold"><Flame className="h-3 w-3" />{champ.streak}</span>}
                </div>
              </div>
            </div>

            {/* Category leaders */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PodiumMini medal="🥇" label="Highest Revenue" name={leaders.revenue?.name}
                value={leaders.revenue ? formatCurrency(leaders.revenue.revenue) : "—"} icon={IndianRupee} />
              <PodiumMini medal="🥈" label="Most Bookings" name={leaders.bookings?.name}
                value={leaders.bookings ? `${leaders.bookings.bookings}` : "—"} icon={Ticket} />
              <PodiumMini medal="🥉" label="Top Collections" name={leaders.collection?.name}
                value={leaders.collection ? formatCurrency(leaders.collection.collection) : "—"} icon={Wallet} />
            </div>
          </div>
        )}

        {champ && rows.length > 1 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Chasing the crown:</span>
            {rows.slice(1, 4).map((r) => (
              <span key={r.name} className="text-slate-200">#{r.rank} {r.name.split(" ")[0]} ({r.points})</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PodiumMini({ medal, label, name, value, icon: Icon }: {
  medal: string; label: string; name?: string; value: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
        <span>{medal}</span>
      </div>
      {name ? (
        <>
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-amber-200 flex items-center gap-1 mt-0.5"><Icon className="h-3 w-3" />{value}</p>
        </>
      ) : (
        <p className="text-xs text-slate-500 py-1">No data</p>
      )}
    </div>
  );
}
