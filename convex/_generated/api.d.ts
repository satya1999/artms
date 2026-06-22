/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as bankAccounts from "../bankAccounts.js";
import type * as bankTransactions from "../bankTransactions.js";
import type * as bookings from "../bookings.js";
import type * as buses from "../buses.js";
import type * as cashEntries from "../cashEntries.js";
import type * as categories from "../categories.js";
import type * as coinWithdrawals from "../coinWithdrawals.js";
import type * as employees from "../employees.js";
import type * as expenses from "../expenses.js";
import type * as loanRepayments from "../loanRepayments.js";
import type * as payments from "../payments.js";
import type * as salaries from "../salaries.js";
import type * as settings from "../settings.js";
import type * as staff from "../staff.js";
import type * as staffLoans from "../staffLoans.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  bankAccounts: typeof bankAccounts;
  bankTransactions: typeof bankTransactions;
  bookings: typeof bookings;
  buses: typeof buses;
  cashEntries: typeof cashEntries;
  categories: typeof categories;
  coinWithdrawals: typeof coinWithdrawals;
  employees: typeof employees;
  expenses: typeof expenses;
  loanRepayments: typeof loanRepayments;
  payments: typeof payments;
  salaries: typeof salaries;
  settings: typeof settings;
  staff: typeof staff;
  staffLoans: typeof staffLoans;
  trips: typeof trips;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
