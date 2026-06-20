import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

export default function ProfitLoss() {
  const { trips, bookings, payments, expenses, salaries } = useData();
  const [selectedTrip, setSelectedTrip] = useState("all");

  const tripPL = useMemo(() => {
    return trips.map((trip) => {
      const tripBookings = bookings.filter(b => b.tripId === trip.id && b.status !== "cancelled");
      const revenue = payments.filter(p => {
        const booking = bookings.find(b => b.id === p.bookingId);
        return booking?.tripId === trip.id;
      }).reduce((s, p) => s + p.amount, 0);

      const tripExpenses = expenses.filter(e => e.tripId === trip.id);
      const expenseTotal = tripExpenses.reduce((s, e) => s + e.amount, 0);

      const byCategory: Record<string, number> = {};
      tripExpenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

      const totalSeats = tripBookings.length;
      const expectedRevenue = tripBookings.reduce((s, b) => s + b.finalAmount, 0);
      const pendingRevenue = tripBookings.reduce((s, b) => s + b.pendingAmount, 0);
      const profit = revenue - expenseTotal;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";

      return {
        trip, revenue, expenseTotal, profit, profitMargin,
        totalSeats, expectedRevenue, pendingRevenue, byCategory,
      };
    });
  }, [trips, bookings, payments, expenses]);

  const overall = useMemo(() => {
    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
    const totalTripExpenses = expenses.filter(e => e.type === "trip").reduce((s, e) => s + e.amount, 0);
    const totalCompanyExpenses = expenses.filter(e => e.type === "company").reduce((s, e) => s + e.amount, 0);
    const totalSalaries = salaries.filter(s => s.status === "paid").reduce((s, r) => s + r.netSalary, 0);
    const totalExpenses = totalTripExpenses + totalCompanyExpenses + totalSalaries;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const pendingRevenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.pendingAmount, 0);
    return { totalRevenue, totalTripExpenses, totalCompanyExpenses, totalSalaries, totalExpenses, netProfit, profitMargin, pendingRevenue };
  }, [payments, expenses, salaries, bookings]);

  const filteredPL = selectedTrip === "all" ? tripPL : tripPL.filter(t => t.trip.id === selectedTrip);

  const chartData = tripPL.map(t => ({
    name: t.trip.tripName.length > 15 ? t.trip.tripName.substring(0, 15) + "..." : t.trip.tripName,
    revenue: t.revenue,
    expenses: t.expenseTotal,
    profit: t.profit,
  }));

  const expenseBreakdown = [
    { category: "Trip Expenses", amount: overall.totalTripExpenses, pct: overall.totalExpenses > 0 ? ((overall.totalTripExpenses / overall.totalExpenses) * 100).toFixed(0) : 0 },
    { category: "Company Expenses", amount: overall.totalCompanyExpenses, pct: overall.totalExpenses > 0 ? ((overall.totalCompanyExpenses / overall.totalExpenses) * 100).toFixed(0) : 0 },
    { category: "Salaries", amount: overall.totalSalaries, pct: overall.totalExpenses > 0 ? ((overall.totalSalaries / overall.totalExpenses) * 100).toFixed(0) : 0 },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit & Loss Report</h1>
        <p className="text-muted-foreground text-sm">Financial performance overview</p>
      </div>

      {/* Overall P&L */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(overall.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">+{formatCurrency(overall.pendingRevenue)} pending</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(overall.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${overall.netProfit >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Net Profit</p>
            </div>
            <p className={`text-2xl font-bold ${overall.netProfit >= 0 ? "text-blue-700" : "text-orange-600"}`}>
              {formatCurrency(overall.netProfit)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Profit Margin</p>
            </div>
            <p className={`text-2xl font-bold ${+overall.profitMargin >= 0 ? "text-purple-700" : "text-orange-600"}`}>
              {overall.profitMargin}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Trip-wise Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 mt-2">
              {expenseBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.category}</span>
                    <span className="font-medium">{formatCurrency(item.amount)} ({item.pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trip Expenses</span>
                <span className="text-red-600">{formatCurrency(overall.totalTripExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company Expenses</span>
                <span className="text-red-600">{formatCurrency(overall.totalCompanyExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salaries (Paid)</span>
                <span className="text-red-600">{formatCurrency(overall.totalSalaries)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Expenses</span>
                <span className="text-red-700">{formatCurrency(overall.totalExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip-wise P&L */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Trip-wise P&L</CardTitle>
          <Select value={selectedTrip} onValueChange={setSelectedTrip}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All Trips" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trips</SelectItem>
              {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <div className="overflow-x-auto rounded-b-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip</TableHead>
              <TableHead>Passengers</TableHead>
              <TableHead>Revenue Collected</TableHead>
              <TableHead>Pending Revenue</TableHead>
              <TableHead>Trip Expenses</TableHead>
              <TableHead>Net Profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPL.map(({ trip, revenue, expenseTotal, profit, profitMargin, totalSeats, pendingRevenue }) => (
              <TableRow key={trip.id}>
                <TableCell>
                  <p className="font-medium">{trip.tripName}</p>
                  <p className="text-xs text-muted-foreground">{trip.destination}</p>
                </TableCell>
                <TableCell className="text-sm">{totalSeats}</TableCell>
                <TableCell className="font-medium text-green-600">{formatCurrency(revenue)}</TableCell>
                <TableCell className="text-yellow-600">{formatCurrency(pendingRevenue)}</TableCell>
                <TableCell className="text-red-600">{formatCurrency(expenseTotal)}</TableCell>
                <TableCell className={`font-bold ${profit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  {formatCurrency(profit)}
                </TableCell>
                <TableCell>
                  <Badge className={+profitMargin >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {profitMargin}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={
                    trip.status === "completed" ? "bg-slate-100 text-slate-700" :
                    trip.status === "active" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }>{trip.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* P&L Summary Box */}
      <Card className="bg-slate-900 text-white">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold mb-4">Consolidated P&L Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-medium">INCOME</p>
              <div className="flex justify-between"><span className="text-slate-300">Total Collections</span><span className="text-green-400 font-semibold">{formatCurrency(overall.totalRevenue)}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">Pending Receivables</span><span className="text-yellow-400">{formatCurrency(overall.pendingRevenue)}</span></div>
              <div className="flex justify-between font-bold border-t border-slate-700 pt-2">
                <span>Total Income (Collected)</span><span className="text-green-400">{formatCurrency(overall.totalRevenue)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-medium">EXPENSES</p>
              <div className="flex justify-between"><span className="text-slate-300">Trip Expenses</span><span className="text-red-400">{formatCurrency(overall.totalTripExpenses)}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">Company Expenses</span><span className="text-red-400">{formatCurrency(overall.totalCompanyExpenses)}</span></div>
              <div className="flex justify-between"><span className="text-slate-300">Salaries</span><span className="text-red-400">{formatCurrency(overall.totalSalaries)}</span></div>
              <div className="flex justify-between font-bold border-t border-slate-700 pt-2">
                <span>Total Expenses</span><span className="text-red-400">{formatCurrency(overall.totalExpenses)}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
            <span className="text-xl font-bold">NET PROFIT</span>
            <span className={`text-3xl font-bold ${overall.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(overall.netProfit)} ({overall.profitMargin}%)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
