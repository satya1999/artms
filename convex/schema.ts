import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const paymentModeV = v.union(
  v.literal("cash"), v.literal("upi"), v.literal("bank_transfer"),
  v.literal("card"), v.literal("cheque")
);

export default defineSchema({
  trips: defineTable({
    id: v.string(),
    tripName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    departurePoint: v.string(),
    destination: v.string(),
    totalSeats: v.number(),
    sleeperSeats: v.number(),
    seatPrice: v.number(),
    sleeperPrice: v.number(),
    busAssigned: v.string(),
    status: v.union(
      v.literal("draft"), v.literal("published"), v.literal("active"),
      v.literal("completed"), v.literal("cancelled")
    ),
    createdAt: v.string(),
    inclusions: v.optional(v.string()),
  }).index("by_appId", ["id"]),

  bookings: defineTable({
    id: v.string(),
    bookingDate: v.string(),
    bookingDateTime: v.string(),
    passengerId: v.optional(v.string()),
    passengerName: v.string(),
    passengerMobile: v.string(),
    passengerAddress: v.optional(v.string()),
    passengerAadhaar: v.optional(v.string()),
    passengerAge: v.optional(v.number()),
    passengerGender: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
    tripId: v.string(),
    tripName: v.string(),
    seatNumber: v.string(),
    seatType: v.union(v.literal("seat"), v.literal("sleeper")),
    packageAmount: v.number(),
    discount: v.number(),
    discountReason: v.optional(v.string()),
    finalAmount: v.number(),
    advancePaid: v.number(),
    pendingAmount: v.number(),
    status: v.union(
      v.literal("tentative"), v.literal("confirmed"), v.literal("balance_due"),
      v.literal("fully_paid"), v.literal("cancelled"), v.literal("completed"),
      v.literal("no_show"), v.literal("waitlisted")
    ),
    source: v.union(v.literal("walk_in"), v.literal("phone"), v.literal("referral"), v.literal("agent")),
    collectedBy: v.string(),
    staffId: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentMode: v.optional(paymentModeV),
    paymentReferenceNumber: v.optional(v.string()),
    // paymentScreenshot excluded — too large for Convex docs (use File Storage separately)
    paymentProofStatus: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("rejected")
    )),
    rewardCoins: v.optional(v.number()),
  })
    .index("by_appId", ["id"])
    .index("by_tripId", ["tripId"])
    .index("by_staffId", ["staffId"]),

  payments: defineTable({
    id: v.string(),
    date: v.string(),
    bookingId: v.string(),
    passengerName: v.string(),
    tripName: v.string(),
    amount: v.number(),
    mode: paymentModeV,
    referenceNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
    collectedBy: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_appId", ["id"])
    .index("by_bookingId", ["bookingId"]),

  expenses: defineTable({
    id: v.string(),
    date: v.string(),
    type: v.union(v.literal("trip"), v.literal("company")),
    tripId: v.optional(v.string()),
    tripName: v.optional(v.string()),
    category: v.string(),
    description: v.string(),
    amount: v.number(),
    vendorName: v.optional(v.string()),
    billUrl: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    paymentMode: paymentModeV,
    addedBy: v.string(),
  }).index("by_appId", ["id"]),

  categories: defineTable({
    id: v.string(),
    name: v.string(),
    type: v.union(v.literal("expense"), v.literal("income"), v.literal("general")),
    description: v.optional(v.string()),
    parentId: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_appId", ["id"]),

  cashEntries: defineTable({
    id: v.string(),
    date: v.string(),
    type: v.union(v.literal("in"), v.literal("out")),
    category: v.string(),
    description: v.string(),
    amount: v.number(),
    referenceId: v.optional(v.string()),
    addedBy: v.string(),
  }).index("by_appId", ["id"]),

  bankAccounts: defineTable({
    id: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    ifscCode: v.string(),
    branch: v.string(),
    accountType: v.union(v.literal("current"), v.literal("savings"), v.literal("cash")),
    openingBalance: v.number(),
    active: v.boolean(),
  }).index("by_appId", ["id"]),

  bankTransactions: defineTable({
    id: v.string(),
    date: v.string(),
    bankAccountId: v.string(),
    bankName: v.string(),
    type: v.union(v.literal("credit"), v.literal("debit")),
    description: v.string(),
    amount: v.number(),
    referenceNumber: v.optional(v.string()),
    mode: v.string(),
    addedBy: v.string(),
  })
    .index("by_appId", ["id"])
    .index("by_bankAccountId", ["bankAccountId"]),

  employees: defineTable({
    id: v.string(),
    name: v.string(),
    designation: v.string(),
    department: v.string(),
    phone: v.string(),
    bankAccount: v.optional(v.string()),
    basicSalary: v.number(),
    joiningDate: v.string(),
    active: v.boolean(),
  }).index("by_appId", ["id"]),

  salaries: defineTable({
    id: v.string(),
    employeeId: v.string(),
    employeeName: v.string(),
    month: v.string(),
    year: v.number(),
    basicSalary: v.number(),
    bonus: v.number(),
    advance: v.number(),
    deductions: v.number(),
    netSalary: v.number(),
    paymentMode: paymentModeV,
    paymentDate: v.string(),
    status: v.union(v.literal("pending"), v.literal("paid")),
  })
    .index("by_appId", ["id"])
    .index("by_employeeId", ["employeeId"]),

  buses: defineTable({
    id: v.string(),
    registrationNumber: v.string(),
    model: v.string(),
    capacity: v.number(),
    type: v.union(v.literal("ac"), v.literal("non_ac"), v.literal("sleeper"), v.literal("semi_sleeper")),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_appId", ["id"]),

  staff: defineTable({
    id: v.string(),
    name: v.string(),
    mobile: v.string(),
    email: v.string(),
    address: v.string(),
    aadhaar: v.string(),
    joiningDate: v.string(),
    designation: v.string(),
    department: v.string(),
    role: v.union(
      v.literal("super_admin"), v.literal("accountant"),
      v.literal("booking_executive"), v.literal("tour_manager")
    ),
    roles: v.optional(v.array(v.union(
      v.literal("super_admin"), v.literal("accountant"),
      v.literal("booking_executive"), v.literal("tour_manager")
    ))),
    monthlySalary: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.string(),
  }).index("by_appId", ["id"]),

  staffLoans: defineTable({
    id: v.string(),
    staffId: v.string(),
    staffName: v.string(),
    type: v.union(v.literal("loan"), v.literal("advance")),
    amount: v.number(),
    disbursedDate: v.string(),
    purpose: v.string(),
    repaymentMonths: v.number(),
    emiAmount: v.number(),
    status: v.union(v.literal("active"), v.literal("closed"), v.literal("defaulted")),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_appId", ["id"])
    .index("by_staffId", ["staffId"]),

  settings: defineTable({
    id: v.string(),
    coinsPerBooking: v.number(),
    monthlyTarget: v.optional(v.number()),
  }).index("by_appId", ["id"]),

  coinWithdrawals: defineTable({
    id: v.string(),
    staffId: v.optional(v.string()),
    staffName: v.string(),
    coins: v.number(),
    rupeeValue: v.number(),
    method: v.union(v.literal("upi"), v.literal("bank_transfer"), v.literal("cash")),
    accountDetails: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), v.literal("approved"),
      v.literal("rejected"), v.literal("paid")
    ),
    requestedAt: v.string(),
    processedAt: v.optional(v.string()),
    processedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_appId", ["id"])
    .index("by_staffName", ["staffName"]),

  loanRepayments: defineTable({
    id: v.string(),
    loanId: v.string(),
    staffId: v.string(),
    staffName: v.string(),
    date: v.string(),
    amount: v.number(),
    mode: paymentModeV,
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_appId", ["id"])
    .index("by_loanId", ["loanId"]),

  users: defineTable({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"), v.literal("accountant"),
      v.literal("booking_executive"), v.literal("tour_manager")
    ),
    roles: v.optional(v.array(v.union(
      v.literal("super_admin"), v.literal("accountant"),
      v.literal("booking_executive"), v.literal("tour_manager")
    ))),
    passwordHash: v.string(),
    active: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_appId", ["id"])
    .index("by_email", ["email"]),
});
