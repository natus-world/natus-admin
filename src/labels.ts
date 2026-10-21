/** Names in Spanish for what the database stores in English. */

export type Step = { key: string; label: string; hint?: string };

/**
 * The onboarding, in the order a person walks it: since the reorder of
 * 20–21 Oct 2026 the map's preview comes before the account, and «Cómo
 * trabajar» after it, right before «Para cuidarte».
 */
export const ONBOARDING: Step[] = [
  { key: 'onboarding_started', label: 'Empezó' },
  { key: 'birth_data_done', label: 'Datos de nacimiento' },
  { key: 'need_done', label: 'Escribió su pregunta', hint: 'Cuenta desde el 18 de octubre' },
  { key: 'soul_map_seen', label: 'Su mapa quedó escrito' },
  { key: 'signup_seen', label: 'Llegó a guardar su mapa', hint: 'Después del adelanto de su mapa' },
  { key: 'account_created', label: 'Creó su cuenta' },
  {
    key: 'openness_done',
    label: 'Respondió cómo trabajar',
    hint: 'Antes de la cuenta hasta el cambio de orden; después, desde entonces',
  },
  { key: 'care_done', label: 'Respondió las preguntas de cuidado' },
  { key: 'paths_seen', label: 'Vio sus caminos' },
];

export const USE: Step[] = [
  { key: 'first_practice', label: 'Marcó su primera práctica' },
  { key: 'first_chat', label: 'Hizo su primera pregunta a Davraz' },
  { key: 'friend_invited', label: 'Invitó a alguien' },
  { key: 'friend_accepted', label: 'Le aceptaron una invitación' },
];

export const MONEY: Step[] = [
  { key: 'paywall_seen', label: 'Vio Premium' },
  { key: 'trial_started', label: 'Empezó el mes gratis' },
  { key: 'first_charge', label: 'Primer cobro' },
  { key: 'canceled', label: 'Canceló' },
];

export const PAYWALL_PLACE: Record<string, string> = {
  welcome: 'Al terminar el ingreso',
  chat: 'En el chat',
  meditation: 'En meditaciones',
  comparison: 'En comparar cartas',
  profile: 'En su perfil',
  tip: 'En el tip de Hoy',
  '': 'Sin lugar',
};

export const PURPOSE: Record<string, string> = {
  soul_map: 'Mapa del Alma',
  match: 'Caminos',
  routine: 'Rutina',
  routine_review: 'Revisión de rutina',
  chat: 'Chat con Davraz',
  meditation: 'Meditaciones',
  comparison: 'Comparar cartas',
  memory: 'Memoria',
  chart_points: 'Lectura de la carta',
  daily_tip: 'Tip del día',
};

export const SURFACE: Record<string, string> = {
  onboarding: 'Onboarding',
  chat: 'Chat',
  meditation_intent: 'Meditación',
  practice_comment: 'Comentario de práctica',
  journal: 'Bitácora',
  memory: 'Memoria',
  feedback: 'Sugerencias',
};

export const PLAN: Record<string, string> = {
  free: 'Gratis',
  premium: 'Premium (paga)',
  gift: 'Premium regalado',
};

export const KINDS: { key: import('./api').ContentKind; label: string }[] = [
  { key: 'chat', label: 'Chat con Davraz' },
  { key: 'journal', label: 'Bitácora' },
  { key: 'checkins', label: 'Prácticas marcadas' },
  { key: 'routine', label: 'Rutina' },
  { key: 'paths', label: 'Caminos' },
  { key: 'memory', label: 'Memoria' },
  { key: 'soul_map', label: 'Mapa del Alma' },
  { key: 'chart', label: 'Carta natal' },
  { key: 'crisis', label: 'Alertas de crisis' },
];

export const label = (map: Record<string, string>, key: string) => map[key] ?? key;
