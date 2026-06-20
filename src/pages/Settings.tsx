import { useState, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { formatCurrency } from "@/lib/utils";
import type { Bus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Bus as BusIcon, Building2, Info, Gift, Trophy } from "lucide-react";
import { toast } from "sonner";
import { generateId } from "@/lib/utils";

const BUS_TYPES = ["ac", "non_ac", "sleeper", "semi_sleeper"] as const;

const EMPTY_BUS: Omit<Bus, "id"> = {
  registrationNumber: "", model: "", capacity: 0, type: "non_ac",
  driverName: "", driverPhone: "", active: true,
};

export default function Settings() {
  const { buses, setBuses, bookings, staff, coinsPerBooking, setCoinsPerBooking, monthlyTarget, setMonthlyTarget } = useData();
  const [busDialogOpen, setBusDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [busForm, setBusForm] = useState<Omit<Bus, "id">>({ ...EMPTY_BUS });
  const [coinsInput, setCoinsInput] = useState<number>(coinsPerBooking);
  const [targetInput, setTargetInput] = useState<number>(monthlyTarget);
  // Sync inputs when Convex values arrive
  useEffect(() => { setCoinsInput(coinsPerBooking); }, [coinsPerBooking]);
  useEffect(() => { setTargetInput(monthlyTarget); }, [monthlyTarget]);

  const bf = (field: string, value: string | number | boolean) =>
    setBusForm(prev => ({ ...prev, [field]: value }));

  const openCreateBus = () => { setEditingBus(null); setBusForm({ ...EMPTY_BUS }); setBusDialogOpen(true); };
  const openEditBus = (b: Bus) => { setEditingBus(b); setBusForm({ ...b }); setBusDialogOpen(true); };

  const handleSaveBus = () => {
    if (!busForm.registrationNumber || !busForm.model) { toast.error("Registration and model required"); return; }
    if (editingBus) {
      setBuses(prev => prev.map(b => b.id === editingBus.id ? { ...b, ...busForm } : b));
      toast.success("Bus updated");
    } else {
      setBuses(prev => [...prev, { id: generateId("BUS"), ...busForm }]);
      toast.success("Bus added");
    }
    setBusDialogOpen(false);
  };

  const [companyInfo, setCompanyInfo] = useState({
    name: "Ananda Rath Voyages",
    address: "Market Road, Cuttack - 753001, Odisha",
    phone: "9876543210",
    email: "info@anandavoyages.in",
    gst: "21AABCA1234A1Z5",
    bankName: "State Bank of India",
    accountNumber: "XXXX XXXX 1234",
    ifsc: "SBIN0001234",
    cancellationPolicy: "30+ days: 10% | 15-29 days: 25% | 7-14 days: 50% | <7 days: 100%",
  });

  const ci = (field: string, value: string) => setCompanyInfo(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Company configuration and master data</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="buses">Bus / Vehicle Master</TabsTrigger>
          <TabsTrigger value="rewards">Booking Rewards</TabsTrigger>
          <TabsTrigger value="about">About ARTMS</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={companyInfo.name} onChange={(e) => ci("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={companyInfo.phone} onChange={(e) => ci("phone", e.target.value)} />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input value={companyInfo.address} onChange={(e) => ci("address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={companyInfo.email} onChange={(e) => ci("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input value={companyInfo.gst} onChange={(e) => ci("gst", e.target.value)} />
                </div>
                <div className="col-span-1 sm:col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold mb-3">Default Bank Account</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={companyInfo.bankName} onChange={(e) => ci("bankName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input value={companyInfo.accountNumber} onChange={(e) => ci("accountNumber", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input value={companyInfo.ifsc} onChange={(e) => ci("ifsc", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2 border-t pt-4">
                  <Label>Cancellation Policy</Label>
                  <Input className="mt-2" value={companyInfo.cancellationPolicy} onChange={(e) => ci("cancellationPolicy", e.target.value)} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => toast.success("Settings saved")}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buses" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateBus}><Plus className="h-4 w-4 mr-1" /> Add Bus</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{buses.length}</p><p className="text-xs text-muted-foreground mt-1">Total Buses</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{buses.filter(b => b.active).length}</p><p className="text-xs text-muted-foreground mt-1">Active</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{buses.reduce((s, b) => s + b.capacity, 0)}</p><p className="text-xs text-muted-foreground mt-1">Total Capacity</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{buses.filter(b => b.driverName).length}</p><p className="text-xs text-muted-foreground mt-1">With Drivers</p></CardContent></Card>
          </div>

          <Card>
            <div className="overflow-x-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BusIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{b.registrationNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{b.model}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{b.type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{b.capacity} seats</TableCell>
                    <TableCell>
                      {b.driverName ? (
                        <div>
                          <p className="text-sm">{b.driverName}</p>
                          <p className="text-xs text-muted-foreground">{b.driverPhone}</p>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={b.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                        {b.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEditBus(b)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="mt-4 space-y-4">
          {/* Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" /> Coin Reward Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">How it works</p>
                <p>Staff earn coins for every booking they record. <strong>100 coins = ₹1</strong>. Set the number of coins to award per booking below. Coins are visible in each staff member's dashboard.</p>
              </div>

              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label>Coins per Booking 🪙</Label>
                  <Input
                    type="number"
                    min={0}
                    value={coinsInput}
                    onChange={e => setCoinsInput(+e.target.value)}
                    placeholder="0"
                    className="w-36"
                  />
                  {coinsInput > 0 && (
                    <p className="text-xs text-muted-foreground">= ₹{(coinsInput / 100).toFixed(2)} per booking</p>
                  )}
                </div>
                <Button onClick={() => {
                  setCoinsPerBooking(coinsInput);
                  toast.success(coinsInput > 0 ? `Reward set to ${coinsInput} coins per booking` : "Rewards disabled");
                }}>
                  Save
                </Button>
              </div>

              <div className={`text-sm rounded-lg px-4 py-3 ${coinsPerBooking > 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-50 text-muted-foreground border border-slate-200"}`}>
                {coinsPerBooking > 0
                  ? <>Active — staff earn <strong>{coinsPerBooking} coins</strong> (= ₹{(coinsPerBooking / 100).toFixed(2)}) per booking they record</>
                  : "Rewards are currently disabled (0 coins). Set a value above to enable."}
              </div>
            </CardContent>
          </Card>

          {/* Sales Championship target */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Sales Championship Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Monthly revenue target per staff</p>
                <p>This is the goal each staff member is measured against on the Championship leaderboard — it drives the target progress bars and the “Target Crusher” badge.</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label>Monthly Target (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    value={targetInput}
                    onChange={e => setTargetInput(+e.target.value)}
                    placeholder="150000"
                    className="w-44"
                  />
                </div>
                <Button onClick={() => {
                  setMonthlyTarget(targetInput);
                  toast.success(targetInput > 0 ? `Target set to ${formatCurrency(targetInput)} / staff / month` : "Target cleared (using default)");
                }}>
                  Save
                </Button>
              </div>
              <div className="text-sm rounded-lg px-4 py-3 bg-slate-50 text-muted-foreground border border-slate-200">
                {monthlyTarget > 0
                  ? <>Each staff member is targeted at <strong className="text-foreground">{formatCurrency(monthlyTarget)}</strong> in revenue per month.</>
                  : "No target set — the leaderboard uses a default of ₹1,50,000."}
              </div>
            </CardContent>
          </Card>

          {/* Staff coin summary */}
          {(() => {
            const rewardBookings = bookings.filter(b => (b.rewardCoins ?? 0) > 0);
            if (rewardBookings.length === 0) return null;

            const byStaff = new Map<string, { name: string; count: number; coins: number }>();
            rewardBookings.forEach(b => {
              const key = b.collectedBy;
              const prev = byStaff.get(key) ?? { name: b.collectedBy, count: 0, coins: 0 };
              byStaff.set(key, { ...prev, count: prev.count + 1, coins: prev.coins + (b.rewardCoins ?? 0) });
            });
            const rows = [...byStaff.values()].sort((a, b) => b.coins - a.coins);
            const grandCoins = rows.reduce((s, r) => s + r.coins, 0);

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Staff Coin Earnings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Staff Name</th>
                          <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Bookings</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Coins 🪙</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Value (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.name} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{r.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{r.count}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-600">{r.coins.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-green-700 font-semibold">₹{(r.coins / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t">
                          <td className="px-4 py-2.5 font-bold">Total</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground font-semibold">{rewardBookings.length}</td>
                          <td className="px-4 py-2.5 text-right font-black text-amber-700">{grandCoins.toLocaleString()} 🪙</td>
                          <td className="px-4 py-2.5 text-right font-black text-green-700">₹{(grandCoins / 100).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                  <BusIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg">ARTMS v1.0</p>
                  <p className="text-muted-foreground text-sm">Ananda Rath Travel Management System</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">Modules Included</p>
                  {["Dashboard", "Trip Management", "Passenger Management", "Booking Management",
                    "Payment Collection", "Expense Management", "Cash Book", "Bank Management",
                    "Salary Management", "P&L Reports", "User Management"].map(m => (
                    <p key={m} className="text-muted-foreground">✓ {m}</p>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Technology Stack</p>
                  <p className="text-muted-foreground">Frontend: React 18 + TypeScript</p>
                  <p className="text-muted-foreground">UI: Tailwind CSS + shadcn/ui</p>
                  <p className="text-muted-foreground">Charts: Recharts</p>
                  <p className="text-muted-foreground">Build: Vite</p>
                  <p className="text-muted-foreground">State: React Context</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bus Dialog */}
      <Dialog open={busDialogOpen} onOpenChange={setBusDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingBus ? "Edit Bus" : "Add Bus"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label>Registration Number *</Label>
              <Input value={busForm.registrationNumber} onChange={(e) => bf("registrationNumber", e.target.value)} placeholder="OD-01-AB-1234" />
            </div>
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input value={busForm.model} onChange={(e) => bf("model", e.target.value)} placeholder="Tata Starbus" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={busForm.type} onValueChange={(v) => bf("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUS_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seating Capacity</Label>
              <Input type="number" value={busForm.capacity} onChange={(e) => bf("capacity", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input value={busForm.driverName} onChange={(e) => bf("driverName", e.target.value)} />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label>Driver Phone</Label>
              <Input value={busForm.driverPhone} onChange={(e) => bf("driverPhone", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBus}>Save Bus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
