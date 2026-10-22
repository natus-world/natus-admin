import { supabase } from './supabase';

/**
 * Every read and action of the panel is one `admin_*` function in the
 * database (natus-mvp, supabase/migrations/20261018120000_admin.sql and
 * after). Each checks that the caller is in `admins` and logs what it must.
 * A new metric is a new function there and one more wrapper here.
 */
export class AdminError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message);
  }
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new AdminError(error.message, error.code);
  return data as T;
}

export type Overview = {
  accounts: number;
  anonymous: number;
  accounts_7d: number;
  premium_paying: number;
  premium_trial: number;
  premium_gifted: number;
  active_7d: number;
  ai_spend_month: number;
  crisis_alerts_7d: number;
};

export type Daily = { day: string; accounts: number; started: number; opened: number };
export type Hourly = { hour: number; started: number; map_seen: number; accounts: number };
export type Spend = { day: string; purpose: string; calls: number; failed: number; cost_usd: number };
export type Crisis = { day: string; severity: string; surface: string; alerts: number; not_their_case: number };
export type Person = {
  user_id: string;
  email: string | null;
  name: string | null;
  country: string | null;
  created_at: string;
  plan: 'free' | 'premium' | 'gift';
  last_opened: string | null;
};
export type CrisisAlert = {
  id: string;
  user_id: string;
  has_account: boolean;
  name: string | null;
  email: string | null;
  at: string;
  severity: 'low' | 'high';
  category: string;
  surface: string;
  matched: string[];
  excerpt: string;
  from_clinical: boolean;
  not_their_case: boolean | null;
};
export type Expense = {
  id: string;
  service: string;
  purpose: string;
  plan: string;
  amount_usd: number | null;
  frequency: 'monthly' | 'yearly' | 'usage' | 'once';
  status: 'active' | 'to_buy' | 'canceled';
  paid_by: 'personal' | 'company' | 'free';
  since: string | null;
  notes: string;
  updated_at: string;
};
export type InboxRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  last_body: string;
  last_author: 'person' | 'team';
  last_at: string;
  unread: number;
  crisis: boolean;
};
export type ThreadRow = {
  id: string;
  author: 'person' | 'team';
  body: string;
  screen: string | null;
  crisis_flagged: boolean;
  created_at: string;
};
export type ContentKind =
  | 'chat'
  | 'journal'
  | 'checkins'
  | 'routine'
  | 'memory'
  | 'crisis'
  | 'soul_map'
  | 'chart'
  | 'paths';

const one = <T,>(rows: T[] | null): T | null => (rows && rows[0]) ?? null;

export const api = {
  whoami: async () => one(await call<{ role: string }[]>('admin_whoami')),
  overview: async () => one(await call<Overview[]>('admin_overview')),
  daily: (days: number) => call<Daily[]>('admin_daily', { p_days: days }),
  funnel: (from: string, to: string) =>
    call<{ step: string; people: number }[]>('admin_funnel', { p_from: from, p_to: to }),
  funnelDetail: (step: string, from: string, to: string) =>
    call<{ detail: string; people: number }[]>('admin_funnel_detail', { p_step: step, p_from: from, p_to: to }),
  funnelBySource: (from: string, to: string) =>
    call<{ source: string; step: string; people: number }[]>('admin_funnel_by_source', { p_from: from, p_to: to }),
  hourly: (day: string) => call<Hourly[]>('admin_hourly', { p_day: day }),
  stepTimes: (steps: string[], from: string, to: string) =>
    call<{ step: string; people: number; median_seconds: number }[]>('admin_step_times', {
      p_steps: steps,
      p_from: from,
      p_to: to,
    }),
  dailyRange: (from: string, to: string) => call<Daily[]>('admin_daily_range', { p_from: from, p_to: to }),
  spendRange: (from: string, to: string) => call<Spend[]>('admin_ai_spend_range', { p_from: from, p_to: to }),
  crisisRange: (from: string, to: string) => call<Crisis[]>('admin_crisis_counts_range', { p_from: from, p_to: to }),
  spend: (days: number) => call<Spend[]>('admin_ai_spend', { p_days: days }),
  crisis: (days: number) => call<Crisis[]>('admin_crisis_counts', { p_days: days }),
  expenses: () => call<Expense[]>('admin_expenses'),
  saveExpense: (id: string | null, e: Record<string, unknown>) =>
    call<string>('admin_expense_save', { p_id: id, p: e }),
  deleteExpense: (id: string) => call<null>('admin_expense_delete', { p_id: id }),
  crisisList: (days: number) => call<CrisisAlert[]>('admin_crisis_list', { p_days: days }),
  people: (query: string) => call<Person[]>('admin_people', { p_query: query, p_limit: 200 }),
  person: (id: string) => call<Record<string, unknown>>('admin_person', { p_user: id }),
  content: (id: string, kind: ContentKind) =>
    call<Record<string, unknown>[]>('admin_person_content', { p_user: id, p_kind: kind, p_limit: 300 }),
  grantPremium: (email: string, months: number | null) =>
    call<string>('admin_grant_premium', { p_email: email, p_months: months }),
  revokePremium: (id: string) => call<null>('admin_revoke_premium', { p_user: id }),
  inbox: () => call<InboxRow[]>('admin_feedback_inbox', { p_limit: 200 }),
  thread: (id: string) => call<ThreadRow[]>('admin_feedback_thread', { p_user: id }),
  reply: (id: string, body: string) => call<string>('admin_feedback_reply', { p_user: id, p_body: body }),
};
