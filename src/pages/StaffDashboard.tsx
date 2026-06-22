import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ChampionshipPanel from "@/components/ChampionshipPanel";
import { toast } from "sonner";
import type { CoinWithdrawal, CoinWithdrawalMethod } from "@/types";
import {
  Plus, CreditCard, CheckCircle2, Clock, ArrowRight, MapPin, Ticket, Gift, Trophy,
  Coins, Wallet, Banknote, Hourglass, XCircle, History
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  fully_paid: "bg-green-100 text-green-700",
  balance_due: "bg-yellow-100 text-yellow-700",
  tentative: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

const WITHDRAWAL_STATUS_META: Record<CoinWithdrawal["status"], { label: string; cls: string; icon: typeof Clock }> = {
  pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700",   icon: Hourglass },
  approved: { label: "Approved", cls: "bg-blue-100 text-blue-700",     icon: CheckCircle2 },
  paid:     { label: "Paid",     cls: "bg-green-100 text-green-700",    icon: Banknote },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700",       icon: XCircle },
};

const METHOD_LABELS: Record<CoinWithdrawalMethod, string> = {
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
};

/** Min coins required to request a withdrawal (= ₹10) */
const MIN_WITHDRAWAL_COINS = 1000;

export default function StaffDashboard() {
  const { trips, bookings, payments, coinWithdrawals, setCoinWithdrawals } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");

  // ── Withdrawal request dialog state ──────────────────────────────────────
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [wdCoins, setWdCoins] = useState("");
  const [wdMethod, setWdMethod] = useState<CoinWithdrawalMethod>("upi");
  const [wdAccount, setWdAccount] = useState("");
  const [wdNotes, setWdNotes] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const myBookings = useMemo(
    () => bookings.filter(b => b.collectedBy === user?.name),
    [bookings, user]
  );

  const myWithdrawals = useMemo(
    () => [...coinWithdrawals]
      .filter(w => w.staffName === user?.name)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [coinWithdrawals, user]
  );

  const todayPayments = payments.filter(
    p => p.date === today && p.collectedBy === user?.name
  );

  const stats = useMemo(() => {
    const totalCoins = myBookings.reduce((s, b) => s + (b.rewardCoins ?? 0), 0);
    // Coins locked by withdrawals that aren't rejected (pending / approved / paid)
    const lockedCoins = myWithdrawals
      .filter(w => w.status !== "rejected")
      .reduce((s, w) => s + w.coins, 0);
    const availableCoins = Math.max(0, totalCoins - lockedCoins);
    return {
      totalBookings: myBookings.filter(b => b.status !== "cancelled").length,
      totalCollected: myBookings.reduce((s, b) => s + b.advancePaid, 0),
      todayCollected: todayPayments.reduce((s, p) => s + p.amount, 0),
      pendingFromMine: myBookings.filter(b => b.pendingAmount > 0 && b.status !== "cancelled").length,
      totalCoins,
      coinsRupee: totalCoins / 100,
      lockedCoins,
      availableCoins,
      availableRupee: availableCoins / 100,
    };
  }, [myBookings, myWithdrawals, todayPayments]);

  function openWithdraw() {
    setWdCoins(String(stats.availableCoins));
    setWdMethod("upi");
    setWdAccount("");
    setWdNotes("");
    setWithdrawOpen(true);
  }

  function submitWithdrawal() {
    const coins = Math.floor(Number(wdCoins));
    if (!Number.isFinite(coins) || coins <= 0) {
      toast.error("Enter a valid number of coins to withdraw");
      return;
    }
    if (coins < MIN_WITHDRAWAL_COINS) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL_COINS.toLocaleString()} coins (₹${MIN_WITHDRAWAL_COINS / 100})`);
      return;
    }
    if (coins > stats.availableCoins) {
      toast.error(`You only have ${stats.availableCoins.toLocaleString()} coins available`);
      return;
    }
    if (!wdAccount.trim()) {
      toast.error(wdMethod === "cash" ? "Add a note for the cash payout" : "Enter your payout account details");
      return;
    }
    const record: CoinWithdrawal = {
      id: generateId("WD"),
      staffId: user?.id,
      staffName: user?.name ?? "",
      coins,
      rupeeValue: coins / 100,
      method: wdMethod,
      accountDetails: wdAccount.trim(),
      status: "pending",
      requestedAt: new Date().toISOString(),
      notes: wdNotes.trim() || undefined,
    };
    setCoinWithdrawals(prev => [...prev, record]);
    setWithdrawOpen(false);
    toast.success(`Withdrawal request for ${coins.toLocaleString()} coins (₹${(coins / 100).toFixed(2)}) submitted for approval`);
  }

  function cancelWithdrawal(w: CoinWithdrawal) {
    setCoinWithdrawals(prev => prev.filter(x => x.id !== w.id));
    toast.success("Withdrawal request cancelled");
  }

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
                  <Coins className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground">My Coin Balance</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.totalCoins.toLocaleString()} 🪙</p>
                <p className="text-xs text-muted-foreground">
                  {stats.availableCoins.toLocaleString()} available · ₹{stats.availableRupee.toFixed(2)}
                </p>
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
          {/* Coin wallet — refined hero card */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="relative bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white">
              {/* decorative coins */}
              <Coins className="absolute -right-6 -top-6 h-32 w-32 text-white/10 rotate-12" />
              <Coins className="absolute right-20 bottom-2 h-16 w-16 text-white/10 -rotate-12" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/30">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">Available to Withdraw</p>
                    <p className="text-4xl font-black leading-none mt-0.5">
                      {stats.availableCoins.toLocaleString()}
                      <span className="text-lg font-semibold text-white/80 ml-1.5">coins</span>
                    </p>
                    <p className="text-sm text-white/90 mt-1 font-medium">≈ ₹{stats.availableRupee.toFixed(2)}</p>
                  </div>
                </div>

                <Button
                  onClick={openWithdraw}
                  disabled={stats.availableCoins < MIN_WITHDRAWAL_COINS}
                  className="w-full bg-white text-amber-700 hover:bg-white/90 font-semibold shadow-sm disabled:opacity-60"
                >
                  <Wallet className="h-4 w-4 mr-1.5" /> Request Withdrawal
                </Button>
                {stats.availableCoins < MIN_WITHDRAWAL_COINS && (
                  <p className="text-center text-xs text-white/80 mt-2">
                    Earn at least {MIN_WITHDRAWAL_COINS.toLocaleString()} coins (₹{MIN_WITHDRAWAL_COINS / 100}) to withdraw
                  </p>
                )}
              </div>
            </div>

            {/* breakdown strip */}
            <CardContent className="grid grid-cols-3 divide-x divide-amber-100 bg-amber-50/60 p-0">
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Total Earned</p>
                <p className="text-lg font-bold text-amber-700">{stats.totalCoins.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{coinBookings.length} bookings</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground">In Withdrawal</p>
                <p className="text-lg font-bold text-orange-600">{stats.lockedCoins.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">pending / paid</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Rupee Value</p>
                <p className="text-lg font-bold text-green-700">₹{stats.coinsRupee.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground">100 coins = ₹1</p>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-500" /> My Withdrawal Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myWithdrawals.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <Wallet className="h-9 w-9 mx-auto mb-2 opacity-30" />
                  <p>No withdrawal requests yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {myWithdrawals.map(w => {
                    const meta = WITHDRAWAL_STATUS_META[w.status];
                    const StatusIcon = meta.icon;
                    return (
                      <div key={w.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold">{w.coins.toLocaleString()} 🪙 <span className="text-green-700 font-medium">= ₹{w.rupeeValue.toFixed(2)}</span></p>
                          <p className="text-xs text-muted-foreground">
                            {METHOD_LABELS[w.method]}{w.accountDetails ? ` · ${w.accountDetails}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(w.requestedAt.slice(0, 10))}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <Badge className={`${meta.cls} gap-1`}>
                            <StatusIcon className="h-3 w-3" /> {meta.label}
                          </Badge>
                          {w.status === "pending" && (
                            <div>
                              <Button
                                variant="ghost" size="sm"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                onClick={() => cancelWithdrawal(w)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-booking coin history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-amber-500" /> Coin Earning History
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

      {/* ── Withdrawal request dialog ─────────────────────────────────────── */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-500" /> Request Coin Withdrawal
            </DialogTitle>
            <DialogDescription>
              Available: <span className="font-semibold text-amber-700">{stats.availableCoins.toLocaleString()} coins</span> (₹{stats.availableRupee.toFixed(2)}). 100 coins = ₹1.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wd-coins">Coins to withdraw</Label>
              <Input
                id="wd-coins"
                type="number"
                min={MIN_WITHDRAWAL_COINS}
                max={stats.availableCoins}
                step={100}
                value={wdCoins}
                onChange={e => setWdCoins(e.target.value)}
                placeholder={`Min ${MIN_WITHDRAWAL_COINS}`}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  = ₹{((Math.floor(Number(wdCoins)) || 0) / 100).toFixed(2)}
                </span>
                <button
                  type="button"
                  className="text-amber-600 font-medium hover:underline"
                  onClick={() => setWdCoins(String(stats.availableCoins))}
                >
                  Withdraw all
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Payout method</Label>
              <Select value={wdMethod} onValueChange={v => setWdMethod(v as CoinWithdrawalMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wd-account">
                {wdMethod === "upi" ? "UPI ID" : wdMethod === "bank_transfer" ? "Bank account details" : "Note for cash payout"}
              </Label>
              <Input
                id="wd-account"
                value={wdAccount}
                onChange={e => setWdAccount(e.target.value)}
                placeholder={
                  wdMethod === "upi" ? "name@upi"
                    : wdMethod === "bank_transfer" ? "A/C no · IFSC · bank name"
                    : "e.g. Hand over at office"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wd-notes">Notes (optional)</Label>
              <Textarea
                id="wd-notes"
                value={wdNotes}
                onChange={e => setWdNotes(e.target.value)}
                rows={2}
                placeholder="Anything the admin should know"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={submitWithdrawal} className="bg-amber-500 hover:bg-amber-600">
              <Coins className="h-4 w-4 mr-1.5" /> Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
