export type UserRole = "super_admin" | "accountant" | "booking_executive" | "tour_manager";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Primary role — used by AuthContext for session storage (do not remove) */
  role: UserRole;
  /** All assigned roles; if absent, falls back to [role] */
  roles?: UserRole[];
  phone?: string;
  active: boolean;
  createdAt: string;
}

export type TripStatus = "draft" | "published" | "active" | "completed" | "cancelled";
export type SeatType = "seat" | "sleeper";

export interface Trip {
  id: string;
  tripName: string;
  startDate: string;
  endDate: string;
  departurePoint: string;
  destination: string;
  totalSeats: number;
  sleeperSeats: number;
  seatPrice: number;
  sleeperPrice: number;
  busAssigned: string;
  status: TripStatus;
  createdAt: string;
  inclusions?: string;
}

export type CategoryType = "expense" | "income" | "general";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
  parentId?: string;
  createdAt: string;
}

export type BookingStatus =
  | "tentative"
  | "confirmed"
  | "balance_due"
  | "fully_paid"
  | "cancelled"
  | "completed"
  | "no_show"
  | "waitlisted";

export type PaymentProofStatus = "pending" | "approved" | "rejected";

export interface Booking {
  id: string;
  bookingDate: string;
  bookingDateTime: string;
  // Passenger info (embedded — no separate passenger record needed)
  passengerId?: string;
  passengerName: string;
  passengerMobile: string;
  passengerAddress?: string;
  passengerAadhaar?: string;
  passengerAge?: number;
  passengerGender?: "Male" | "Female" | "Other";
  // Trip & seat
  tripId: string;
  tripName: string;
  seatNumber: string;
  seatType: SeatType;
  // Financials
  packageAmount: number;
  discount: number;
  discountReason?: string;
  finalAmount: number;
  advancePaid: number;
  pendingAmount: number;
  // Status & meta
  status: BookingStatus;
  source: "walk_in" | "phone" | "referral" | "agent";
  collectedBy: string;
  staffId?: string;
  notes?: string;
  // Payment
  paymentMode?: PaymentMode;
  paymentReferenceNumber?: string;
  paymentScreenshot?: string;
  paymentProofStatus?: PaymentProofStatus;
  rewardCoins?: number;
}

export type PaymentMode = "cash" | "upi" | "bank_transfer" | "card" | "cheque";

export interface Payment {
  id: string;
  date: string;
  bookingId: string;
  passengerName: string;
  tripName: string;
  amount: number;
  mode: PaymentMode;
  referenceNumber?: string;
  accountName?: string;
  collectedBy: string;
  notes?: string;
  signature?: string;
}

export type ExpenseType = "trip" | "company";
export type TripExpenseCategory =
  | "diesel"
  | "toll"
  | "food"
  | "accommodation"
  | "driver_salary"
  | "cleaner_salary"
  | "guide_charges"
  | "parking"
  | "permit_fees"
  | "medical"
  | "other";

export type CompanyExpenseCategory =
  | "office_rent"
  | "salary"
  | "marketing"
  | "internet"
  | "electricity"
  | "website"
  | "software"
  | "miscellaneous";

export interface Expense {
  id: string;
  date: string;
  type: ExpenseType;
  tripId?: string;
  tripName?: string;
  category: TripExpenseCategory | CompanyExpenseCategory;
  description: string;
  amount: number;
  vendorName?: string;
  billUrl?: string;
  approvedBy?: string;
  paymentMode: PaymentMode;
  addedBy: string;
}

export type CashEntryType = "in" | "out";
export type CashCategory =
  | "booking_collection"
  | "investment"
  | "loan"
  | "expense"
  | "salary"
  | "withdrawal"
  | "bank_deposit"
  | "bank_withdrawal"
  | "other";

export interface CashEntry {
  id: string;
  date: string;
  type: CashEntryType;
  category: CashCategory;
  description: string;
  amount: number;
  referenceId?: string;
  addedBy: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountType: "current" | "savings" | "cash";
  openingBalance: number;
  active: boolean;
}

export type BankTxType = "credit" | "debit";

export interface BankTransaction {
  id: string;
  date: string;
  bankAccountId: string;
  bankName: string;
  type: BankTxType;
  description: string;
  amount: number;
  referenceNumber?: string;
  mode: "neft" | "rtgs" | "imps" | "upi" | "cash" | "cheque" | "other";
  addedBy: string;
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  bankAccount?: string;
  basicSalary: number;
  joiningDate: string;
  active: boolean;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  basicSalary: number;
  bonus: number;
  advance: number;
  deductions: number;
  netSalary: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  status: "pending" | "paid";
}

export interface Bus {
  id: string;
  registrationNumber: string;
  model: string;
  capacity: number;
  type: "ac" | "non_ac" | "sleeper" | "semi_sleeper";
  driverName?: string;
  driverPhone?: string;
  active: boolean;
}

// ── Staff Management ──────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;          // auto: STF-001
  name: string;
  mobile: string;
  email: string;
  address: string;
  aadhaar: string;
  joiningDate: string;
  designation: string;
  department: string;
  /** Primary role — used as fallback when roles[] is absent */
  role: UserRole;
  /** All assigned roles; if absent, falls back to [role] */
  roles?: UserRole[];
  monthlySalary: number;
  status: "active" | "inactive";
  createdAt: string;
}

// ── Staff Loan / Credit ───────────────────────────────────────────────────────

export type LoanType = "loan" | "advance";
export type LoanStatus = "active" | "closed" | "defaulted";

export interface StaffLoan {
  id: string;           // LOAN-001
  staffId: string;
  staffName: string;
  type: LoanType;
  amount: number;       // total disbursed
  disbursedDate: string;
  purpose: string;
  repaymentMonths: number;  // 0 = no fixed schedule
  emiAmount: number;        // 0 = no fixed EMI
  status: LoanStatus;
  notes?: string;
  createdAt: string;
}

export interface LoanRepayment {
  id: string;           // REP-001
  loanId: string;
  staffId: string;
  staffName: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

// ── Legacy — kept so existing Expense / CashBook pages compile ─────────────────
export interface Passenger {
  id: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  aadhaarLast4: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  createdAt: string;
}
