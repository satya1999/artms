import {
  createContext, useContext, useState, useRef, ReactNode,
  useEffect, useCallback,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type {
  Trip, Passenger, Booking, Payment, Expense, Category,
  CashEntry, BankAccount, BankTransaction, Employee, SalaryRecord, Bus,
  StaffMember, StaffLoan, LoanRepayment, CoinWithdrawal,
} from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip Convex internal fields + local-only blobs before comparison/write */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanDoc(doc: any): Record<string, unknown> {
  const { _id, _creationTime, paymentScreenshot, signature, ...rest } = doc;
  void _id; void _creationTime; void paymentScreenshot; void signature;
  return rest;
}

type AnyItem = { id: string };
type CreateMut = (args: { doc: Record<string, unknown> }) => Promise<unknown>;
type UpdateMut = (args: { id: string; updates: Record<string, unknown> }) => Promise<unknown>;
type RemoveMut = (args: { id: string }) => Promise<unknown>;

/**
 * Creates a write-through setter. Uses a `getState` ref so that Convex mutations
 * fire OUTSIDE the React state-updater function — which prevents React 18 Strict
 * Mode from double-invoking them and creating duplicate DB documents.
 */
function makeSmartSetter<T extends AnyItem>(
  getState: () => T[],
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  create: CreateMut,
  update: UpdateMut,
  remove: RemoveMut,
): React.Dispatch<React.SetStateAction<T[]>> {
  return (action) => {
    // Resolve next state using the getter (not inside setState) so mutations
    // are never inside a React state-updater, which can run multiple times.
    const prev = getState();
    const next: T[] = typeof action === "function" ? action(prev) : action;

    // Update state with a plain value — no functional updater → no Strict Mode double-call
    setState(next);

    const prevMap = new Map(prev.map((x) => [x.id, x]));
    const nextMap = new Map(next.map((x) => [x.id, x]));

    for (const [id] of prevMap) {
      if (!nextMap.has(id)) remove({ id }).catch(console.error);
    }
    for (const [id, item] of nextMap) {
      if (!prevMap.has(id)) create({ doc: cleanDoc(item) }).catch(console.error);
    }
    for (const [id, item] of nextMap) {
      const p = prevMap.get(id);
      if (p && JSON.stringify(cleanDoc(item)) !== JSON.stringify(cleanDoc(p))) {
        update({ id, updates: cleanDoc(item) }).catch(console.error);
      }
    }
  };
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface DataContextType {
  isLoading: boolean;
  coinsPerBooking: number;
  setCoinsPerBooking: (val: number) => void;
  monthlyTarget: number;
  setMonthlyTarget: (val: number) => void;
  trips: Trip[];                  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  passengers: Passenger[];        setPassengers: React.Dispatch<React.SetStateAction<Passenger[]>>;
  bookings: Booking[];            setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  payments: Payment[];            setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  expenses: Expense[];            setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  categories: Category[];         setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  cashEntries: CashEntry[];       setCashEntries: React.Dispatch<React.SetStateAction<CashEntry[]>>;
  bankAccounts: BankAccount[];    setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  bankTransactions: BankTransaction[]; setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>;
  employees: Employee[];          setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  salaries: SalaryRecord[];       setSalaries: React.Dispatch<React.SetStateAction<SalaryRecord[]>>;
  buses: Bus[];                   setBuses: React.Dispatch<React.SetStateAction<Bus[]>>;
  staff: StaffMember[];           setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  staffLoans: StaffLoan[];        setStaffLoans: React.Dispatch<React.SetStateAction<StaffLoan[]>>;
  loanRepayments: LoanRepayment[]; setLoanRepayments: React.Dispatch<React.SetStateAction<LoanRepayment[]>>;
  coinWithdrawals: CoinWithdrawal[]; setCoinWithdrawals: React.Dispatch<React.SetStateAction<CoinWithdrawal[]>>;
}

const DataContext = createContext<DataContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  // ── Settings ──────────────────────────────────────────────────────────────
  const [coinsPerBooking, setCoinsPerBookingLocal] = useState(0);
  const [monthlyTarget, setMonthlyTargetLocal] = useState(0);
  const cvxSettings   = useQuery(api.settings.get);
  const settingsUpsert = useMutation(api.settings.upsert);
  useEffect(() => {
    if (cvxSettings !== undefined) {
      setCoinsPerBookingLocal(cvxSettings?.coinsPerBooking ?? 0);
      setMonthlyTargetLocal(cvxSettings?.monthlyTarget ?? 0);
    }
  }, [cvxSettings]);
  const setCoinsPerBooking = (val: number) => {
    setCoinsPerBookingLocal(val);
    settingsUpsert({ coinsPerBooking: val }).catch(console.error);
  };
  const setMonthlyTarget = (val: number) => {
    setMonthlyTargetLocal(val);
    settingsUpsert({ monthlyTarget: val }).catch(console.error);
  };

  // ── Local state (starts empty — hydrated from Convex on first query result) ──
  const [trips, setTripsLocal]                   = useState<Trip[]>([]);
  const [passengers, setPassengers]              = useState<Passenger[]>([]);
  const [bookings, setBookingsLocal]             = useState<Booking[]>([]);
  const [payments, setPaymentsLocal]             = useState<Payment[]>([]);
  const [expenses, setExpensesLocal]             = useState<Expense[]>([]);
  const [categories, setCategoriesLocal]         = useState<Category[]>([]);
  const [cashEntries, setCashEntriesLocal]       = useState<CashEntry[]>([]);
  const [bankAccounts, setBankAccountsLocal]     = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransLocal]    = useState<BankTransaction[]>([]);
  const [employees, setEmployeesLocal]           = useState<Employee[]>([]);
  const [salaries, setSalariesLocal]             = useState<SalaryRecord[]>([]);
  const [buses, setBusesLocal]                   = useState<Bus[]>([]);
  const [staff, setStaffLocal]                   = useState<StaffMember[]>([]);
  const [staffLoans, setStaffLoansLocal]         = useState<StaffLoan[]>([]);
  const [loanRepayments, setLoanRepaymentsLocal] = useState<LoanRepayment[]>([]);
  const [coinWithdrawals, setCoinWithdrawalsLocal] = useState<CoinWithdrawal[]>([]);

  // ── Refs — updated every render so smart setters always see latest state ───
  // This is the key fix: getters read from refs (not closures) so mutation
  // calls happen outside the state-updater function.
  const tripsRef          = useRef(trips);          tripsRef.current          = trips;
  const bookingsRef       = useRef(bookings);       bookingsRef.current       = bookings;
  const paymentsRef       = useRef(payments);       paymentsRef.current       = payments;
  const expensesRef       = useRef(expenses);       expensesRef.current       = expenses;
  const categoriesRef     = useRef(categories);     categoriesRef.current     = categories;
  const cashEntriesRef    = useRef(cashEntries);    cashEntriesRef.current    = cashEntries;
  const bankAccountsRef   = useRef(bankAccounts);   bankAccountsRef.current   = bankAccounts;
  const bankTransRef      = useRef(bankTransactions); bankTransRef.current    = bankTransactions;
  const employeesRef      = useRef(employees);      employeesRef.current      = employees;
  const salariesRef       = useRef(salaries);       salariesRef.current       = salaries;
  const busesRef          = useRef(buses);          busesRef.current          = buses;
  const staffRef          = useRef(staff);          staffRef.current          = staff;
  const staffLoansRef     = useRef(staffLoans);     staffLoansRef.current     = staffLoans;
  const loanRepaymentsRef = useRef(loanRepayments); loanRepaymentsRef.current = loanRepayments;
  const coinWithdrawalsRef = useRef(coinWithdrawals); coinWithdrawalsRef.current = coinWithdrawals;

  // ── Convex queries ─────────────────────────────────────────────────────────
  const cvxTrips           = useQuery(api.trips.getAll);
  const cvxBookings        = useQuery(api.bookings.getAll);
  const cvxPayments        = useQuery(api.payments.getAll);
  const cvxExpenses        = useQuery(api.expenses.getAll);
  const cvxCategories      = useQuery(api.categories.getAll);
  const cvxCashEntries     = useQuery(api.cashEntries.getAll);
  const cvxBankAccounts    = useQuery(api.bankAccounts.getAll);
  const cvxBankTrans       = useQuery(api.bankTransactions.getAll);
  const cvxEmployees       = useQuery(api.employees.getAll);
  const cvxSalaries        = useQuery(api.salaries.getAll);
  const cvxBuses           = useQuery(api.buses.getAll);
  const cvxStaff           = useQuery(api.staff.getAll);
  const cvxStaffLoans      = useQuery(api.staffLoans.getAll);
  const cvxLoanRepayments  = useQuery(api.loanRepayments.getAll);
  const cvxCoinWithdrawals = useQuery(api.coinWithdrawals.getAll);

  // ── Hydrate local state from Convex (no seeding, real data only) ──────────
  useEffect(() => { if (cvxTrips          !== undefined) setTripsLocal(cvxTrips                   as unknown as Trip[]); },          [cvxTrips]);
  useEffect(() => { if (cvxBookings       !== undefined) setBookingsLocal(cvxBookings              as unknown as Booking[]); },       [cvxBookings]);
  useEffect(() => { if (cvxPayments       !== undefined) setPaymentsLocal(cvxPayments              as unknown as Payment[]); },       [cvxPayments]);
  useEffect(() => { if (cvxExpenses       !== undefined) setExpensesLocal(cvxExpenses              as unknown as Expense[]); },       [cvxExpenses]);
  useEffect(() => { if (cvxCategories     !== undefined) setCategoriesLocal(cvxCategories          as unknown as Category[]); },      [cvxCategories]);
  useEffect(() => { if (cvxCashEntries    !== undefined) setCashEntriesLocal(cvxCashEntries        as unknown as CashEntry[]); },     [cvxCashEntries]);
  useEffect(() => { if (cvxBankAccounts   !== undefined) setBankAccountsLocal(cvxBankAccounts      as unknown as BankAccount[]); },   [cvxBankAccounts]);
  useEffect(() => { if (cvxBankTrans      !== undefined) setBankTransLocal(cvxBankTrans            as unknown as BankTransaction[]); },[cvxBankTrans]);
  useEffect(() => { if (cvxEmployees      !== undefined) setEmployeesLocal(cvxEmployees            as unknown as Employee[]); },      [cvxEmployees]);
  useEffect(() => { if (cvxSalaries       !== undefined) setSalariesLocal(cvxSalaries              as unknown as SalaryRecord[]); },  [cvxSalaries]);
  useEffect(() => { if (cvxBuses          !== undefined) setBusesLocal(cvxBuses                    as unknown as Bus[]); },           [cvxBuses]);
  useEffect(() => { if (cvxStaff          !== undefined) setStaffLocal(cvxStaff                    as unknown as StaffMember[]); },   [cvxStaff]);
  useEffect(() => { if (cvxStaffLoans     !== undefined) setStaffLoansLocal(cvxStaffLoans          as unknown as StaffLoan[]); },     [cvxStaffLoans]);
  useEffect(() => { if (cvxLoanRepayments !== undefined) setLoanRepaymentsLocal(cvxLoanRepayments  as unknown as LoanRepayment[]); }, [cvxLoanRepayments]);
  useEffect(() => { if (cvxCoinWithdrawals !== undefined) setCoinWithdrawalsLocal(cvxCoinWithdrawals as unknown as CoinWithdrawal[]); }, [cvxCoinWithdrawals]);

  /** True while any Convex query hasn't returned its first result yet */
  const isLoading = [
    cvxTrips, cvxBookings, cvxPayments, cvxExpenses, cvxCategories,
    cvxCashEntries, cvxBankAccounts, cvxBankTrans, cvxEmployees,
    cvxSalaries, cvxBuses, cvxStaff, cvxStaffLoans, cvxLoanRepayments,
    cvxCoinWithdrawals, cvxSettings,
  ].some((q) => q === undefined);

  // ── Convex mutations ───────────────────────────────────────────────────────
  const tripCreate    = useMutation(api.trips.create);
  const tripUpdate    = useMutation(api.trips.update);
  const tripRemove    = useMutation(api.trips.remove);

  const bookCreate    = useMutation(api.bookings.create);
  const bookUpdate    = useMutation(api.bookings.update);
  const bookRemove    = useMutation(api.bookings.remove);

  const payCreate     = useMutation(api.payments.create);
  const payUpdate     = useMutation(api.payments.update);
  const payRemove     = useMutation(api.payments.remove);

  const expCreate     = useMutation(api.expenses.create);
  const expUpdate     = useMutation(api.expenses.update);
  const expRemove     = useMutation(api.expenses.remove);

  const catCreate     = useMutation(api.categories.create);
  const catUpdate     = useMutation(api.categories.update);
  const catRemove     = useMutation(api.categories.remove);

  const cashCreate    = useMutation(api.cashEntries.create);
  const cashRemove    = useMutation(api.cashEntries.remove);

  const baCreate      = useMutation(api.bankAccounts.create);
  const baUpdate      = useMutation(api.bankAccounts.update);
  const baRemove      = useMutation(api.bankAccounts.remove);

  const btCreate      = useMutation(api.bankTransactions.create);
  const btRemove      = useMutation(api.bankTransactions.remove);

  const empCreate     = useMutation(api.employees.create);
  const empUpdate     = useMutation(api.employees.update);
  const empRemove     = useMutation(api.employees.remove);

  const salCreate     = useMutation(api.salaries.create);
  const salUpdate     = useMutation(api.salaries.update);
  const salRemove     = useMutation(api.salaries.remove);

  const busCreate     = useMutation(api.buses.create);
  const busUpdate     = useMutation(api.buses.update);
  const busRemove     = useMutation(api.buses.remove);

  const stCreate      = useMutation(api.staff.create);
  const stUpdate      = useMutation(api.staff.update);
  const stRemove      = useMutation(api.staff.remove);

  const slCreate      = useMutation(api.staffLoans.create);
  const slUpdate      = useMutation(api.staffLoans.update);
  const slRemove      = useMutation(api.staffLoans.remove);

  const lrCreate      = useMutation(api.loanRepayments.create);
  const lrRemove      = useMutation(api.loanRepayments.remove);

  const cwCreate      = useMutation(api.coinWithdrawals.create);
  const cwUpdate      = useMutation(api.coinWithdrawals.update);
  const cwRemove      = useMutation(api.coinWithdrawals.remove);

  // ── Smart setters (write-through to Convex, transparent to pages) ──────────
  const noopUpdate: UpdateMut = useCallback(() => Promise.resolve(), []);

  const setTrips = useCallback(
    makeSmartSetter(() => tripsRef.current, setTripsLocal, tripCreate, tripUpdate, tripRemove),
    [tripCreate, tripUpdate, tripRemove], // eslint-disable-line
  );
  const setBookings = useCallback(
    makeSmartSetter(() => bookingsRef.current, setBookingsLocal, bookCreate, bookUpdate, bookRemove),
    [bookCreate, bookUpdate, bookRemove], // eslint-disable-line
  );
  const setPayments = useCallback(
    makeSmartSetter(() => paymentsRef.current, setPaymentsLocal, payCreate, payUpdate, payRemove),
    [payCreate, payUpdate, payRemove], // eslint-disable-line
  );
  const setExpenses = useCallback(
    makeSmartSetter(() => expensesRef.current, setExpensesLocal, expCreate, expUpdate, expRemove),
    [expCreate, expUpdate, expRemove], // eslint-disable-line
  );
  const setCategories = useCallback(
    makeSmartSetter(() => categoriesRef.current, setCategoriesLocal, catCreate, catUpdate, catRemove),
    [catCreate, catUpdate, catRemove], // eslint-disable-line
  );
  const setCashEntries = useCallback(
    makeSmartSetter(() => cashEntriesRef.current, setCashEntriesLocal, cashCreate, noopUpdate, cashRemove),
    [cashCreate, noopUpdate, cashRemove], // eslint-disable-line
  );
  const setBankAccounts = useCallback(
    makeSmartSetter(() => bankAccountsRef.current, setBankAccountsLocal, baCreate, baUpdate, baRemove),
    [baCreate, baUpdate, baRemove], // eslint-disable-line
  );
  const setBankTransactions = useCallback(
    makeSmartSetter(() => bankTransRef.current, setBankTransLocal, btCreate, noopUpdate, btRemove),
    [btCreate, noopUpdate, btRemove], // eslint-disable-line
  );
  const setEmployees = useCallback(
    makeSmartSetter(() => employeesRef.current, setEmployeesLocal, empCreate, empUpdate, empRemove),
    [empCreate, empUpdate, empRemove], // eslint-disable-line
  );
  const setSalaries = useCallback(
    makeSmartSetter(() => salariesRef.current, setSalariesLocal, salCreate, salUpdate, salRemove),
    [salCreate, salUpdate, salRemove], // eslint-disable-line
  );
  const setBuses = useCallback(
    makeSmartSetter(() => busesRef.current, setBusesLocal, busCreate, busUpdate, busRemove),
    [busCreate, busUpdate, busRemove], // eslint-disable-line
  );
  const setStaff = useCallback(
    makeSmartSetter(() => staffRef.current, setStaffLocal, stCreate, stUpdate, stRemove),
    [stCreate, stUpdate, stRemove], // eslint-disable-line
  );
  const setStaffLoans = useCallback(
    makeSmartSetter(() => staffLoansRef.current, setStaffLoansLocal, slCreate, slUpdate, slRemove),
    [slCreate, slUpdate, slRemove], // eslint-disable-line
  );
  const setLoanRepayments = useCallback(
    makeSmartSetter(() => loanRepaymentsRef.current, setLoanRepaymentsLocal, lrCreate, noopUpdate, lrRemove),
    [lrCreate, noopUpdate, lrRemove], // eslint-disable-line
  );
  const setCoinWithdrawals = useCallback(
    makeSmartSetter(() => coinWithdrawalsRef.current, setCoinWithdrawalsLocal, cwCreate, cwUpdate, cwRemove),
    [cwCreate, cwUpdate, cwRemove], // eslint-disable-line
  );

  return (
    <DataContext.Provider value={{
      isLoading,
      coinsPerBooking, setCoinsPerBooking,
      monthlyTarget, setMonthlyTarget,
      trips,          setTrips,
      passengers,     setPassengers,
      bookings,       setBookings,
      payments,       setPayments,
      expenses,       setExpenses,
      categories,     setCategories,
      cashEntries,    setCashEntries,
      bankAccounts,   setBankAccounts,
      bankTransactions, setBankTransactions,
      employees,      setEmployees,
      salaries,       setSalaries,
      buses,          setBuses,
      staff,          setStaff,
      staffLoans,     setStaffLoans,
      loanRepayments, setLoanRepayments,
      coinWithdrawals, setCoinWithdrawals,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
