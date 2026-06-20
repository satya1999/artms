import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChampionshipPanel from "@/components/ChampionshipPanel";
import {
  Plus, CreditCard, CheckCircle2, Clock, ArrowRight, MapPin, Ticket, Gift, Trophy
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  fully_paid: "bg-green-100 text-green-700",
  balance_due: "bg-yellow-100 text-yellow-700",
  tentative: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function StaffDashboard() {
  const { trips, bookings, payments } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");

  const today = new Date().toISOString().split("T")[0];

  const myBookings = useMemo(
    () => bookings.filter(b => b.collectedBy === user?.name),
    [bookings, user]
  );

  const todayPayments = payments.filter(
    p => p.date === today && p.collectedBy === user?.name
  );

  const stats = useMemo(() => {
    const totalCoins = myBookings.reduce((s, b) => s + (b.rewardCoins ?? 0), 0);
    return {
      totalBookings: myBookings.filter(b => b.status !== "cancelled").length,
      totalCollected: myBookings.reduce((s, b) => s + b.advancePaid, 0),
      todayCollected: todayPayments.reduce((s, p) => s + p.amount, 0),
      pendingFromMine: myBookings.filter(b => b.pendingAmount > 0 && b.status !== "cancelled").length,
      totalCoins,
      coinsRupee: totalCoins / 100,
    };
  }, [myBookings, todayPayments]);

  const publishedTrips = trips.filter(t => t.status === "published" || t.status === "active");

  const recentMyBookings = [...myBookings]
    .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
    .slice(0, 5);

  const coinBookings = useMemo(
    () => [...myBookings]
      .filter(b => (b.rewardCoins ?? 0) > 0)
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate)),
    [myBookings]
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Button size="lg" onClick={() => navigate("/book")}>
          <Plus className="h-5 w-5 mr-1" /> New Booking
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="championship" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Championship
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-1.5">
            <Gift className="h-3.5 w-3.5" /> My Rewards
            {stats.totalCoins > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {stats.totalCoins.toLocaleString()}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── HOME TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="home" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Ticket className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Today's Collection</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.todayCollected)}</p>
                <p className="text-xs text-muted-foreground">{todayPayments.length} payment(s)</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">My Bookings</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
                <p className="text-xs text-muted-foreground">Total passengers</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground">Total Collected</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.totalCollected)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <p className="text-xs text-muted-foreground">Pending Balance</p>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingFromMine}</p>
                <p className="text-xs text-muted-foreground">passengers owe balance</p>
              </CardContent>
            </Card>
            <Card
              className="border-l-4 border-l-amber-400 cursor-pointer hover:shadow-md transition-shadow col-span-2 md:col-span-1"
              onClick={() => setTab("rewards")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground">My Coin Balance</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.totalCoins.toLocaleString()} 🪙</p>
                <p className="text-xs text-muted-foreground">= ₹{stats.coinsRupee.toFixed(2)} · {coinBookings.length} eligible bookings</p>
              </CardContent>
            </Card>
          </div>

          {/* Available Trips */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Available Trips for Booking</h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/trips")}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {publishedTrips.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No trips available for booking right now. Admin will publish trips soon.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedTrips.map((trip) => {
                  const booked = bookings.filter(b => b.tripId === trip.id && b.status !== "cancelled").length;
                  const available = trip.totalSeats - booked;
                  const pct = Math.round((booked / trip.totalSeats) * 100);
                  const isFull = available === 0;
                  return (
                    <Card key={trip.id} className={`${isFull ? "opacity-60" : "hover:shadow-md transition-shadow"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{trip.tripName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {trip.departurePoint} → {trip.destination}
                            </p>
                          </div>
                          <Badge className={isFull ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                            {isFull ? "Full" : `${available} left`}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>📅 {formatDate(trip.startDate)} → {formatDate(trip.endDate)}</p>
                          <p>💺 Seat: {formatCurrency(trip.seatPrice)}{trip.sleeperSeats > 0 ? ` · Sleeper: ${formatCurrency(trip.sleeperPrice)}` : ""}</p>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Occupancy</span>
                            <span>{booked}/{trip.totalSeats} ({pct}%)</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <Button
                          className="w-full mt-3" size="sm"
                          disabled={isFull}
                          onClick={() => navigate("/book", { state: { tripId: trip.id } })}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Book Seat
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Recent Bookings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">My Recent Bookings</h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/bookings")}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <Card>
              {recentMyBookings.length === 0 ? (
                <CardContent className="p-6 text-center text-muted-foreground text-sm">You haven't made any bookings yet</CardContent>
              ) : (
                <div className="divide-y">
                  {recentMyBookings.map(b => (
                    <div key={b.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{b.passengerName}</p>
                        <p className="text-xs text-muted-foreground">{b.tripName} · Seat {b.seatNumber} · {formatDate(b.bookingDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(b.finalAmount)}</p>
                        <div className="flex items-center gap-1 justify-end">
                          <Badge className={`text-xs ${STATUS_COLORS[b.status] ?? "bg-slate-100"}`}>
                            {b.status.replace("_", " ")}
                          </Badge>
                          {b.pendingAmount > 0 && (
                            <span className="text-xs text-red-600">{formatCurrency(b.pendingAmount)} due</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── CHAMPIONSHIP TAB ─────────────────────────────────────────── */}
        <TabsContent value="championship" className="space-y-4 mt-4">
          <ChampionshipPanel myName={user?.name ?? ""} />
        </TabsContent>

        {/* ── REWARDS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="rewards" className="space-y-4 mt-4">
          {/* Coin wallet card */}
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white text-2xl shrink-0">
                  🪙
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">My Coin Wallet</p>
                  <p className="text-3xl font-black text-amber-700">{stats.totalCoins.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Rupee Value</p>
                  <p className="text-xl font-bold text-green-700">₹{stats.coinsRupee.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">100 coins = ₹1</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Earned From</p>
                  <p className="text-xl font-bold">{coinBookings.length}</p>
                  <p className="text-xs text-muted-foreground">bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-booking coin history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" /> Coin Earning History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {coinBookings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <Gift className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No coins earned yet. Record bookings to earn coins!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {coinBookings.map(b => (
                    <div key={b.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{b.passengerName}</p>
                        <p className="text-xs text-muted-foreground">{b.tripName} · {formatDate(b.bookingDate)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{b.id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-amber-600">+{(b.rewardCoins ?? 0).toLocaleString()} 🪙</p>
                        <p className="text-xs text-green-700">= ₹{((b.rewardCoins ?? 0) / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
