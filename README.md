# Smart Panchayat
### Village Grievance & Governance Portal — Coimbatore District, Tamil Nadu

A single-service, zero-config rebuild of the "Smart Panchayat" concept: one
`node server.js` command, no MongoDB, no Docker, no build step, no peer
dependency conflicts. Everything in this document was actually run and
verified, not just written.

---

## Why this exists

You uploaded `smart-panchayat-fullstack.zip` — a MERN + Flask three-service
build — and asked for verification plus something better/more aesthetic.
I actually installed and ran that project rather than just reading it, and found:

| Issue | What I found |
|---|---|
| Server hangs with no MongoDB | `server.listen()` never fires — no error, no timeout. A dead process with zero explanation. |
| Client `npm install` fails out of the box | React 19 conflicts with `lucide-react`/`react-leaflet`'s peer dependency range (`^16–18`). Undocumented `--legacy-peer-deps` required. |
| Setup burden | Needs 3 separate running services (MongoDB, Node, Python/Flask) or Docker before a single pixel renders. |

This rebuild fixes all three by design: **one Node process, one JSON
datastore, zero external services.** Run `./run.sh` and it works.

---

## What's here

- **Backend**: Express + a plain JSON-file datastore (`server/db.js`) —
  no native bindings, no database server, no build step.
- **Frontend**: dependency-free HTML/CSS/JS (Leaflet + Chart.js via CDN for
  the map and analytics) — no Vite, no React, no peer-dependency risk.
- **Deterministic priority scoring** (`server/priority.js`): a transparent,
  rule-based score (category weight + urgent-keyword detection), not a
  black box — the same "explainable AI" principle as the original brief's
  ML service, without needing a trained model or a second running process.
- **Design**: a genuine visual identity grounded in the subject rather than
  a generic admin-panel look — see "Design notes" below.

---

## Running it

### Prerequisites
Just **Node.js 18+**. Nothing else.

### One command
```bash
cd smart-panchayat-v2
./run.sh
```
This installs dependencies, seeds a synthetic demo dataset (60 fictional
complaints across 12 wards) on first run, and starts the server.

### Manual
```bash
cd smart-panchayat-v2/server
npm install
node seed.js        # generates server/data/complaints.json (run once)
node server.js
```

Then open **http://localhost:4000**.  **https://smart-panchayat-v2.onrender.com/index.html**

---

## Using it

**As a citizen** (no login needed):
- Home → **Lodge a Complaint** → fill the form → get a complaint ID stamped
  on screen like an official receipt.
- **Track Status** → enter that ID → see a dated progress ledger.

**As ward staff**:
- **Officer Login** in the nav →
  - `officer@smartpanchayat.demo` / `officer123` — sees only Ward 1's queue
  - `admin@smartpanchayat.demo` / `admin123` — sees the full district:
    Overview, the full Complaints Register (filter/search/update status),
    a Leaflet map of every complaint colored by status, and Analytics
    (status/priority/category charts + a 12-week trend line).

---

## Design notes

Grounded in the actual subject rather than a generic template: a
*panchayat* literally means a village council meeting under a banyan tree,
and Tamil Nadu households draw a *kolam* — a geometric rice-flour pattern —
at their threshold every dawn. The kolam motif is the page's signature
element: it draws itself in on page load (an SVG stroke animation), echoing
the ritual of drawing a new one each morning — a fitting metaphor for "a
new complaint, a new day, the community responding."

- **Palette**: deep indigo (`#1F2A44`, temple-ink) as the dominant tone
  instead of the cream-background/serif/terracotta combination that's
  become an AI-design default; turmeric (`#E2A33D`) as the single accent;
  banyan green and terracotta reserved for semantic meaning only
  (resolved / high-priority), never decoration.
- **Typography**: Fraunces (display) + Work Sans (body) + IBM Plex Mono
  (complaint IDs, timestamps — it reads like a stamped official record).
- **The "stamp" moment**: submitting a complaint shows the new ID inside a
  rotated, hand-stamped-looking border — real government paperwork gets
  physically stamped, so the receipt screen echoes that.
- **The ledger**: status history is shown as a dated logbook, not a
  generic progress bar — it's literally a register of who did what, when.

---

## Project structure

```
smart-panchayat-v2/
├── server/
│   ├── server.js        # all API routes
│   ├── db.js             # JSON-file datastore
│   ├── priority.js       # deterministic, explainable priority scoring
│   ├── seed.js            # synthetic demo dataset generator
│   ├── data/complaints.json, wards.json   (generated)
│   ├── uploads/            (complaint photos)
│   └── package.json
├── public/
│   ├── index.html          # landing page
│   ├── complaint.html       # lodge a complaint
│   ├── track.html           # track by ID
│   ├── login.html           # officer/admin login
│   ├── dashboard.html       # register / map / analytics (auth-gated)
│   ├── css/style.css
│   └── js/api.js
├── run.sh
└── README.md
```

## API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| GET | `/api/wards` | — | List wards (for form dropdowns) |
| GET | `/api/public-stats` | — | Anonymized homepage ticker stats |
| POST | `/api/complaints` | — | Lodge a complaint (multipart, optional photo) |
| GET | `/api/complaints/:id` | — | Public tracking lookup |
| POST | `/api/auth/login` | — | Demo login |
| GET | `/api/auth/me` | ✓ | Current session info |
| GET | `/api/complaints` | ✓ | List/filter/search (officers scoped to their ward) |
| PATCH | `/api/complaints/:id/status` | ✓ | Update status + note |
| GET | `/api/analytics` | ✓ | Aggregate stats + 12-week trend |

## Limitations (stated plainly)

- **JSON-file storage**, not a real database — fine for a single-instance
  demo, not for concurrent multi-instance production use.
- **In-memory sessions** — restarting the server logs everyone out (by
  design, for a demo).
- **Single hardcoded officer/admin account each** — no self-serve staff
  registration, no password reset, no RBAC beyond officer-vs-admin.
- **No image-authenticity/ML classification** — the original brief's
  Flask/scikit-learn service is not reproduced here; priority scoring is
  transparent rule-based logic instead, which is arguably more defensible
  for a grievance system anyway.
- **Photo uploads stored on local disk** — fine for a demo, not for a
  multi-server deployment (would need object storage in production).

## Ethical note

All names, phone numbers, complaints, and ward data are synthetic and
fictional, generated for demonstration purposes only.
