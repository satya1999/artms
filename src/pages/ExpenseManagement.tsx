import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { Expense, ExpenseType, TripExpenseCategory, CompanyExpenseCategory, PaymentMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const TRIP_CATEGORIES: TripExpenseCategory[] = [
  "diesel", "toll", "food", "accommodation", "driver_salary", "cleaner_salary",
  "guide_charges", "parking", "permit_fees", "medical", "other",
];
const COMPANY_CATEGORIES: CompanyExpenseCategory[] = [
  "office_rent", "salary", "marketing", "internet", "electricity", "website", "software", "miscellaneous",
];
const COLORS = ["#3b82f6","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16","#6366f1","#14b8a6"];

const EMPTY = {
  type: "trip" as ExpenseType, tripId: "", category: "diesel" as TripExpenseCategory | CompanyExpenseCategory,
  description: "", amount: 0, vendorName: "", paymentMode: "cash" as PaymentMode,
};

export default function ExpenseManagement() {
  const { expenses, setExpenses, trips } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tripFilter, setTripFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [activeTab, setActiveTab] = useState<"trip" | "company">("trip");

  const f = (field: string, value: string | number) => setForm((prev) => ({ ...prev, [field]: value }));

  const tripExpenses = useMemo(() =>
    expenses.filter(e => e.type === "trip" && (
      tripFilter === "all" || e.tripId === tripFilter) && (
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendorName || "").toLowerCase().includes(search.toLowerCase())
    )), [expenses, tripFilter, search]);

  const companyExpenses = useMemo(() =>
    expenses.filter(e => e.type === "company" && (
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendorName || "").toLowerCase().includes(search.toLowerCase())
    )), [expenses, search]);

  const tripTotal = tripExpenses.reduce((s, e) => s + e.amount, 0);
  const companyTotal = companyExpenses.reduce((s, e) => s + e.amount, 0);

  const categoryData = (list: Expense[]) => {
    const map: Record<string, number> = {};
    list.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  };

  const openCreate = (type: ExpenseType) => {
    setForm({ ...EMPTY, type, category: type === "trip" ? "diesel" : "office_rent" as any });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.description || form.amount <= 0) { toast.error("Fill description and amount"); return; }
    if (form.type === "trip" && !form.tripId) { toast.error("Select a trip"); return; }
    const trip = trips.find(t => t.id === form.tripId);
    const newExp: Expense = {
      id: generateId("EXP"), date: new Date().toISOString().split("T")[0],
      type: form.type, tripId: form.tripId || undefined, tripName: trip?.tripName,
      category: form.category, description: form.description, amount: form.amount,
      vendorName: form.vendorName || undefined, paymentMode: form.paymentMode,
      addedBy: user?.name || "Staff",
    };
    setExpenses(prev => [...prev, newExp]);
    toast.success("Expense recorded");
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setExpenses(prev => prev.filter(e => e.id !== deleteId));
    toast.success("Expense deleted");
    setDeleteId(null);
  };

  const ExpenseTable = ({ list }: { list: Expense[] }) => (
    <div className="overflow-x-auto rounded-lg"><Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="w-16">Del</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map(e => (
          <TableRow key={e.id}>
            <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
            <TableCell>
              <p className="font-medium text-sm">{e.description}</p>
              {e.tripName && <p className="text-xs text-muted-foreground">{e.tripName}</p>}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs capitalize">{e.category.replace("_", " ")}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.vendorName || "—"}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs capitalize">{e.paymentMode.replace("_", " ")}</Badge>
            </TableCell>
            <TableCell className="font-semibold text-red-600">{formatCurrency(e.amount)}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {list.length === 0 && (
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No expenses recorded</TableCell></TableRow>
        )}
      </TableBody>
    </Table></div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground text-sm">{expenses.length} expenses recorded</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openCreate(activeTab)}><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Trip Expenses</p><p className="text-2xl font-bold text-red-600">{formatCurrency(tripTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Company Expenses</p><p className="text-2xl font-bold text-orange-600">{formatCurrency(companyTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatCurrency(tripTotal + companyTotal)}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "trip" | "company")}>
        <TabsList>
          <TabsTrigger value="trip">Trip Expenses ({tripExpenses.length})</TabsTrigger>
          <TabsTrigger value="company">Company Expenses ({companyExpenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="trip" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={tripFilter} onValueChange={setTripFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All Trips" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card><ExpenseTable list={tripExpenses} /></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData(tripExpenses)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {categoryData(tripExpenses).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card><ExpenseTable list={companyExpenses} /></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData(companyExpenses)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {categoryData(companyExpenses).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>Add {form.type === "trip" ? "Trip" : "Company"} Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {form.type === "trip" && (
              <div className="space-y-2">
                <Label>Trip *</Label>
                <Select value={form.tripId} onValueChange={(v) => f("tripId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select trip" /></SelectTrigger>
                  <SelectContent>
                    {trips.map(t => <SelectItem key={t.id} value={t.id}>{t.tripName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.type === "trip" ? TRIP_CATEGORIES : COMPANY_CATEGORIES).map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={(e) => f("amount", +e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={(v) => f("paymentMode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <Input value={form.vendorName} onChange={(e) => f("vendorName", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Expense?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
