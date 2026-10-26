# CLAUDE.md

The Natus admin panel (owner, 15 and 18 Oct 2026): its own site at
https://admin.natus.world, never inside the user app, on the same Supabase
project as `natus-mvp`. Only the team enters: Google sign-in, then the
`admins` table decides.

## How it is built

- React 19 + Vite + TypeScript, no router (sections by `#hash`), plain CSS in
  `src/styles.css` with Natus's night palette and faces.
- **Every read and every action is one `admin_*` function in the database**,
  defined in natus-mvp's migrations (`20261018120000_admin.sql`,
  `20261018140000_feedback.sql`). Each starts with `admin_require()`, which
  refuses anybody not in `admins` and writes `admin_access_log` for every
  look at one person. The browser never reads a table directly.
- A function that writes the log must be `volatile`: PostgREST runs a
  `stable` one in a read-only transaction (a pgTAP test in natus-mvp checks).
- The Supabase URL and publishable key in `src/config.ts` are public
  identifiers, as in the user app. Nothing secret lives here.

## The order of the panel (owner, 23 Oct 2026)

From the approved mockup «Panel Natus como la app» (the cerebro keeps it in
`diseno/panel-admin/`): the **Pulso** first, then four questions — **¿Llegan?
¿Les sirve? ¿Vuelven? ¿Pagan?** — then **Personas** (each file, with friends
and each friendship), **Cuidado** (crisis alerts, errors, suggestions) and
**Ajustes** (fixed costs, gifting Premium). The bar on top holds the period
and the comparison for the four questions, and what is urgent everywhere.
Each page opens with its conclusion as the title. The look is the app's: the
Carta's starry sky (`public/img`, from natus-mvp's photo bank), an even veil,
glass, Cormorant for titles and numbers; one cream for data, a blue and a
green only for several series (`src/charts.tsx`, hand-drawn SVG, every mark
with a hover). The main number is people active per week (owner). A
friendship that ended shows that it existed, never its comparisons' text
(owner). Functions: `20261024010000_admin_panel_v2.sql` in natus-mvp.
Measured since 24 Oct 2026 (`20261024030000_funnel_owed_to_the_panel.sql`),
so a step reads «desde el 24 oct» while it has nothing in the period: screens
viewed («Qué pantallas abren», «Abrieron su carta»), the tap on «Empezar mes
gratis» and the return from PayPal, the invite link opened, the invite link
as origin («Invitación de un amigo»), a comparison opened by the other
friend and the chat about a friendship (shown in the friendship, also after
it ended). Arrivals before that date are still estimated by dates.
Each person's file opens «Su carta» on request (logged, `admin_person_chart`):
what it was cast from, warnings (no hour, a city typed and not picked,
readings of an older chart), every point with Davraz's reading, the aspects;
and a comparison shows its twelve areas and how Davraz read each cross.
Segments (owner, 24 Oct 2026, approved mockup «Panel Natus · segmentos»):
the bar holds «Segmento» (`src/segment.tsx`) — country where they live or
were born, age band, how they are addressed — kept per admin on the server,
so it stays across pages and reloads; the page under it remounts on change
(`version`). Every number follows it, and so does the people list. «Quiénes
son» (`sections/Quienes.tsx`) shows the groups and a map (`CountryMap.tsx`,
loaded only there: d3-geo, Natural Earth 1:110m from world-atlas,
i18n-iso-countries for the codes); a row or a circle sets the filter.
«Macro datos» (owner, 25 Oct 2026; `sections/Macro.tsx`, under the Pulso):
one table of the main numbers for the period, two a row, each with the
period before when comparing; the «hoy» ones are today's state and carry no
change. Monthly income is paying × US$ 10 (`PRICE_USD`).

## Adding something

A new metric or action: a new `admin_*` function in a natus-mvp migration
(with its pgTAP test that a non-admin is refused), a wrapper in `src/api.ts`,
and a section in `src/sections/` registered in `SECTIONS` in `src/App.tsx`.

## Access

Admins are rows in `public.admins` (user id of a Google account that has
entered Natus), written by hand with SQL — never through the API. Today: the
owner and his partner Bryant (role `admin`, the same access, since 26 Oct
2026). Later hires may get narrower
roles (`admins.role`).

## Owed: make it private again (owner, 18 Oct 2026)

The repository is **public** because GitHub Pages is free only for public
repositories on the organisation's plan. Nothing secret is in it — the data
is guarded by the sign-in and `admins` on the server — but the owner wants
it private again later: pay GitHub Team (about US$4 a user a month), then
Settings → General → Change visibility → Make private. Pages keeps working.

## Tab icon (owner, 19 Oct 2026)

`public/favicon.svg` is the snake's head cut from the ouroboros, cream in
dark and green in light, so the panel is told apart from the app (gold N)
and the website (plain N) among open tabs.

## Running it locally

`pnpm dev` with a `.env.local` holding `VITE_SUPABASE_URL` and
`VITE_SUPABASE_KEY` of a local stack (`supabase start` in natus-mvp). Google
does not reach a local stack, so a development build also shows an
email-and-password form; create a local user and add it to `admins`.

## Language

Interface text in neutral Spanish with tú. Code, comments and docs in English.
Exact dependency pins, the same versions as natus-mvp.
