# NextGen LMS – frontend

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · TanStack Query · Zustand · React Hook Form + Zod

## Run it on Windows

You need the backend running first (from `nextgen-lms-backend`):

```powershell
cd C:\Projects\NextGenLMS\nextgen-lms-backend
php artisan serve
```

Then, in a second PowerShell window:

```powershell
cd C:\Projects\NextGenLMS\nextgen-lms-frontend
copy .env.example .env
npm install
npm run dev
```

Open http://localhost:5173.

The dev server forwards `/api` and `/sanctum` to Laravel (`VITE_API_PROXY` in `.env`), so the
browser only ever talks to one address and Sanctum's login cookie just works.

Demo accounts from the backend seeder (password `password`):
`superadmin@nextgen.test`, `owner.church@nextgen.test`, `owner.corp@nextgen.test`, `dual@nextgen.test`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests as you edit |
| `npm run lint` | Lint with oxlint |

## Structure

```
src/
  app/          router and providers (React Query, toasts)
  components/   shared UI kit (buttons, inputs, cards, badges…)
  layouts/      public, auth and signed-in app layouts
  features/
    auth/          login, register, password reset, guards, useMe
    dashboard/     home screen
    marketplace/   public catalogue and course page
    organisations/ create organisation, members, invitations, accept invitation
    courses/       my teaching, organisation courses, course editor
    admin/         platform course review queue
  lib/          API client, formatting, form helpers
  stores/       workspace (current organisation) and toasts
  types/        API response types
```

## How it talks to the API

- `lib/api.ts` unwraps the `{ success, message, data, meta }` envelope and turns error envelopes
  into `ApiError` (with `status`, `code`, and field `errors`).
- The current workspace lives in `stores/workspace.ts` (saved per browser). Requests to
  `/organisation/*` automatically carry it in the `X-Organisation` header.
- What a user may do in an organisation comes from `GET /organisation/current` (`permissions`).
  The UI hides actions people can't take; the API still checks every request.
- Prices are integers in kobo. `formatPrice()` displays them; `toMinor()` converts typed naira.
