import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, CheckCircle2, Clock, Users, BookOpen, Wallet, AlertCircle, Bus } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function StaffPerformance() {
  const { bookings, trips, staff } = useData();

  const activeTripIds = useMemo(
    () => new Set(trips.filter(t => t.status === "published" || t.status === "active").map(t => t.id)),
    [trips]
  );

  const staffStats = useMemo(() => {
    const map: Record<string, {
      name: string;
      staffId: string;
      totalBookings: number;
      confirmedBookings: number;
      cancelledBookings: number;
      totalRevenue: number;
      totalAdvance: number;
      pendingCollection: number;
      fullyPaid: number;
      activeTrips: number;
      recentBookings: typeof bookings;
    }> = {};

    // Seed from staff roster so all staff appear even with 0 bookings
    staff.forEach(s => {
      map[s.name] = {
        name: s.name, staffId: s.id,
        totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0,
        totalRevenue: 0, totalAdvance: 0, pendingCollection: 0,
        fullyPaid: 0, activeTrips: 0, recentBookings: [],
      };
    });

    // Count active trips per staff (distinct trips with active status)
    const activeTripsByStaff: Record<string, Set<string>> = {};
    bookings.filter(b => b.status !== "cancelled" && activeTripIds.has(b.tripId)).forEach(b => {
      if (!activeTripsByStaff[b.collectedBy]) activeTripsByStaff[b.collectedBy] = new Set();
      activeTripsByStaff[b.collectedBy].add(b.tripId);
    });

    bookings.forEach(b => {
      const key = b.collectedBy;
      if (!map[key]) {
        map[key] = {
          name: key, staffId: b.staffId || "—",
          totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0,
          totalRevenue: 0, totalAdvance: 0, pendingCollection: 0,
          fullyPaid: 0, activeTrips: 0, recentBookings: [],
        };
      }
      const s = map[key];
      s.totalBookings++;
      if (b.status === "cancelled") {
        s.cancelledBookings++;
      } else {
        s.confirmedBookings++;
        s.totalRevenue += b.finalAmount;
        s.totalAdvance += b.advancePaid;
        s.pendingCollection += b.pendingAmount;
        if (b.status === "fully_paid" || b.status === "completed") s.fullyPaid++;
        s.recentBookings = [...s.recentBookings, b]
          .sort((a, bk) => bk.bookingDateTime.localeCompare(a.bookingDateTime))
          .slice(0, 5);
      }
    });

    // Assign active trip counts
    Object.entries(activeTripsByStaff).forEach(([name, tripSet]) => {
      if (map[name]) map[name].activeTrips = tripSet.size;
    });

    return Object.values(map).sort((a, b) => b.totalAdvance - a.totalAdvance);
  }, [bookings, staff, activeTripIds]);

  const totals = useMemo(() => ({
    bookings: staffStats.reduce((s, r) => s + r.confirmedBookings, 0),
    revenue: staffStats.reduce((s, r) => s + r.totalRevenue, 0),
    advance: staffStats.reduce((s, r) => s + r.totalAdvance, 0),
    pending: staffStats.reduce((s, r) => s + r.pendingCollection, 0),
  }), [staffStats]);

  const chartData = staffStats.map(s => ({
    name: s.name.split(" ")[0],
    "Total Revenue": s.totalRevenue,
    "Advance Collected": s.totalAdvance,
    "Pending": s.pendingCollection,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Performance</h1>
        <p className="text-muted-foreground text-sm">Booking and collection statistics per staff member</p>
      </div>

      {/* Company-wide totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Bookings", value: totals.bookings, icon: BookOpen, color: "bg-blue-100 text-blue-600" },
          { label: "Active Trips", value: activeTripIds.size, icon: Bus, color: "bg-slate-100 text-slate-600" },
          { label: "Total Revenue", value: formatCurrency(totals.revenue), icon: TrendingUp, color: "bg-green-100 text-green-600" },
          { label: "Total Advance Collected", value: formatCurrency(totals.advance), icon: Wallet, color: "bg-purple-100 text-purple-600" },
          { label: "Pending Collection", value: formatCurrency(totals.pending), icon: AlertCircle, color: "bg-yellow-100 text-yellow-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold leading-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue vs Collections by Staff</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                <Legend iconSize={10} />
                <Bar dataKey="Total Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Advance Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-staff cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {staffStats.map((s, i) => {
          const fullyPaidPct = s.confirmedBookings > 0 ? Math.round((s.fullyPaid / s.confirmedBookings) * 100) : 0;
          const collectionRate = s.totalRevenue > 0 ? Math.round((s.totalAdvance / s.totalRevenue) * 100) : 0;
          return (
            <Card key={s.name} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">ID: {s.staffId} · #{i + 1} by collection</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{s.confirmedBookings} bookings</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 4 key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Bookings", value: String(s.totalBookings), sub: `${s.cancelledBookings} cancelled`, color: "" },
                    { label: "Active Trips Assigned", value: String(s.activeTrips), sub: "currently active trips", color: "text-blue-600" },
                    { label: "Total Revenue", value: formatCurrency(s.totalRevenue), sub: "from confirmed bookings", color: "text-indigo-600" },
                    { label: "Advance Collected", value: formatCurrency(s.totalAdvance), sub: `${collectionRate}% of revenue`, color: "text-green-600" },
                    { label: "Pending Collection", value: formatCurrency(s.pendingCollection), sub: `${s.confirmedBookings - s.fullyPaid} with balance`, color: s.pendingCollection > 0 ? "text-yellow-600" : "text-green-600" },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-base font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Collection rate</span>
                      <span className="font-medium">{collectionRate}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${collectionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Fully paid rate</span>
                      <span className="font-medium">{fullyPaidPct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${fullyPaidPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Recent bookings */}
                {s.recentBookings.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Bookings</p>
                    <div className="space-y-1">
                      {s.recentBookings.map(b => (
                        <div key={b.id} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-medium text-slate-800">{b.passengerName}</span>
                            <span className="text-muted-foreground ml-1.5">· {b.tripName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-green-600 font-medium">{formatCurrency(b.advancePaid)}</span>
                            {b.pendingAmount > 0 && (
                              <span className="text-yellow-600">+{formatCurrency(b.pendingAmount)} due</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {staffStats.length === 0 && (
          <div className="col-span-2 text-center py-16 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No booking data available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
