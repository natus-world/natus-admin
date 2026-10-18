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

## Adding something

A new metric or action: a new `admin_*` function in a natus-mvp migration
(with its pgTAP test that a non-admin is refused), a wrapper in `src/api.ts`,
and a section in `src/sections/` registered in `SECTIONS` in `src/App.tsx`.

## Access

Admins are rows in `public.admins` (user id of a Google account that has
entered Natus), written by hand with SQL — never through the API. Today: the
owner; his partner next, with the same access. Later hires may get narrower
roles (`admins.role`).

## Running it locally

`pnpm dev` with a `.env.local` holding `VITE_SUPABASE_URL` and
`VITE_SUPABASE_KEY` of a local stack (`supabase start` in natus-mvp). Google
does not reach a local stack, so a development build also shows an
email-and-password form; create a local user and add it to `admins`.

## Language

Interface text in neutral Spanish with tú. Code, comments and docs in English.
Exact dependency pins, the same versions as natus-mvp.
