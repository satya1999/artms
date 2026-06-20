import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { CashEntry, CashEntryType, CashCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

const CASH_IN_CATEGORIES: CashCategory[] = ["booking_collection", "investment", "loan", "bank_withdrawal", "other"];
const CASH_OUT_CATEGORIES: CashCategory[] = ["expense", "salary", "withdrawal", "bank_deposit", "other"];

const EMPTY = {
  type: "in" as CashEntryType,
  category: "booking_collection" as CashCategory,
  description: "",
  amount: 0,
  referenceId: "",
};

export default function CashBook() {
  const { cashEntries, setCashEntries } = useData();
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const f = (field: string, value: string | number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "type") updated.category = value === "in" ? "booking_collection" : "expense";
      return updated;
    });
  };

  const filtered = useMemo(() => {
    return cashEntries.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [cashEntries, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalIn = filtered.filter(e => e.type === "in").reduce((s, e) => s + e.amount, 0);
    const totalOut = filtered.filter(e => e.type === "out").reduce((s, e) => s + e.amount, 0);
    return { totalIn, totalOut, balance: totalIn - totalOut };
  }, [filtered]);

  // Running balance rows
  const withBalance = useMemo(() => {
    let running = 0;
    return filtered.map((e) => {
      if (e.type === "in") running += e.amount;
      else running -= e.amount;
      return { ...e, runningBalance: running };
    });
  }, [filtered]);

  const handleSave = () => {
    if (!form.description || form.amount <= 0) { toast.error("Fill description and amount"); return; }
    const entry: CashEntry = {
      id: generateId("CASH"), date: new Date().toISOString().split("T")[0],
      type: form.type, category: form.category, description: form.description,
      amount: form.amount, referenceId: form.referenceId || undefined,
      addedBy: user?.name || "Staff",
    };
    setCashEntries(prev => [...prev, entry]);
    toast.success("Cash entry added");
    setDialogOpen(false);
    setForm({ ...EMPTY });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Book</h1>
          <p className="text-muted-foreground text-sm">Track all cash transactions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUpCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Cash In</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalIn)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDownCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Cash Out</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalOut)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${stats.balance >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className={`h-8 w-8 ${stats.balance >= 0 ? "text-blue-500" : "text-orange-500"}`} />
            <div>
              <p className="text-xs text-muted-foreground">Cash Balance</p>
              <p className={`text-xl font-bold ${stats.balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>{formatCurrency(stats.balance)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To Date</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
      </div>

      {/* Cash Book Table */}
      <Card>
        <div className="overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Added By</TableHead>
              <TableHead className="text-right text-green-600">Cash In (₹)</TableHead>
              <TableHead className="text-right text-red-600">Cash Out (₹)</TableHead>
              <TableHead className="text-right">Balance (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withBalance.map((e) => (
              <TableRow key={e.id} className={e.type === "in" ? "bg-green-50/30" : "bg-red-50/30"}>
                <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {e.type === "in"
                      ? <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{e.description}</p>
                      {e.referenceId && <p className="text-xs text-muted-foreground">Ref: {e.referenceId}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{e.category.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.addedBy}</TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {e.type === "in" ? formatCurrency(e.amount) : ""}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {e.type === "out" ? formatCurrency(e.amount) : ""}
                </TableCell>
                <TableCell className={`text-right font-semibold ${e.runningBalance >= 0 ? "text-blue-700" : "text-orange-600"}`}>
                  {formatCurrency(e.runningBalance)}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell colSpan={4} className="text-right text-sm">Totals</TableCell>
              <TableCell className="text-right text-green-600">{formatCurrency(stats.totalIn)}</TableCell>
              <TableCell className="text-right text-red-600">{formatCurrency(stats.totalOut)}</TableCell>
              <TableCell className={`text-right ${stats.balance >= 0 ? "text-blue-700" : "text-orange-600"}`}>{formatCurrency(stats.balance)}</TableCell>
            </TableRow>
            {withBalance.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No entries found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Add Cash Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-3">
                <Button
                  variant={form.type === "in" ? "default" : "outline"}
                  className={form.type === "in" ? "bg-green-600 hover:bg-green-700 flex-1" : "flex-1"}
                  onClick={() => f("type", "in")}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" /> Cash In
                </Button>
                <Button
                  variant={form.type === "out" ? "destructive" : "outline"}
                  className="flex-1"
                  onClick={() => f("type", "out")}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" /> Cash Out
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.type === "in" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES).map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="What is this for?" />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => f("amount", +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference ID</Label>
              <Input value={form.referenceId} onChange={(e) => f("referenceId", e.target.value)} placeholder="Booking ID / Receipt No." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
