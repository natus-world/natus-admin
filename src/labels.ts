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

/** Where a person came from: the link's tag or, without one, the browser or the page that sent them. */
export const SOURCE: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  threads: 'Threads',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  google: 'Google',
  'web-natus': 'Web de Natus',
  invitacion: 'Invitación de un amigo',
  otro: 'Otra página',
  '': 'Sin dato',
};

/** The first step's device and browser (from 22 Oct 2026). */
export const DEVICE: Record<string, string> = {
  movil: 'Celular',
  tablet: 'Tablet',
  computador: 'Computador',
};
export const BROWSER: Record<string, string> = {
  instagram: 'dentro de Instagram',
  facebook: 'dentro de Facebook',
  tiktok: 'dentro de TikTok',
  whatsapp: 'dentro de WhatsApp',
  threads: 'dentro de Threads',
  linkedin: 'dentro de LinkedIn',
  navegador: 'navegador',
};
export function deviceLabel(detail: string): string {
  if (!detail) return 'Sin dato (antes del 22 oct)';
  const [device = '', browser = ''] = detail.split('-');
  return `${DEVICE[device] ?? device} · ${BROWSER[browser] ?? browser}`;
}

/** Whether the hour was given on the birth step (from 22 Oct 2026). */
export const BIRTH_HOUR: Record<string, string> = {
  'con-hora': 'Dio su hora',
  'sin-hora': '«No sé mi hora»: carta sin Ascendente',
  'solo-numeros': '«No sé mi hora»: solo sus números',
  '': 'Sin dato (antes del 22 oct)',
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

/** The names the ephemeris returns, as the app shows them (natus-mvp `copy.astro.bodies`). */
export const BODY: Record<string, string> = {
  Sun: 'Sol',
  Moon: 'Luna',
  Mercury: 'Mercurio',
  Venus: 'Venus',
  Mars: 'Marte',
  Jupiter: 'Júpiter',
  Saturn: 'Saturno',
  Uranus: 'Urano',
  Neptune: 'Neptuno',
  Pluto: 'Plutón',
  Chiron: 'Quirón',
  Mean_Lilith: 'Lilith',
  True_North_Lunar_Node: 'Nodo norte',
  True_South_Lunar_Node: 'Nodo sur',
  Mean_North_Lunar_Node: 'Nodo norte',
  Mean_South_Lunar_Node: 'Nodo sur',
  Ascendant: 'Ascendente',
  Descendant: 'Descendente',
  Medium_Coeli: 'Medio cielo',
  Imum_Coeli: 'Fondo del cielo',
};

export const SIGN: Record<string, string> = {
  Aries: 'Aries',
  Taurus: 'Tauro',
  Gemini: 'Géminis',
  Cancer: 'Cáncer',
  Leo: 'Leo',
  Virgo: 'Virgo',
  Libra: 'Libra',
  Scorpio: 'Escorpio',
  Sagittarius: 'Sagitario',
  Capricorn: 'Capricornio',
  Aquarius: 'Acuario',
  Pisces: 'Piscis',
};

export const ASPECT: Record<string, string> = {
  conjunction: 'conjunción',
  sextile: 'sextil',
  square: 'cuadratura',
  trine: 'trígono',
  opposition: 'oposición',
};

export const DIGNITY: Record<string, string> = {
  domicilio: 'en domicilio',
  exaltacion: 'en exaltación',
  exilio: 'en exilio',
  caida: 'en caída',
};

/** «Las dos cartas»: the twelve areas, in the owner's order (natus-mvp `copy.comparison.areas`). */
export const AREA: Record<string, string> = {
  quienes_son: 'Quiénes son',
  lo_que_se_dan: 'Lo que se dan',
  lo_que_sienten: 'Lo que sienten',
  como_se_hablan: 'Cómo se hablan',
  lo_que_disfrutan: 'Lo que disfrutan juntos',
  atraccion: 'Atracción y química',
  sexualidad: 'Sexualidad y deseo',
  desacuerdo: 'Cuando no están de acuerdo',
  conviven: 'Cómo conviven',
  trabajan: 'Cómo trabajan juntos',
  sostiene: 'Lo que los sostiene',
  como_se_ven: 'Cómo se ven juntos',
};

export const CROSS_LABEL: Record<string, string> = {
  fluye: 'Fluye naturalmente',
  cultiva: 'Fluye si lo cultivan',
  trabajo: 'Pide más trabajo',
};
