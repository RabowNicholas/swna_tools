# New Client Onboarding: send the intro email from the app

## Context
Every new client gets the same email: a DocuSign envelope (contract, ROI, Work
History Questionnaire) followed by an Outlook email with three PDFs. It's done by
hand each time. The goal is one tool that sends the email from the signed-in
person's own Outlook account with the right files attached, and logs it.

## STATUS: PAUSED (11/6/26), build all of it at once later
Waiting on two things:
1. **The Microsoft 365 switch.** SWNA is moving from personal Outlook.com
   addresses to a Microsoft 365 setup with new emails. Connect Outlook only after
   that, so nobody has to reconnect.
2. **DocuSign API pricing.** SWNA is on the Standard plan, which generally doesn't
   include API sending. Nick is checking what an API plan or add-on costs.

When both are settled, build everything in one pass: Outlook send, DocuSign
envelope, page, Settings and log.

**Changes once the move to Microsoft 365 is done** (supersedes the Outlook.com details below):
- **App registration:** single-tenant in SWNA's own Microsoft 365 account, with
  the authority `login.microsoftonline.com/<tenant-id>` instead of `/common`. An
  admin grants consent once for everyone.
- **Return address:** update SWNAdvocates@outlook.com in the email text to the
  new address.
- **App logins:** update the login emails in `web/src/lib/users.ts`. Consider
  replacing password login with Microsoft sign-in (next-auth's Microsoft Entra
  ID provider), which would also handle the Outlook connection in the same step.
- **Settings card:** with Microsoft sign-in, the Outlook card shrinks to a status
  line.

## Facts
- The email is sent from each person's own mailbox, so each account gets connected.
- Attachments are the same for every client, ~2 MB total, so a server-side Graph
  `sendMail` with inline attachments fits under both Vercel's 4.5 MB request
  limit and Graph's 4 MB message limit. The app reads them in the browser from
  `1. SWNA Shared Folder/8. SWNA Internal Docs & Forms/AR Forms and Intro Letters/`:
  - `1 - AR Form (v 9.0).pdf` (Attachment 1)
  - `8 - Authorization to Use Signature.pdf` (Attachment 2)
  - `NEW - Claim Process and Company Info.pdf` (Attachment 3)
- Subject: **DOL Claim: Intro to SWNA**, editable before sending.
- The client's email address comes from the Airtable `Email` field, editable on the page.

## One-time setup (Nick, outside the code)
1. Register an app at entra.microsoft.com → App registrations. For supported
   account types, pick "Any Entra ID tenant + personal Microsoft accounts".
2. Redirect URI (Web): `https://<vercel domain>/api/outlook/callback`, plus
   `http://localhost:3000/api/outlook/callback` for local testing.
3. Add the API permissions `Mail.Send`, `offline_access` and `User.Read`, then
   create a client secret.
4. In Vercel, set `MS_CLIENT_ID`, `MS_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY`
   (32 random bytes).
5. Run the new SQL migration on Neon.

## Build

### 1. Token storage
- `web/scripts/sql/003_outlook_tokens.sql`: table `outlook_tokens` with columns
  `email` (app user, lowercase, primary key), `ms_address` (the Outlook mailbox
  connected), `refresh_token` (AES-GCM encrypted) and `updated_at`.
- `web/src/lib/outlook/tokens.ts` (server only): save, load and delete, encrypting
  with `TOKEN_ENCRYPTION_KEY` (Node `crypto`). Uses `sql` from `@/lib/events/db`,
  the same pattern as `lib/profiles.ts`.
- `web/src/lib/outlook/graph.ts`: `authorizeUrl(state)`, `exchangeCode`,
  `refreshAccessToken` (store the rotated refresh token each time) and
  `sendMail({to, subject, html, attachments})`. Uses plain `fetch` against
  `login.microsoftonline.com/common` and `graph.microsoft.com/v1.0/me/sendMail`,
  with no new dependencies.

### 2. API routes (all `requireAuth`, keyed by the session email)
- `GET /api/outlook/connect` redirects to Microsoft with a signed `state` cookie.
- `GET /api/outlook/callback` checks the state, exchanges the code, reads
  `/me` for the address, stores the token, and redirects to `/settings?outlook=connected`.
- `GET /api/outlook/status` returns `{ connected, address }`.
- `POST /api/outlook/disconnect` deletes the row.
- `POST /api/outlook/send` takes multipart form data (to, subject, html body,
  files[]). It refreshes the token, calls Graph and returns ok or a plain-English
  error. A revoked or expired token returns a "Reconnect Outlook in Settings"
  message. Wrapped in `withToolTracking('onboarding', …)` (`lib/events/with-tracking.ts`).

### 3. Settings (`web/src/app/settings/page.tsx`)
- New **Outlook** card: "Connect Outlook" when not connected; "Connected as
  x@outlook.com" with a Disconnect button when connected.
- **Email signature** fields: full name ("Nick Rabow") and phone. Stored by adding
  `full_name` and `phone` columns to `profiles` (in the same migration), extending
  `Profile` in `lib/profiles.ts` and `/api/profile`. The signature reads
  "Thank you, / {full name} / SWNA / {phone}".

### 4. Onboarding tool: `web/src/app/forms/onboarding/page.tsx`
- `ClientSelector` (as the other forms use it), then a card with:
  - To: the client's Airtable `Email` (editable); Subject (editable).
  - A "Chest X-ray being set up" checkbox, which adds or drops that sentence.
  - Body: the email text with the agreed fixes ("Attachment 3 is", "returned to
    us"), greeting with the first name via `parseClientName`, and the signature
    from the profile. Shown as an editable preview, the way the text-message tool
    works.
  - An attachments list showing each file found or missing in Sync (read with
    `getSyncState` and `sharedFolderFrom` in `lib/files/sync-folder.ts`). Missing
    files block sending and name the file that wasn't found.
  - A **Send** button. It's disabled until Outlook is connected; if it isn't, it
    links to Settings.
- After sending, an `AirtableLogCard` with `requireReference={false}` and the
  action "Sent onboarding email with AR Form, Auth to Use Signature, Claim Process
  info". DocuSign is added to that line later.
- Register it in `web/src/lib/tools.ts` under "Start a new claim" as
  "Onboard a client".
- Email text lives in `web/src/lib/onboarding-email.ts` (pure function: first
  name, X-ray flag, signature → HTML + plain text), so it can be tested on its own.

### 5. DocuSign (decide based on pricing)
- **API plan:** a JWT-grant integration that sends one envelope from the existing
  template (contract, ROI, Work History Questionnaire) with the client's name and
  email filled in, before the Outlook email. The page runs "1. DocuSign →
  2. Email", and the log line includes "DocuSign sent".
- **No API plan:** a guided step that opens the template in DocuSign and shows the
  client's name and email with copy buttons, then a "DocuSign sent" checkbox
  before the email can go.

## Verification
- `npx tsc --noEmit` and `next build` from `web/`.
- Unit check of `onboarding-email.ts`: X-ray on and off, first-name greeting, signature.
- Locally: connect Nick's Outlook in Settings, send the onboarding email to Nick's
  own address, and confirm all three PDFs open, the text matches, and it shows
  in Sent Items. Then disconnect and reconnect.
- On the Vercel deploy: connect, send one more test email to an internal
  address, then do a real onboarding.
- Merge feature/onboarding-email to main once it passes.
