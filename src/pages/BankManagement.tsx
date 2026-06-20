import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { BankAccount, BankTransaction, BankTxType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, TrendingUp, TrendingDown, Wallet, Pencil, PowerOff } from "lucide-react";
import { toast } from "sonner";

const TX_MODES = ["neft", "rtgs", "imps", "upi", "cash", "cheque", "other"] as const;

type AccountType = "bank" | "cash"; // UI toggle — "bank" maps to current/savings

type AccountForm = {
  kind: AccountType;
  bankName: string;
  accountNumber: string;
  accountType: "current" | "savings";
  ifscCode: string;
  branch: string;
  openingBalance: number;
};

const EMPTY_ACCOUNT: AccountForm = {
  kind: "bank",
  bankName: "",
  accountNumber: "",
  accountType: "current",
  ifscCode: "",
  branch: "",
  openingBalance: 0,
};

export default function BankManagement() {
  const { bankAccounts, setBankAccounts, bankTransactions, setBankTransactions } = useData();
  const { user } = useAuth();

  const [selectedAccount, setSelectedAccount] = useState(bankAccounts[0]?.id || "");

  // ── Account dialog ──────────────────────────────────────────────────────────
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accForm, setAccForm] = useState<AccountForm>(EMPTY_ACCOUNT);

  const af = (field: keyof AccountForm, value: string | number) =>
    setAccForm((prev) => ({ ...prev, [field]: value }));

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccForm(EMPTY_ACCOUNT);
    setAccountDialogOpen(true);
  };

  const openEditAccount = (a: BankAccount) => {
    setEditingAccount(a);
    setAccForm({
      kind: a.accountType === "cash" ? "cash" : "bank",
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      accountType: (a.accountType === "cash" ? "current" : a.accountType) as "current" | "savings",
      ifscCode: a.ifscCode,
      branch: a.branch,
      openingBalance: a.openingBalance,
    });
    setAccountDialogOpen(true);
  };

  const handleSaveAccount = () => {
    if (!accForm.bankName.trim()) { toast.error("Account name is required"); return; }
    if (accForm.kind === "bank") {
      if (!accForm.accountNumber.trim()) { toast.error("Account number is required"); return; }
      if (!accForm.ifscCode.trim()) { toast.error("IFSC code is required"); return; }
      if (!accForm.branch.trim()) { toast.error("Branch is required"); return; }
    }

    const isCash = accForm.kind === "cash";

    if (editingAccount) {
      setBankAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id
            ? {
                ...a,
                bankName: accForm.bankName,
                accountNumber: isCash ? "" : accForm.accountNumber,
                accountType: isCash ? "cash" : accForm.accountType,
                ifscCode: isCash ? "" : accForm.ifscCode,
                branch: isCash ? "" : accForm.branch,
                openingBalance: accForm.openingBalance,
              }
            : a
        )
      );
      toast.success("Account updated");
    } else {
      const newAccount: BankAccount = {
        id: generateId("ACC"),
        bankName: accForm.bankName,
        accountNumber: isCash ? "" : accForm.accountNumber,
        accountType: isCash ? "cash" : accForm.accountType,
        ifscCode: isCash ? "" : accForm.ifscCode,
        branch: isCash ? "" : accForm.branch,
        openingBalance: accForm.openingBalance,
        active: true,
      };
      setBankAccounts((prev) => [...prev, newAccount]);
      if (bankAccounts.length === 0) setSelectedAccount(newAccount.id);
      toast.success(`${isCash ? "Cash account" : "Bank account"} added`);
    }
    setAccountDialogOpen(false);
  };

  const toggleAccountActive = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  // ── Transaction dialog ──────────────────────────────────────────────────────
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    bankAccountId: bankAccounts[0]?.id || "",
    type: "credit" as BankTxType,
    description: "",
    amount: 0,
    referenceNumber: "",
    mode: "neft" as typeof TX_MODES[number],
  });

  const tf = (field: string, value: string | number) => setTxForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveTx = () => {
    if (!txForm.description || txForm.amount <= 0) { toast.error("Fill description and amount"); return; }
    const account = bankAccounts.find((a) => a.id === txForm.bankAccountId);
    const tx: BankTransaction = {
      id: generateId("BTX"), date: new Date().toISOString().split("T")[0],
      bankAccountId: txForm.bankAccountId, bankName: account?.bankName || "",
      type: txForm.type, description: txForm.description, amount: txForm.amount,
      referenceNumber: txForm.referenceNumber || undefined, mode: txForm.mode,
      addedBy: user?.name || "Staff",
    };
    setBankTransactions((prev) => [...prev, tx]);
    toast.success("Transaction recorded");
    setTxDialogOpen(false);
    setTxForm({ bankAccountId: bankAccounts[0]?.id || "", type: "credit", description: "", amount: 0, referenceNumber: "", mode: "neft" });
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const accountTxns = useMemo(() =>
    bankTransactions.filter((t) => t.bankAccountId === selectedAccount)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [bankTransactions, selectedAccount]);

  const accountStats = useMemo(() => {
    const account = bankAccounts.find((a) => a.id === selectedAccount);
    const credits = accountTxns.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const debits  = accountTxns.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    return {
      openingBalance: account?.openingBalance || 0,
      credits, debits,
      balance: (account?.openingBalance || 0) + credits - debits,
    };
  }, [accountTxns, selectedAccount, bankAccounts]);

  const withRunning = useMemo(() => {
    let running = accountStats.openingBalance;
    return accountTxns.map((t) => {
      running += t.type === "credit" ? t.amount : -t.amount;
      return { ...t, runningBalance: running };
    });
  }, [accountTxns, accountStats.openingBalance]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isCashAccount = (a: BankAccount) => a.accountType === "cash";

  const accountLabel = (a: BankAccount) =>
    isCashAccount(a) ? "Cash" : a.accountType.charAt(0).toUpperCase() + a.accountType.slice(1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank & Cash Accounts</h1>
          <p className="text-muted-foreground text-sm">
            {bankAccounts.filter((a) => a.active).length} active accounts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openAddAccount}>
            <Plus className="h-4 w-4 mr-1" /> Add Account
          </Button>
          <Button onClick={() => { setTxForm((p) => ({ ...p, bankAccountId: selectedAccount || bankAccounts[0]?.id || "" })); setTxDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Account Cards */}
      {bankAccounts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm mt-1">Click "Add Account" to create your first bank or cash account.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => {
            const txns = bankTransactions.filter((t) => t.bankAccountId === account.id);
            const credits = txns.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
            const debits  = txns.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
            const balance = account.openingBalance + credits - debits;
            const isCash  = isCashAccount(account);

            return (
              <Card
                key={account.id}
                className={`cursor-pointer transition-all ${selectedAccount === account.id ? "ring-2 ring-blue-500" : "hover:shadow-md"} ${!account.active ? "opacity-60" : ""}`}
                onClick={() => setSelectedAccount(account.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isCash
                        ? <Wallet className="h-5 w-5 text-amber-500" />
                        : <Building2 className="h-5 w-5 text-blue-600" />}
                      <div>
                        <p className="font-semibold">{account.bankName}</p>
                        <p className="text-xs text-muted-foreground">
                          {isCash ? "Cash Account" : `${account.accountNumber} · ${accountLabel(account)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={account.active ? "default" : "secondary"} className="text-xs">
                        {account.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {!isCash && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {account.branch} · IFSC: {account.ifscCode}
                    </p>
                  )}

                  <div className="mt-2 pt-3 border-t grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Opening</p>
                      <p className="text-sm font-medium">{formatCurrency(account.openingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Credits</p>
                      <p className="text-sm font-medium text-green-600">+{formatCurrency(credits)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(balance)}</p>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="mt-3 pt-3 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => openEditAccount(account)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={`flex-1 h-7 text-xs ${account.active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                      onClick={() => toggleAccountActive(account.id)}
                    >
                      <PowerOff className="h-3 w-3 mr-1" />
                      {account.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected Account Transactions */}
      {selectedAccount && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {bankAccounts.find((a) => a.id === selectedAccount)?.bankName} — Transactions
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-green-600">Credits: {formatCurrency(accountStats.credits)}</span>
              <span className="text-red-600">Debits: {formatCurrency(accountStats.debits)}</span>
              <span className="font-semibold text-blue-700">Balance: {formatCurrency(accountStats.balance)}</span>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right text-green-600">Credit (₹)</TableHead>
                  <TableHead className="text-right text-red-600">Debit (₹)</TableHead>
                  <TableHead className="text-right">Balance (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-slate-50">
                  <TableCell colSpan={6} className="text-right text-sm font-medium text-muted-foreground">Opening Balance</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(accountStats.openingBalance)}</TableCell>
                </TableRow>
                {withRunning.map((t) => (
                  <TableRow key={t.id} className={t.type === "credit" ? "bg-green-50/20" : "bg-red-50/20"}>
                    <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {t.type === "credit"
                          ? <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className="text-sm">{t.description}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs uppercase">{t.mode}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.referenceNumber || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {t.type === "credit" ? formatCurrency(t.amount) : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {t.type === "debit" ? formatCurrency(t.amount) : ""}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${t.runningBalance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                      {formatCurrency(t.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}
                {withRunning.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Add / Edit Account Dialog ─────────────────────────────────────────── */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Account kind toggle */}
            {!editingAccount && (
              <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={accForm.kind === "bank" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => af("kind", "bank")}
                  >
                    <Building2 className="h-4 w-4 mr-2" /> Bank Account
                  </Button>
                  <Button
                    type="button"
                    variant={accForm.kind === "cash" ? "default" : "outline"}
                    className={`flex-1 ${accForm.kind === "cash" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    onClick={() => af("kind", "cash")}
                  >
                    <Wallet className="h-4 w-4 mr-2" /> Cash Account
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{accForm.kind === "cash" ? "Account Name *" : "Bank Name *"}</Label>
              <Input
                value={accForm.bankName}
                onChange={(e) => af("bankName", e.target.value)}
                placeholder={accForm.kind === "cash" ? "e.g. Office Cash, Petty Cash" : "e.g. State Bank of India"}
              />
            </div>

            {accForm.kind === "bank" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Account Number *</Label>
                    <Input
                      value={accForm.accountNumber}
                      onChange={(e) => af("accountNumber", e.target.value)}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Subtype</Label>
                    <Select value={accForm.accountType} onValueChange={(v) => af("accountType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>IFSC Code *</Label>
                    <Input
                      value={accForm.ifscCode}
                      onChange={(e) => af("ifscCode", e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch *</Label>
                    <Input
                      value={accForm.branch}
                      onChange={(e) => af("branch", e.target.value)}
                      placeholder="Branch name"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Opening Balance (₹)</Label>
              <Input
                type="number"
                value={accForm.openingBalance}
                onChange={(e) => af("openingBalance", +e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAccount}>
              {editingAccount ? "Save Changes" : accForm.kind === "cash" ? "Add Cash Account" : "Add Bank Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Transaction Dialog ────────────────────────────────────────────── */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={txForm.bankAccountId} onValueChange={(v) => tf("bankAccountId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter((a) => a.active).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {isCashAccount(a) ? <Wallet className="inline h-3.5 w-3.5 mr-1 text-amber-500" /> : null}
                      {a.bankName}{!isCashAccount(a) && ` — ${a.accountNumber}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-3">
                <Button
                  variant={txForm.type === "credit" ? "default" : "outline"}
                  className={`flex-1 ${txForm.type === "credit" ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => tf("type", "credit")}
                >
                  <TrendingUp className="h-4 w-4 mr-1" /> Credit
                </Button>
                <Button
                  variant={txForm.type === "debit" ? "destructive" : "outline"}
                  className="flex-1"
                  onClick={() => tf("type", "debit")}
                >
                  <TrendingDown className="h-4 w-4 mr-1" /> Debit
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={txForm.description} onChange={(e) => tf("description", e.target.value)} placeholder="What is this transaction for?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={txForm.amount} onChange={(e) => tf("amount", +e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={txForm.mode} onValueChange={(v) => tf("mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TX_MODES.map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={txForm.referenceNumber} onChange={(e) => tf("referenceNumber", e.target.value)} placeholder="UTR / Cheque No." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTx}>Record Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
