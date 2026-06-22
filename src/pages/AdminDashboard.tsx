import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Bus, BookOpen, CreditCard,
  Wallet, AlertCircle, CheckCircle2, Clock, Plus, BarChart3, ArrowRight, MapPin,
  Coins, Banknote, XCircle, Hourglass
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TripCountdown } from "@/components/TripCountdown";
import { toast } from "sonner";
import type { CoinWithdrawal } from "@/types";

const WD_METHOD_LABELS: Record<CoinWithdrawal["method"], string> = {
  upi: "UPI", bank_transfer: "Bank Transfer", cash: "Cash",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  fully_paid: "bg-green-100 text-green-700",
  balance_due: "bg-yellow-100 text-yellow-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const { trips, bookings, payments, expenses, cashEntries, employees, salaries, coinWithdrawals, setCoinWithdrawals } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const pendingWithdrawals = useMemo(
    () => [...coinWithdrawals]
      .filter(w => w.status === "pending" || w.status === "approved")
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
    [coinWithdrawals]
  );

  function setWithdrawalStatus(w: CoinWithdrawal, status: CoinWithdrawal["status"]) {
    setCoinWithdrawals(prev => prev.map(x =>
      x.id === w.id
        ? { ...x, status, processedAt: new Date().toISOString(), processedBy: user?.name }
        : x
    ));
    const verb = status === "approved" ? "approved" : status === "paid" ? "marked paid" : "rejected";
    toast.success(`Withdrawal of ${w.coins.toLocaleString()} coins (₹${w.rupeeValue.toFixed(2)}) for ${w.staffName} ${verb}`);
  }

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalSalaries = salaries.filter(s => s.status === "paid").reduce((s, r) => s + r.netSalary, 0);
    const pendingCollection = bookings.reduce((s, b) => b.status !== "cancelled" ? s + b.pendingAmount : s, 0);
    const activeTrips = trips.filter(t => t.status === "published" || t.status === "active").length;
    const cashIn = cashEntries.filter(c => c.type === "in").reduce((s, c) => s + c.amount, 0);
    const cashOut = cashEntries.filter(c => c.type === "out").reduce((s, c) => s + c.amount, 0);
    const netProfit = totalRevenue - totalExpenses - totalSalaries;
    return { totalRevenue, totalExpenses, pendingCollection, activeTrips, cashBalance: cashIn - cashOut, netProfit };
  }, [trips, bookings, payments, expenses, cashEntries, salaries]);

  // Real last-6-months revenue (from payments) vs expenses — derived, not seeded
  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleString("en-IN", { month: "short" }),
        revenue: 0,
        expenses: 0,
      };
    });
    const idx = new Map(months.map((m, i) => [m.key, i]));
    payments.forEach(p => {
      const i = idx.get((p.date || "").slice(0, 7));
      if (i !== undefined) months[i].revenue += p.amount;
    });
    expenses.forEach(e => {
      const i = idx.get((e.date || "").slice(0, 7));
      if (i !== undefined) months[i].expenses += e.amount;
    });
    return months;
  }, [payments, expenses]);

  const recentBookings = [...bookings].sort((a, b) => b.bookingDate.localeCompare(a.bookingDate)).slice(0, 6);
  const publishedTrips = trips.filter(t => t.status === "published" || t.status === "active");

  // Staff performance summary
  const staffPerf = useMemo(() => {
    const map: Record<string, { bookings: number; collected: number }> = {};
    bookings.filter(b => b.status !== "cancelled").forEach(b => {
      if (!map[b.collectedBy]) map[b.collectedBy] = { bookings: 0, collected: 0 };
      map[b.collectedBy].bookings++;
      map[b.collectedBy].collected += b.advancePaid;
    });
    return Object.entries(map).sort((a, b) => b[1].collected - a[1].collected).slice(0, 4);
  }, [bookings]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {user?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/trips")}><Bus className="h-4 w-4 mr-1" /> Manage Trips</Button>
          <Button onClick={() => navigate("/book")}><Plus className="h-4 w-4 mr-1" /> New Booking</Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "bg-green-100 text-green-600" },
          { label: "Pending Collection", value: formatCurrency(stats.pendingCollection), icon: AlertCircle, color: "bg-yellow-100 text-yellow-600" },
          { label: "Total Expenses", value: formatCurrency(stats.totalExpenses), icon: TrendingDown, color: "bg-red-100 text-red-600" },
          { label: "Net Profit", value: formatCurrency(stats.netProfit), icon: BarChart3, color: stats.netProfit >= 0 ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600" },
          { label: "Cash Balance", value: formatCurrency(stats.cashBalance), icon: Wallet, color: "bg-purple-100 text-purple-600" },
          { label: "Active Trips", value: String(stats.activeTrips), icon: Bus, color: "bg-slate-100 text-slate-600" },
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                <Legend iconSize={10} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Performance mini */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Staff Performance (Collections)</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/performance")}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {staffPerf.map(([name, perf], i) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground">{perf.bookings} bookings · {formatCurrency(perf.collected)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (perf.collected / (staffPerf[0][1].collected || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {staffPerf.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Trip-wise seats & live countdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2"><Bus className="h-4 w-4 text-brand" /> Trips · Seats & Countdown</h2>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/trips")}>
            Manage Trips <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {publishedTrips.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No published or active trips right now.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...publishedTrips].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((t) => {
              const booked = bookings.filter(b => b.tripId === t.id && b.status !== "cancelled").length;
              const remaining = Math.max(0, t.totalSeats - booked);
              const pct = t.totalSeats > 0 ? Math.round((booked / t.totalSeats) * 100) : 0;
              const isFull = remaining === 0;
              return (
                <Card key={t.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.tripName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {t.departurePoint} → {t.destination}
                        </p>
                      </div>
                      <Badge className={isFull ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                        {isFull ? "Full" : `${remaining} left`}
                      </Badge>
                    </div>

                    {/* Seats split */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-blue-50 py-2">
                        <p className="text-lg font-bold text-blue-700 leading-none">{booked}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Booked</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 py-2">
                        <p className="text-lg font-bold text-emerald-700 leading-none">{remaining}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Remaining</p>
                      </div>
                      <div className="rounded-lg bg-slate-100 py-2">
                        <p className="text-lg font-bold leading-none">{t.totalSeats}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Total</p>
                      </div>
                    </div>

                    {/* Occupancy */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isFull ? "bg-red-500" : "bg-brand"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Countdown */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Departs {formatDate(t.startDate)}</span>
                      </div>
                      <TripCountdown date={t.startDate} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Coin Withdrawal Requests */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" /> Coin Withdrawal Requests
            {pendingWithdrawals.filter(w => w.status === "pending").length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {pendingWithdrawals.filter(w => w.status === "pending").length} new
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingWithdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No pending withdrawal requests.</p>
          ) : (
            <div className="divide-y">
              {pendingWithdrawals.map(w => (
                <div key={w.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {w.staffName} · <span className="text-amber-600">{w.coins.toLocaleString()} 🪙</span>
                      <span className="text-green-700"> = ₹{w.rupeeValue.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {WD_METHOD_LABELS[w.method]}{w.accountDetails ? ` · ${w.accountDetails}` : ""} · {formatDate(w.requestedAt.slice(0, 10))}
                      {w.notes ? ` · "${w.notes}"` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {w.status === "pending" ? (
                      <>
                        <Badge className="bg-amber-100 text-amber-700 gap-1"><Hourglass className="h-3 w-3" /> Pending</Badge>
                        <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setWithdrawalStatus(w, "rejected")}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700"
                          onClick={() => setWithdrawalStatus(w, "approved")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge className="bg-blue-100 text-blue-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>
                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700"
                          onClick={() => setWithdrawalStatus(w, "paid")}>
                          <Banknote className="h-3.5 w-3.5 mr-1" /> Mark Paid
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent Bookings</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/bookings")}>
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {recentBookings.map((b) => (
            <div key={b.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{b.passengerName}</p>
                <p className="text-xs text-muted-foreground">{b.tripName} · Seat {b.seatNumber} · {b.collectedBy}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatCurrency(b.finalAmount)}</p>
                <Badge className={`text-xs ${STATUS_COLORS[b.status] ?? "bg-slate-100"}`}>
                  {b.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          ))}
          {recentBookings.length === 0 && <p className="text-sm text-muted-foreground py-2">No bookings yet</p>}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
            <div>
              <p className="text-lg font-bold">{bookings.filter(b => b.status === "fully_paid").length}</p>
              <p className="text-xs text-muted-foreground">Fully Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-7 w-7 text-yellow-500" />
            <div>
              <p className="text-lg font-bold">{bookings.filter(b => b.pendingAmount > 0 && b.status !== "cancelled").length}</p>
              <p className="text-xs text-muted-foreground">Balance Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{bookings.filter(b => b.status !== "cancelled").length}</p>
              <p className="text-xs text-muted-foreground">Total Passengers</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
