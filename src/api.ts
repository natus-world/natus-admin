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
export type ByModality = {
  slug: string;
  name: string;
  recommended: number;
  saved: number;
  dismissed: number;
  marked: number;
  ratings: number;
  avg_rating: number | null;
};
export type AppError = {
  id: string;
  created_at: string;
  kind: string;
  message: string;
  path: string | null;
  release: string | null;
  user_agent: string | null;
  stack: string | null;
  user_id: string | null;
  name: string | null;
  email: string | null;
};
export type AiFailure = {
  purpose: string;
  outcome: string;
  error_kind: string;
  calls: number;
  people: number;
  recovered: number;
  last_at: string;
};
export type Pending = {
  unread_suggestions: number;
  app_errors_7d: number;
  top_error_path: string | null;
  crisis_7d: number;
  payment_failures_7d: number;
};
export type PersonSummary = {
  need: string | null;
  topics: string[] | null;
  openness: string[] | null;
  works: { title: string; avg: number; times: number }[];
  low_rated: { title: string; avg: number }[];
  marked: number;
  dismissed: { slug: string; at: string }[];
  saved: string[];
  proposals: { accepted: number; total: number };
  memory: { category: string; content: string }[];
  memory_count: number;
  chat_month: number;
  chat_hour: number | null;
  first_value_at: string | null;
};
export type Retention = {
  week_start: string;
  accounts: number;
  activated: number;
  back_d1: number;
  back_w1: number;
  back_w2: number;
  back_m1: number;
  back_after: number;
};
export type WeeklyUse = {
  week_start: string;
  active: number;
  practices: number;
  chat: number;
  journal: number;
  meditations: number;
  comparisons: number;
};
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

export type Growth = { week_start: string; kept: number; new_people: number; returned: number; lost: number };
export type CohortPoint = { cohort: string; week_n: number; accounts: number; active: number };
export type FreeUsage = {
  feature: 'chat' | 'meditation' | 'comparison';
  free_people: number;
  used_all: number;
  started_trial: number;
  kept_using: number;
  did_not_return: number;
};
export type PremiumRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  kind: 'paying' | 'trial' | 'gifted';
  since: string | null;
  until: string | null;
  granted_by_name: string | null;
  ai_month: number;
  fixed_share: number;
  paid_month: number;
};
export type Friends = {
  accounts: number;
  shared: number;
  accepted: number;
  new_by_invite: number;
  befriended: number;
  compared: number;
  comparisons: number;
  active_friendships: number;
  ended: number;
};
export type Inviter = {
  user_id: string;
  name: string | null;
  shared: number;
  accepted: number;
  new_people: number;
  comparisons: number;
  last_at: string;
};
export type PersonFriend = {
  friendship_id: string;
  friend_id: string;
  friend_name: string | null;
  invited_by_them: boolean;
  status: 'accepted' | 'removed';
  since: string;
  ended_at: string | null;
  ended_by_them: boolean;
  comparisons: number;
  friend_arrived_by_invite: boolean;
};
export type Friendship = {
  id: string;
  status: 'accepted' | 'removed' | 'pending' | 'declined';
  since: string;
  ended_at: string | null;
  ended_by: string | null;
  requester: { id: string; name: string | null };
  addressee: { id: string; name: string | null; arrived_by_invite: boolean };
  readable: boolean;
  comparisons: {
    id: string;
    created_at: string;
    asked_by: string;
    aspects: number;
    result: Record<string, unknown> | null;
  }[];
};
export type PersonRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  country: string | null;
  joined_at: string | null;
  plan: 'free' | 'premium' | 'gift';
  last_opened: string | null;
  source: string | null;
  device: string | null;
  activated: boolean;
  invited: number;
  chat_left: number | null;
  meditation_left: number | null;
  comparison_left: number | null;
};

export type TeamSuggestion = {
  id: string;
  author_id: string | null;
  author_name: string | null;
  section: string;
  body: string;
  created_at: string;
  mine: boolean;
};

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
  byModality: (from: string, to: string) => call<ByModality[]>('admin_by_modality', { p_from: from, p_to: to }),
  birthCity: async (from: string, to: string) =>
    one(
      await call<{ empty_search: number; did_not_continue: number }[]>('admin_birth_city', {
        p_from: from,
        p_to: to,
      }),
    ),
  appErrors: (from: string, to: string) =>
    call<AppError[]>('admin_app_errors', { p_from: from, p_to: to, p_limit: 500 }),
  aiFailures: (from: string, to: string) => call<AiFailure[]>('admin_ai_failures', { p_from: from, p_to: to }),
  pending: async () => one(await call<Pending[]>('admin_pending')),
  personSummary: (id: string) => call<PersonSummary>('admin_person_summary', { p_user: id }),
  retention: (weeks: number) => call<Retention[]>('admin_retention', { p_weeks: weeks }),
  firstAction: (from: string, to: string) =>
    call<{ action: string; people: number }[]>('admin_first_action', { p_from: from, p_to: to }),
  weeklyUse: (weeks: number) => call<WeeklyUse[]>('admin_weekly_use', { p_weeks: weeks }),
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
  growth: (weeks: number) => call<Growth[]>('admin_growth', { p_weeks: weeks }),
  cohortCurve: (weeks: number) => call<CohortPoint[]>('admin_cohort_curve', { p_weeks: weeks }),
  openDays: (from: string, to: string) =>
    call<{ bucket: string; people: number }[]>('admin_open_days', { p_from: from, p_to: to }),
  heatmap: (from: string, to: string) =>
    call<{ dow: number; hour: number; actions: number }[]>('admin_activity_heatmap', { p_from: from, p_to: to }),
  ratings: (from: string, to: string) => call<{ rating: number; n: number }[]>('admin_ratings', { p_from: from, p_to: to }),
  lastSteps: (week: string) => call<{ step: string; people: number }[]>('admin_last_steps', { p_week: week }),
  freeUsage: () => call<FreeUsage[]>('admin_free_usage'),
  premiumList: () => call<PremiumRow[]>('admin_premium_list'),
  friends: async (from: string, to: string) => one(await call<Friends[]>('admin_friends', { p_from: from, p_to: to })),
  topInviters: (from: string, to: string) =>
    call<Inviter[]>('admin_top_inviters', { p_from: from, p_to: to, p_limit: 20 }),
  personFriends: (id: string) => call<PersonFriend[]>('admin_person_friends', { p_user: id }),
  friendship: (id: string) => call<Friendship | null>('admin_friendship', { p_id: id }),
  teamSuggestions: () => call<TeamSuggestion[]>('admin_suggestions_list'),
  addTeamSuggestion: (section: string, body: string) =>
    call<string>('admin_suggestion_add', { p_section: section, p_body: body }),
  deleteTeamSuggestion: (id: string) => call<null>('admin_suggestion_delete', { p_id: id }),
  peopleList: (query: string) => call<PersonRow[]>('admin_people_list', { p_query: query, p_limit: 200 }),
};
