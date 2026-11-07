# Run The Demo — LCCB Academix

Full local runbook to bring the system up yourself (no assistant needed).

## Prerequisites
- Node 22+ (nvm shows 24.19.0 currently in use)
- Dependencies installed (`npm install`) in the repo root

## 1. Reset the demo database (fresh demo data)
Open PowerShell in the repo root:
```powershell
$env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/lccb_academix'
npm run db:reset
```
(`db:reset` refuses the hosted database automatically — it only touches local.)

## 2. Start the API
In the same window (keep it open):
```powershell
$env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/lccb_academix'
$env:PORT='4000'
$env:JWT_SECRET='dev-secret-change-me'
$env:NODE_ENV='development'
$env:FRONTEND_ORIGIN='http://localhost:5173,http://127.0.0.1:5173,http://192.168.254.118:5173,http://192.168.254.113:5173'
npm run server
```
Wait for `API ready on port 4000`, then sanity-check in a **second** window:
```powershell
curl http://localhost:4000/api/health
```

## 3. Stage the demo data (API must already be running)
```powershell
$env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/lccb_academix'
npm run demo:stage
```
`demo:stage` talks to the real API on `http://localhost:4000`, so this step fails if
the API in step 2 is not up yet. It is safe to re-run.

## 4. Start the frontend
In a third window:
```powershell
npm run dev
```

## 5. Open it
- This machine: **http://localhost:5173**
- Second computer (same WiFi): **http://192.168.254.118:5173**
  (the host's LAN IP — run `ipconfig` on the host if it changed)

## 6. Log in
Demo password: **`demo1234`**

| Role | Login |
|---|---|
| Learner (student `24-0870-103`) | `TE-128` |
| Tutor | `TU-042` |
| Faculty | `b.tisuela@lccbacolod.edu.ph` |
| Superadmin | `l.betita.admin@lccbacolod.edu.ph` |

## 7. Run the gates (optional but recommended)
```powershell
npm test
npm run build
npm run check:bundle
npm run demo:check -- http://localhost:4000
```

## Troubleshooting
- **Port 5432 busy / "pre-existing shared memory block is still in use"** — an old
  embedded Postgres is still alive. Close the API window, then stop leftover
  processes:
  ```powershell
  Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq 'postgres.exe' -and $_.CommandLine -like '*lccb-academix*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  ```
- **Port 4000 or 5173 already in use** — close the old terminal, or:
  ```powershell
  foreach ($p in 4000,5173) {
    $l = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($l) { Stop-Process -Id $l.OwningProcess -Force }
  }
  ```
- **`demo:stage` fails with ECONNREFUSED** — the API is not running yet. Start it
  (step 2), wait for `API ready`, then run step 3 again.
- **Second computer can't load the app** — the host LAN IP changed. Use the
  network URL Vite prints at startup.
- **CORS error on the second computer** — set `FRONTEND_ORIGIN` on the API to a
  comma-separated list that includes the LAN origin, as shown in step 2.

## Quick start (all steps, in order)

```powershell
# window 1 — reset, then run the API
$env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/lccb_academix'
npm run db:reset

$env:PORT='4000'
$env:JWT_SECRET='dev-secret-change-me'
$env:NODE_ENV='development'
$env:FRONTEND_ORIGIN='http://localhost:5173,http://127.0.0.1:5173,http://192.168.254.118:5173,http://192.168.254.113:5173'
npm run server

# window 2 — after "API ready on port 4000" appears in window 1
$env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/lccb_academix'
npm run demo:stage

# window 3 — frontend
npm run dev
```

Or double-click **`RUN_THE_DEMO_LAUNCHER.bat`** and it opens all three windows for you.
