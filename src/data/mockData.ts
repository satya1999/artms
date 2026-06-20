import type {
  User, Trip, Passenger, Booking, Payment, Expense, Category,
  CashEntry, BankAccount, BankTransaction, Employee, SalaryRecord, Bus,
  StaffMember, StaffLoan, LoanRepayment
} from "@/types";

export const mockUsers: User[] = [
  { id: "U001", name: "Ananda Rath", email: "admin@artms.in", role: "super_admin", roles: ["super_admin"], phone: "9876543210", active: true, createdAt: "2024-01-01" },
  { id: "U002", name: "Priya Sharma", email: "accounts@artms.in", role: "accountant", roles: ["accountant"], phone: "9876543211", active: true, createdAt: "2024-01-15" },
  { id: "U003", name: "Rahul Das", email: "booking@artms.in", role: "booking_executive", roles: ["booking_executive"], phone: "9876543212", active: true, createdAt: "2024-02-01" },
  { id: "U004", name: "Suresh Panda", email: "tours@artms.in", role: "tour_manager", roles: ["tour_manager"], phone: "9876543213", active: true, createdAt: "2024-02-15" },
];

export const mockCategories: Category[] = [
  { id: "CAT-001", name: "Diesel / Fuel", type: "expense", description: "Vehicle fuel expenses", createdAt: "2024-01-01" },
  { id: "CAT-002", name: "Toll Charges", type: "expense", description: "Highway and bridge toll", createdAt: "2024-01-01" },
  { id: "CAT-003", name: "Accommodation", type: "expense", description: "Hotel and lodging costs", createdAt: "2024-01-01" },
  { id: "CAT-004", name: "Food & Meals", type: "expense", description: "Passenger and staff meals", createdAt: "2024-01-01" },
  { id: "CAT-005", name: "Driver Salary", type: "expense", description: "Driver payments per trip", createdAt: "2024-01-01" },
  { id: "CAT-006", name: "Office Rent", type: "expense", description: "Monthly office rent", createdAt: "2024-01-01" },
  { id: "CAT-007", name: "Marketing", type: "expense", description: "Ads, promotions, social media", createdAt: "2024-01-01" },
  { id: "CAT-008", name: "Booking Revenue", type: "income", description: "Revenue from passenger bookings", createdAt: "2024-01-01" },
  { id: "CAT-009", name: "Tour Package", type: "income", description: "Complete tour package sales", createdAt: "2024-01-01" },
  { id: "CAT-010", name: "Miscellaneous", type: "general", description: "Other uncategorized items", createdAt: "2024-01-01" },
];

export const mockBuses: Bus[] = [
  { id: "B001", registrationNumber: "OD-01-AB-1234", model: "Tata Starbus", capacity: 52, type: "non_ac", driverName: "Ramesh Kumar", driverPhone: "9812345678", active: true },
  { id: "B002", registrationNumber: "OD-01-CD-5678", model: "Volvo B9R", capacity: 45, type: "sleeper", driverName: "Santosh Singh", driverPhone: "9812345679", active: true },
  { id: "B003", registrationNumber: "OD-02-EF-9012", model: "Ashok Leyland", capacity: 60, type: "semi_sleeper", driverName: "Bijay Swain", driverPhone: "9812345680", active: true },
];

export const mockTrips: Trip[] = [
  {
    id: "T001", tripName: "Mathura-Vrindavan Yatra", startDate: "2026-08-09", endDate: "2026-08-14",
    departurePoint: "Bhubaneswar", destination: "Mathura-Vrindavan",
    totalSeats: 52, sleeperSeats: 0, seatPrice: 11999, sleeperPrice: 0,
    busAssigned: "OD-01-AB-1234", status: "published", createdAt: "2026-06-01",
    inclusions: "Bus, Accommodation, Breakfast"
  },
  {
    id: "T002", tripName: "Puri Jagannath Yatra", startDate: "2026-07-01", endDate: "2026-07-03",
    departurePoint: "Cuttack", destination: "Puri",
    totalSeats: 45, sleeperSeats: 10, seatPrice: 3500, sleeperPrice: 4200,
    busAssigned: "OD-01-CD-5678", status: "published", createdAt: "2026-05-15",
    inclusions: "Bus, Hotel (1 Night), Prasad"
  },
  {
    id: "T003", tripName: "Char Dham Yatra 2026", startDate: "2026-05-10", endDate: "2026-05-25",
    departurePoint: "Bhubaneswar", destination: "Uttarakhand",
    totalSeats: 40, sleeperSeats: 20, seatPrice: 32000, sleeperPrice: 35000,
    busAssigned: "OD-02-EF-9012", status: "completed" as const, createdAt: "2026-03-01",
    inclusions: "Bus, Hotel, Meals, Guide"
  },
  {
    id: "T004", tripName: "Tirupati Balaji Darshan", startDate: "2026-09-15", endDate: "2026-09-18",
    departurePoint: "Bhubaneswar", destination: "Tirupati",
    totalSeats: 52, sleeperSeats: 0, seatPrice: 8500, sleeperPrice: 0,
    busAssigned: "OD-01-AB-1234", status: "draft", createdAt: "2026-06-10",
    inclusions: "Bus, Hotel (2 Nights), Darshan Ticket"
  },
];

// Legacy passenger records — kept for reference; bookings now embed passenger info
export const mockPassengers: Passenger[] = [
  { id: "P001", name: "Sita Devi Mohanty", mobile: "9437001001", address: "Cuttack, Odisha", aadhaarLast4: "1234", age: 58, gender: "Female", bloodGroup: "B+", emergencyContactName: "Ramesh Mohanty", emergencyContactPhone: "9437001002", emergencyContactRelation: "Husband", createdAt: "2026-06-01" },
  { id: "P002", name: "Ramesh Mohanty", mobile: "9437001002", address: "Cuttack, Odisha", aadhaarLast4: "5678", age: 62, gender: "Male", bloodGroup: "O+", emergencyContactName: "Sita Mohanty", emergencyContactPhone: "9437001001", emergencyContactRelation: "Wife", createdAt: "2026-06-01" },
];

export const mockBookings: Booking[] = [
  {
    id: "AR-2026-0001", bookingDate: "2026-06-01", bookingDateTime: "2026-06-01T10:30:00",
    passengerId: "P001", passengerName: "Sita Devi Mohanty",
    passengerMobile: "9437001001", passengerAddress: "Cuttack, Odisha",
    passengerAadhaar: "XXXX-XXXX-1234", passengerAge: 58, passengerGender: "Female",
    tripId: "T001", tripName: "Mathura-Vrindavan Yatra",
    seatNumber: "A1", seatType: "seat",
    packageAmount: 11999, discount: 500, discountReason: "Regular customer",
    finalAmount: 11499, advancePaid: 5000, pendingAmount: 6499,
    status: "confirmed", source: "walk_in", collectedBy: "Rahul Das", staffId: "U003",
    paymentMode: "cash", paymentProofStatus: "approved",
  },
  {
    id: "AR-2026-0002", bookingDate: "2026-06-01", bookingDateTime: "2026-06-01T11:15:00",
    passengerId: "P002", passengerName: "Ramesh Mohanty",
    passengerMobile: "9437001002", passengerAddress: "Cuttack, Odisha",
    passengerAadhaar: "XXXX-XXXX-5678", passengerAge: 62, passengerGender: "Male",
    tripId: "T001", tripName: "Mathura-Vrindavan Yatra",
    seatNumber: "A2", seatType: "seat",
    packageAmount: 11999, discount: 500, discountReason: "Regular customer",
    finalAmount: 11499, advancePaid: 5000, pendingAmount: 6499,
    status: "confirmed", source: "walk_in", collectedBy: "Rahul Das", staffId: "U003",
    paymentMode: "upi", paymentReferenceNumber: "UPI123456789", paymentProofStatus: "pending",
  },
  {
    id: "AR-2026-0003", bookingDate: "2026-06-02", bookingDateTime: "2026-06-02T09:00:00",
    passengerName: "Lalita Sahoo",
    passengerMobile: "9437002001", passengerAddress: "Bhubaneswar, Odisha",
    passengerAadhaar: "XXXX-XXXX-9012", passengerAge: 45, passengerGender: "Female",
    tripId: "T001", tripName: "Mathura-Vrindavan Yatra",
    seatNumber: "B1", seatType: "seat",
    packageAmount: 11999, discount: 0,
    finalAmount: 11999, advancePaid: 11999, pendingAmount: 0,
    status: "fully_paid", source: "phone", collectedBy: "Rahul Das", staffId: "U003",
    paymentMode: "bank_transfer", paymentReferenceNumber: "NEFT987654321", paymentProofStatus: "approved",
  },
  {
    id: "AR-2026-0004", bookingDate: "2026-06-03", bookingDateTime: "2026-06-03T14:20:00",
    passengerName: "Bijay Kumar Nayak",
    passengerMobile: "9437003001", passengerAddress: "Puri, Odisha",
    passengerAadhaar: "XXXX-XXXX-3456", passengerAge: 50, passengerGender: "Male",
    tripId: "T002", tripName: "Puri Jagannath Yatra",
    seatNumber: "C1", seatType: "sleeper",
    packageAmount: 4200, discount: 0,
    finalAmount: 4200, advancePaid: 2000, pendingAmount: 2200,
    status: "confirmed", source: "referral", collectedBy: "Rahul Das", staffId: "U003",
    paymentMode: "cash", paymentProofStatus: "approved",
  },
  {
    id: "AR-2026-0005", bookingDate: "2026-06-04", bookingDateTime: "2026-06-04T16:45:00",
    passengerName: "Manjula Patra",
    passengerMobile: "9437004001", passengerAddress: "Berhampur, Odisha",
    passengerAadhaar: "XXXX-XXXX-7890", passengerAge: 55, passengerGender: "Female",
    tripId: "T002", tripName: "Puri Jagannath Yatra",
    seatNumber: "D1", seatType: "seat",
    packageAmount: 3500, discount: 200,
    finalAmount: 3300, advancePaid: 1500, pendingAmount: 1800,
    status: "confirmed", source: "agent", collectedBy: "Rahul Das", staffId: "U003",
    paymentMode: "upi", paymentReferenceNumber: "UPI556677889", paymentProofStatus: "rejected",
  },
  {
    id: "AR-2026-0006", bookingDate: "2026-05-10", bookingDateTime: "2026-05-10T10:00:00",
    passengerName: "Subash Chandra Panda",
    passengerMobile: "9437005001", passengerAddress: "Sambalpur, Odisha",
    passengerAadhaar: "XXXX-XXXX-2345", passengerAge: 68, passengerGender: "Male",
    tripId: "T003", tripName: "Char Dham Yatra 2026",
    seatNumber: "A3", seatType: "seat",
    packageAmount: 32000, discount: 1000,
    finalAmount: 31000, advancePaid: 31000, pendingAmount: 0,
    status: "completed", source: "walk_in", collectedBy: "Rahul Das", staffId: "U003",
    paymentMode: "bank_transfer", paymentReferenceNumber: "NEFT112233445", paymentProofStatus: "approved",
  },
];

export const mockPayments: Payment[] = [
  { id: "PAY-001", date: "2026-06-01", bookingId: "AR-2026-0001", passengerName: "Sita Devi Mohanty", tripName: "Mathura-Vrindavan Yatra", amount: 5000, mode: "cash", collectedBy: "Rahul Das" },
  { id: "PAY-002", date: "2026-06-01", bookingId: "AR-2026-0002", passengerName: "Ramesh Mohanty", tripName: "Mathura-Vrindavan Yatra", amount: 5000, mode: "upi", referenceNumber: "UPI123456789", collectedBy: "Rahul Das" },
  { id: "PAY-003", date: "2026-06-02", bookingId: "AR-2026-0003", passengerName: "Lalita Sahoo", tripName: "Mathura-Vrindavan Yatra", amount: 11999, mode: "bank_transfer", referenceNumber: "NEFT987654321", collectedBy: "Priya Sharma" },
  { id: "PAY-004", date: "2026-06-03", bookingId: "AR-2026-0004", passengerName: "Bijay Kumar Nayak", tripName: "Puri Jagannath Yatra", amount: 2000, mode: "cash", collectedBy: "Rahul Das" },
  { id: "PAY-005", date: "2026-06-04", bookingId: "AR-2026-0005", passengerName: "Manjula Patra", tripName: "Puri Jagannath Yatra", amount: 1500, mode: "upi", referenceNumber: "UPI556677889", collectedBy: "Rahul Das" },
  { id: "PAY-006", date: "2026-05-10", bookingId: "AR-2026-0006", passengerName: "Subash Chandra Panda", tripName: "Char Dham Yatra 2026", amount: 31000, mode: "bank_transfer", referenceNumber: "NEFT112233445", collectedBy: "Priya Sharma" },
];

export const mockExpenses: Expense[] = [
  { id: "EXP-001", date: "2026-05-12", type: "trip", tripId: "T003", tripName: "Char Dham Yatra 2026", category: "diesel", description: "Diesel for Bhubaneswar to Haridwar", amount: 85000, vendorName: "HP Petrol Pump", paymentMode: "cash", addedBy: "Suresh Panda" },
  { id: "EXP-002", date: "2026-05-13", type: "trip", tripId: "T003", tripName: "Char Dham Yatra 2026", category: "toll", description: "Highway tolls", amount: 12000, paymentMode: "cash", addedBy: "Suresh Panda" },
  { id: "EXP-003", date: "2026-05-14", type: "trip", tripId: "T003", tripName: "Char Dham Yatra 2026", category: "accommodation", description: "Hotel - 3 nights Haridwar", amount: 48000, vendorName: "Hotel Ganga", paymentMode: "bank_transfer", addedBy: "Suresh Panda" },
  { id: "EXP-004", date: "2026-05-15", type: "trip", tripId: "T003", tripName: "Char Dham Yatra 2026", category: "food", description: "Meals for all passengers - Day 5-8", amount: 32000, vendorName: "Sharma Bhojanalaya", paymentMode: "cash", addedBy: "Suresh Panda" },
  { id: "EXP-005", date: "2026-05-25", type: "trip", tripId: "T003", tripName: "Char Dham Yatra 2026", category: "driver_salary", description: "Driver salary for 15-day trip", amount: 18000, paymentMode: "cash", addedBy: "Priya Sharma" },
  { id: "EXP-006", date: "2026-06-01", type: "company", category: "office_rent", description: "June 2026 office rent", amount: 15000, vendorName: "Ram Prasad (Landlord)", paymentMode: "bank_transfer", addedBy: "Priya Sharma" },
  { id: "EXP-007", date: "2026-06-05", type: "company", category: "marketing", description: "Facebook & WhatsApp advertising", amount: 5000, vendorName: "Digital Agency", paymentMode: "upi", addedBy: "Priya Sharma" },
  { id: "EXP-008", date: "2026-06-01", type: "company", category: "electricity", description: "June office electricity bill", amount: 2500, paymentMode: "upi", addedBy: "Priya Sharma" },
];

export const mockCashEntries: CashEntry[] = [
  { id: "CASH-001", date: "2026-06-01", type: "in", category: "booking_collection", description: "Advance from Sita Devi Mohanty - AR-2026-0001", amount: 5000, referenceId: "AR-2026-0001", addedBy: "Rahul Das" },
  { id: "CASH-002", date: "2026-06-03", type: "in", category: "booking_collection", description: "Advance from Bijay Kumar Nayak - AR-2026-0004", amount: 2000, referenceId: "AR-2026-0004", addedBy: "Rahul Das" },
  { id: "CASH-003", date: "2026-06-04", type: "out", category: "expense", description: "Office stationary purchase", amount: 800, addedBy: "Priya Sharma" },
  { id: "CASH-004", date: "2026-06-05", type: "out", category: "expense", description: "Tea & refreshments for office", amount: 350, addedBy: "Priya Sharma" },
  { id: "CASH-005", date: "2026-06-06", type: "in", category: "booking_collection", description: "Walk-in booking advance", amount: 3000, addedBy: "Rahul Das" },
  { id: "CASH-006", date: "2026-06-10", type: "out", category: "bank_deposit", description: "Cash deposit to SBI account", amount: 8000, addedBy: "Priya Sharma" },
];

export const mockBankAccounts: BankAccount[] = [
  { id: "BA001", bankName: "State Bank of India", accountNumber: "XXXX XXXX 1234", ifscCode: "SBIN0001234", branch: "Cuttack Main Branch", accountType: "current", openingBalance: 150000, active: true },
  { id: "BA002", bankName: "HDFC Bank", accountNumber: "XXXX XXXX 5678", ifscCode: "HDFC0005678", branch: "Bhubaneswar", accountType: "savings", openingBalance: 50000, active: true },
];

export const mockBankTransactions: BankTransaction[] = [
  { id: "BTX-001", date: "2026-06-02", bankAccountId: "BA001", bankName: "State Bank of India", type: "credit", description: "Payment from Lalita Sahoo - NEFT", amount: 11999, referenceNumber: "NEFT987654321", mode: "neft", addedBy: "Priya Sharma" },
  { id: "BTX-002", date: "2026-05-10", bankAccountId: "BA001", bankName: "State Bank of India", type: "credit", description: "Char Dham booking - Subash Panda", amount: 31000, referenceNumber: "NEFT112233445", mode: "neft", addedBy: "Priya Sharma" },
  { id: "BTX-003", date: "2026-06-01", bankAccountId: "BA001", bankName: "State Bank of India", type: "debit", description: "Hotel booking payment - Hotel Ganga", amount: 48000, referenceNumber: "NEFT334455667", mode: "neft", addedBy: "Priya Sharma" },
  { id: "BTX-004", date: "2026-06-01", bankAccountId: "BA002", bankName: "HDFC Bank", type: "debit", description: "Office rent - June 2026", amount: 15000, referenceNumber: "IMPS445566778", mode: "imps", addedBy: "Priya Sharma" },
  { id: "BTX-005", date: "2026-06-10", bankAccountId: "BA001", bankName: "State Bank of India", type: "credit", description: "Cash deposit", amount: 8000, mode: "cash", addedBy: "Priya Sharma" },
];

export const mockEmployees: Employee[] = [
  { id: "E001", name: "Rahul Das", designation: "Booking Executive", department: "Sales", phone: "9876543212", bankAccount: "HDFC XXXX 1111", basicSalary: 18000, joiningDate: "2024-02-01", active: true },
  { id: "E002", name: "Priya Sharma", designation: "Accountant", department: "Finance", phone: "9876543211", bankAccount: "SBI XXXX 2222", basicSalary: 22000, joiningDate: "2024-01-15", active: true },
  { id: "E003", name: "Suresh Panda", designation: "Tour Manager", department: "Operations", phone: "9876543213", bankAccount: "SBI XXXX 3333", basicSalary: 20000, joiningDate: "2024-02-15", active: true },
  { id: "E004", name: "Meena Biswal", designation: "Office Assistant", department: "Admin", phone: "9876543214", basicSalary: 12000, joiningDate: "2024-03-01", active: true },
];

export const mockSalaries: SalaryRecord[] = [
  { id: "SAL-001", employeeId: "E001", employeeName: "Rahul Das", month: "May", year: 2026, basicSalary: 18000, bonus: 2000, advance: 0, deductions: 0, netSalary: 20000, paymentMode: "bank_transfer", paymentDate: "2026-05-31", status: "paid" },
  { id: "SAL-002", employeeId: "E002", employeeName: "Priya Sharma", month: "May", year: 2026, basicSalary: 22000, bonus: 0, advance: 0, deductions: 0, netSalary: 22000, paymentMode: "bank_transfer", paymentDate: "2026-05-31", status: "paid" },
  { id: "SAL-003", employeeId: "E003", employeeName: "Suresh Panda", month: "May", year: 2026, basicSalary: 20000, bonus: 5000, advance: 0, deductions: 0, netSalary: 25000, paymentMode: "cash", paymentDate: "2026-05-31", status: "paid" },
  { id: "SAL-004", employeeId: "E004", employeeName: "Meena Biswal", month: "May", year: 2026, basicSalary: 12000, bonus: 0, advance: 2000, deductions: 0, netSalary: 10000, paymentMode: "cash", paymentDate: "2026-05-31", status: "paid" },
  { id: "SAL-005", employeeId: "E001", employeeName: "Rahul Das", month: "June", year: 2026, basicSalary: 18000, bonus: 0, advance: 0, deductions: 0, netSalary: 18000, paymentMode: "bank_transfer", paymentDate: "", status: "pending" },
  { id: "SAL-006", employeeId: "E002", employeeName: "Priya Sharma", month: "June", year: 2026, basicSalary: 22000, bonus: 0, advance: 0, deductions: 0, netSalary: 22000, paymentMode: "bank_transfer", paymentDate: "", status: "pending" },
  { id: "SAL-007", employeeId: "E003", employeeName: "Suresh Panda", month: "June", year: 2026, basicSalary: 20000, bonus: 0, advance: 0, deductions: 0, netSalary: 20000, paymentMode: "cash", paymentDate: "", status: "pending" },
  { id: "SAL-008", employeeId: "E004", employeeName: "Meena Biswal", month: "June", year: 2026, basicSalary: 12000, bonus: 0, advance: 0, deductions: 0, netSalary: 12000, paymentMode: "cash", paymentDate: "", status: "pending" },
];

export const mockStaff: StaffMember[] = [
  {
    id: "STF-001", name: "Ananda Rath", mobile: "9876543210", email: "admin@artms.in",
    address: "Cuttack, Odisha", aadhaar: "1234-5678-9012",
    joiningDate: "2020-01-01", designation: "Managing Director", department: "Management",
    role: "super_admin", monthlySalary: 0, status: "active", createdAt: "2020-01-01",
  },
  {
    id: "STF-002", name: "Priya Sharma", mobile: "9876543211", email: "accounts@artms.in",
    address: "Bhubaneswar, Odisha", aadhaar: "2345-6789-0123",
    joiningDate: "2024-01-15", designation: "Senior Accountant", department: "Finance",
    role: "accountant", monthlySalary: 22000, status: "active", createdAt: "2024-01-15",
  },
  {
    id: "STF-003", name: "Rahul Das", mobile: "9876543212", email: "booking@artms.in",
    address: "Cuttack, Odisha", aadhaar: "3456-7890-1234",
    joiningDate: "2024-02-01", designation: "Booking Executive", department: "Sales",
    role: "booking_executive", monthlySalary: 18000, status: "active", createdAt: "2024-02-01",
  },
  {
    id: "STF-004", name: "Suresh Panda", mobile: "9876543213", email: "tours@artms.in",
    address: "Sambalpur, Odisha", aadhaar: "4567-8901-2345",
    joiningDate: "2024-02-15", designation: "Tour Manager", department: "Operations",
    role: "tour_manager", monthlySalary: 20000, status: "active", createdAt: "2024-02-15",
  },
  {
    id: "STF-005", name: "Meena Biswal", mobile: "9876543214", email: "office@artms.in",
    address: "Puri, Odisha", aadhaar: "5678-9012-3456",
    joiningDate: "2024-03-01", designation: "Office Assistant", department: "Admin",
    role: "booking_executive", monthlySalary: 12000, status: "inactive", createdAt: "2024-03-01",
  },
];

export const mockStaffLoans: StaffLoan[] = [
  {
    id: "LOAN-001", staffId: "STF-003", staffName: "Rahul Das", type: "loan",
    amount: 30000, disbursedDate: "2026-04-01", purpose: "Medical emergency",
    repaymentMonths: 6, emiAmount: 5000, status: "active",
    notes: "Approved by admin on 01-Apr-2026", createdAt: "2026-04-01",
  },
  {
    id: "LOAN-002", staffId: "STF-002", staffName: "Priya Sharma", type: "advance",
    amount: 10000, disbursedDate: "2026-05-01", purpose: "Salary advance for house rent",
    repaymentMonths: 2, emiAmount: 5000, status: "closed",
    notes: "Fully repaid by June 2026", createdAt: "2026-05-01",
  },
  {
    id: "LOAN-003", staffId: "STF-004", staffName: "Suresh Panda", type: "loan",
    amount: 50000, disbursedDate: "2026-06-01", purpose: "Personal needs",
    repaymentMonths: 10, emiAmount: 5000, status: "active", createdAt: "2026-06-01",
  },
];

export const mockLoanRepayments: LoanRepayment[] = [
  { id: "REP-001", loanId: "LOAN-001", staffId: "STF-003", staffName: "Rahul Das", date: "2026-04-30", amount: 5000, mode: "cash", notes: "April EMI" },
  { id: "REP-002", loanId: "LOAN-001", staffId: "STF-003", staffName: "Rahul Das", date: "2026-05-31", amount: 5000, mode: "cash", notes: "May EMI" },
  { id: "REP-003", loanId: "LOAN-002", staffId: "STF-002", staffName: "Priya Sharma", date: "2026-05-31", amount: 5000, mode: "bank_transfer", referenceNumber: "NEFT998877", notes: "Deducted from May salary" },
  { id: "REP-004", loanId: "LOAN-002", staffId: "STF-002", staffName: "Priya Sharma", date: "2026-06-30", amount: 5000, mode: "bank_transfer", referenceNumber: "NEFT112244", notes: "Deducted from June salary — fully closed" },
];
