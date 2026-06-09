# Repository Structure Audit and Cleanup Plan

> **Document status:** Audit and planning only — no code changes in this phase.  
> **Branch:** `plan/travelweb-ai-agent-upgrade`  
> **Audited:** 2026-06-09  
> **Related:** `docs/AI_AGENT_UPGRADE_PLAN.md` (feature upgrade — **do not start until cleanup phases complete**)

---

## 1. Executive Summary

**TravelWeb** is a Vietnamese full-stack tour booking product: React SPA (`src/`), Express API (`backend/`), MSSQL schema/scripts at repo root, nginx + GitHub Actions for EC2 frontend deploy, and a partially integrated AI chatbot layer (Express proxies to an external Python FastAPI service). The repo has **403 tracked files**, a working dev layout (`npm run dev` runs backend + frontend), and meaningful chat integration tests — but it was built quickly and carries structural debt that will block a clean AI Agent upgrade and cloud deployment.

**Portfolio acceptability:** Acceptable as a **demo-grade full-stack project** with real business features (booking, payment, admin, chat). Not yet acceptable as a **self-contained, clone-and-run portfolio repo** because the Python chatbot lives outside the repository.

**Ready for AI Agent upgrade?** **No** — not until the chatbot service is imported into `services/ai-agent/`, git hygiene is fixed, and deployment assumptions are normalized. The Express↔Python contract exists (`docs/chatbot-integration-refactor.md`), but the AI runtime is external.

**Ready for Docker / Cloud deployment?** **No** — no `Dockerfile`, no `docker-compose.yml` (and `.gitignore` actively ignores Docker files), CI deploys **frontend only**, backend is hardcoded to a VPN IP (`100.90.83.88:3001`), and **72 upload images (33MB) are committed to git**.

**Top 5 structural risks:**

1. **Python chatbot outside repo** — README points to `../AI_Project/Chatbot_AI` (exists locally at `/Users/nguyen_bao/Projects/AIproject/AI_Project/Chatbot_AI` but not in TravelWeb git). Cloners cannot run AI features.
2. **Git hygiene failures** — `backend/uploads/` (72 files) tracked; `.expo/` tracked; `package-lock.json` gitignored; `.gitignore` ignores `Dockerfile`/`docker-compose.yml` (discourages containerization).
3. **Hardcoded production IPs/domains** — `100.90.83.88`, `54.219.205.247`, `tourguideeeee.fun` in nginx, CORS, API fallbacks, and GitHub Actions.
4. **Admin auth role bug** — `backend/routes/adminRoutes.js` uses `restrictTo('admin')` but DB roles are `'Admin'`, `'Sales'`, `'Support'` (`sql_dataEx.sql`). Admin API may return 403 for valid admins (frontend uses `allowedRoles={["Admin"]}`).
5. **Unauthenticated analytics endpoints** — `GET /chat/insights` and `GET /chat/logs` are public; README already flags this.

---

## 2. Current Top-Level Structure

Simplified tree (excluding `node_modules/`, `build/`, `.git/`):

```
TravelWeb/
├── .claude/                    # Claude local settings
├── .expo/                      # Expo tooling artifacts (misplaced)
├── .github/workflows/deploy.yml
├── backend/                    # Express API
├── docs/                       # Planning + integration docs
├── public/                     # Static assets
├── src/                        # React frontend
├── sql_createTable.sql
├── sql_dataEx.sql
├── sql_chatbot_demo_tours_*.sql
├── sql_future_tours_2026_2027.sql
├── .env.example
├── .gitignore
├── fix-nginx-config.conf
├── nginx.conf
├── nginx-proxy.conf
├── package.json
├── README.md
```

### Classification table

| Path | Classification | Notes |
|------|----------------|-------|
| `src/` | **keep** | React app — core product |
| `backend/` | **keep but clean** | Express API — core; uploads/logs need gitignore |
| `public/` | **keep** | CRA static assets |
| `docs/` | **keep** | Growing planning docs |
| `sql_*.sql` | **keep** | DB schema + seed — consider `sql/` folder later |
| `README.md` | **keep but clean** | Good content; broken external chatbot path |
| `.env.example` | **keep** | Minimal — only `REACT_APP_API_URL` |
| `backend/.env.example` | **keep but clean** | Reasonably complete |
| `package.json` (root) | **keep but clean** | Bloated deps (Express in frontend package) |
| `backend/package.json` | **keep** | Lean backend deps |
| `.github/workflows/deploy.yml` | **keep but clean** | Hardcoded EC2 IP; frontend-only |
| `nginx.conf` | **suspicious / needs review** | Third nginx variant |
| `fix-nginx-config.conf` | **keep but clean** | Used by CI deploy |
| `nginx-proxy.conf` | **move later** → `infra/nginx/` | Duplicate concern |
| `.expo/` | **should be gitignored** | Tracked; not a React Native app |
| `.claude/` | **should be gitignored** | IDE-local |
| `backend/uploads/` (72 files) | **candidate for deletion after confirmation** | User-generated content in git |
| `backend/logs/` | **should be gitignored** | Already ignored; OK locally |
| `build/` (44MB local) | **should be gitignored** | Ignored; OK |
| `node_modules/` (1.8GB) | **should be gitignored** | Ignored; OK |
| `services/` | **missing — create in Cleanup Phase E** | Target for AI service |
| `infra/` | **missing — create later** | Docker, nginx, cloud templates |
| `scripts/` | **missing — optional** | DB seed, index build helpers |

**Local size snapshot (workspace):** `node_modules` 1.8G, `backend` 261M (mostly `backend/node_modules`), `build` 44M, `src` 1.2M, `docs` 1.0M.

---

## 3. Service Boundary Analysis

### 3.1 Current boundaries

| Service | Location | Boundary quality |
|---------|----------|------------------|
| **React frontend** | `src/` | **Clean** — UI, routing, API clients |
| **Express backend** | `backend/` | **Mostly clean** — but also serves `uploads/` static files |
| **Python chatbot** | **External:** `../AI_Project/Chatbot_AI` | **Broken boundary** — not versioned with product |
| **MSSQL** | External server + `sql_*.sql` | **Acceptable** — scripts in repo, DB hosted separately |
| **Deploy / proxy** | `nginx*.conf`, `.github/workflows/` | **Mixed** — infra config at repo root, not under `infra/` |

### 3.2 Files that blur responsibilities

| File / pattern | Issue |
|----------------|-------|
| Root `package.json` | Lists `express`, `cors`, `mssql`, `bcrypt`, `multer`, `nodemon` — backend concerns duplicated in frontend package |
| `backend/server.js` | Commented `@google/generative-ai` — AI belongs in Python service |
| `src/utils/API_Port.js` | Fallback hardcoded VPN IP `100.90.83.88:3001` in frontend |
| `backend/services/chatTourSearchService.js` | Tour search in Node (correct for MSSQL truth) but will need clear contract when agent tools arrive |
| `backend/uploads/` in git | Binary user content treated as source code |
| Three nginx configs at root | Unclear canonical file for local vs EC2 vs VPN proxy |

### 3.3 External chatbot project structure (reference only)

Located at `/Users/nguyen_bao/Projects/AIproject/AI_Project/Chatbot_AI` (~1.4GB with `.venv`, ~130MB excl. venv):

```
Chatbot_AI/
├── server.py              # FastAPI entry (port 8000)
├── requirements.txt
├── pipelines/             # TourRetrievalPipeline
├── services/
├── extractors/            # location, price, time
├── repositories/
├── schemas/
├── scripts/
├── tests/
├── data/                  # FAQ/intent JSON (~12MB)
├── faq_index.faiss        # 5.1MB
├── faq_metadata.json      # 1.3MB
├── training/              # VnCoreNLP jars ~52MB, training scripts
├── log/
├── docs/ai_context/
└── .venv/                 # 1.3GB — must NOT import
```

This is a **separate git repo** (has `.git/`, 65MB history). Express expects its HTTP contract via `PYTHON_CHATBOT_URL`.

---

## 4. Chatbot / AI Service Placement Decision

### 4.1 References to external chatbot in TravelWeb

| File | Reference |
|------|-----------|
| `README.md` | `cd ../AI_Project/Chatbot_AI` |
| `backend/.env.example` | `PYTHON_CHATBOT_URL=http://localhost:8000/chat` |
| `backend/services/pythonChatbotClient.js` | Default `http://localhost:8000/chat` |
| `docs/AI_AGENT_UPGRADE_PLAN.md` | Documents external path gap |
| `docs/chatbot-integration-refactor.md` | Contract only; stale absolute path in test link |

No `submodule` or `git subtree` configuration in TravelWeb (`.gitmodules` gitignored and absent).

### 4.2 Options evaluated

| Option | Local dev | CV reproducibility | Docker Compose | Cloud Run | GKE | Avoid huge git artifacts |
|--------|-----------|-------------------|----------------|-----------|-----|--------------------------|
| **A. Outside repo** | Poor (path-dependent) | **Fail** | Hard | Awkward | Awkward | Good |
| **B. `services/ai-agent/`** | **Good** | **Good** | **Good** | **Good** | **Good** | Good (if selective copy) |
| **C. Git submodule** | OK | OK | OK | OK | OK | Good | 
| **D. Separate repo only** | OK for API-only demos | Split story | Multi-repo compose | OK | OK | Good |

### 4.3 Recommendation: **Option B — `services/ai-agent/` via selective copy/import**

**Do not `git mv` the external folder.** Use a **one-time selective copy** from `AI_Project/Chatbot_AI` into `TravelWeb/services/ai-agent/`, then evolve toward the agent design in `AI_AGENT_UPGRADE_PLAN.md`.

**Justification:**

- **Local development:** `npm run dev` + `uvicorn` from known path; no sibling-folder assumptions.
- **CV/demo:** `git clone` + README = full stack story.
- **Docker Compose:** Standard pattern `services: [frontend, api-node, ai-agent]`.
- **Cloud Run / GKE:** One repo → multiple images from subpaths.
- **Artifact control:** Copy source + small indexes; exclude `.venv`, jars, training outputs; use `.gitignore` + optional Git LFS for `faq_index.faiss` if needed.

**Submodule (Option C)** is second choice if preserving Chatbot_AI git history matters; for portfolio speed, **copy is sufficient**.

---

## 5. Mess / Technical Debt Inventory

Evidence-based issues with file paths.

### 5.1 Stale / placeholder / commented-out files

| Path | Evidence |
|------|----------|
| `src/pages/ConsultantEmployee/ChatBot.js` | Entire component block-commented (`/* ... */`) |
| `src/pages/ConsultantEmployee/test.txt` | Empty file, **tracked in git** |
| `src/App.js` | Duplicate routes: `/unauthorized` and `*` appear twice (lines 107–109 and 145–146) |
| `src/App.js` | Commented legacy routes (`/customer`, `/sale`, `/support`) |
| `backend/middlewares/authMiddlewares.js` | Commented duplicate `restrictTo` implementation (lines 79–93) |
| `backend/server.js` | Commented `GoogleGenerativeAI` import |
| `docs/chatbot-integration-refactor.md` | Stale machine path in test file link |

### 5.2 Duplicate routes / naming inconsistencies

| Path | Issue |
|------|-------|
| `backend/server.js` L56–58 | `app.use("/tourPrice", tourPriceRoutes)` **and** `app.use("/tour-price", tourPriceRoutes)` — duplicate mount |
| `backend/controller/adminCotrollers.js` | Filename typo (`Cotrollers`) |
| `src/components/TourInforCard.js/` | Directory named like a file (`TourInforCard.js/`) |
| `src/utils/Enviroment.js` | Misspelling of "Environment" (if used — verify before rename) |
| `backend/middlewares/errorHandel.js` | Misspelling of "Handler" |

### 5.3 Hardcoded URLs / IPs / domains

| Path | Hardcoded value |
|------|-----------------|
| `src/utils/API_Port.js` | `'http://100.90.83.88:3001'` as fallback after `\|\|` dead code |
| `nginx-proxy.conf` L43 | `100.90.83.88:3001` upstream |
| `fix-nginx-config.conf` L3 | `100.90.83.88:3001` |
| `fix-nginx-config.conf` L11 | `tourguideeeee.fun`, `54.219.205.247` |
| `backend/server.js` L35–37 | CORS: EC2 IP + domain |
| `.github/workflows/deploy.yml` | `54.219.205.247` throughout; health check `100.90.83.88:3001` |

### 5.4 Security-sensitive / auth issues

| Path | Issue |
|------|-------|
| `backend/routes/chatRoutes.js` | `/insights`, `/logs` — no auth |
| `backend/routes/adminRoutes.js` L11 | `restrictTo('admin')` — likely wrong case vs DB `'Admin'` |
| `backend/middlewares/authMiddlewares.js` | Logs cookies and JWT to console on every auth request |
| `backend/.env` | Exists locally; correctly gitignored — **do not commit** |
| External `Chatbot_AI/.env` | Exists — must not copy into TravelWeb git |

### 5.5 Git / artifact hygiene

| Path | Issue |
|------|-------|
| `backend/uploads/*` (72 files) | **Tracked** — user uploads should not be in git; not in `.gitignore` |
| `.expo/README.md`, `.expo/settings.json` | **Tracked** — Expo says do not commit; project is CRA not Expo |
| `.gitignore` L54–56 | Ignores `package-lock.json` — hurts reproducible installs |
| `.gitignore` L109–121 | Ignores `Dockerfile`, `docker-compose.yml`, `Makefile` — **blocks containerization workflow** |
| `backend/logs/chat_analytics.jsonl` | Correctly gitignored (but `logs/` rule); local file exists |
| `build/` | Correctly gitignored; 44MB on disk from local builds |
| `backend/test_analytics.jsonl` | Present on disk — verify if tracked (not in `git ls-files` first 80 — likely untracked) |

### 5.6 Large files

| Path | Size | Tracked? |
|------|------|----------|
| `backend/uploads/1749572924399-394760361.png` | >5MB | Yes |
| `build/static/js/*.js.map` | >5MB | No (build ignored) |
| External `faq_index.faiss` | 5.1MB | N/A — import decision needed |
| External `training/VnCoreNLP-*.jar` | ~26MB each | **Do not import** |

### 5.7 Known integration bugs (affects cleanup priority)

| Path | Issue |
|------|-------|
| `backend/services/pythonChatbotClient.js` | `normalizePythonChatbotPayload()` does not pass through `search_metadata` — tests may mock around this; runtime metadata likely dropped |
| `Chatbot_AI/server.py` L50–51 | `user_id` regex `[A-Za-z0-9_-]+` — rejects UUIDs with only hex (actually UUID has hyphens — OK); spaces in `web_session_123` trimmed by Express |

### 5.8 Test gaps

| Area | Status |
|------|--------|
| Chat Express integration | **Good** — `backend/tests/chatIntegration.test.js` |
| Frontend tests | Default CRA scaffold only (`setupTests.js`) |
| E2E | None |
| Python in TravelWeb | N/A — not in repo yet |
| Admin insights auth | No test for unauthorized access |

### 5.9 Debug noise

**80+ files** contain `console.log` in `src/` and `backend/` (e.g. `authService.js` 29 hits, `paymentService.js` 60 hits, `AuthContext.js` 14 hits). Not blocking but unprofessional for production logs.

---

## 6. Dependency Audit

### 6.1 Root `package.json` (frontend + accidental backend deps)

**Scripts:**

| Script | Purpose |
|--------|---------|
| `start` | CRA dev server :3000 |
| `build` | Production build |
| `test` | CRA jest |
| `dev` | `concurrently` backend + frontend |

**Appears used:** `react`, `react-router-dom`, `axios`, `bootstrap`, `react-bootstrap`, `sass`, `@fortawesome/*`, `jwt-decode`, `@react-oauth/google`, `react-apexcharts`, `apexcharts`, `recharts`, `react-markdown`, `lucide-react`, `concurrently`, etc.

**Appears unused in `src/` (grep evidence):**

| Dependency | Evidence |
|------------|----------|
| `@google/generative-ai` | Only commented import in `backend/server.js`; not used in `src/` |
| `json-server` | No imports in repo `.js` files |
| `sequelize` | No imports in repo `.js` files |
| `sequelize-cli` | devDependency — no `.sequelizerc` found |
| `express`, `cors`, `dotenv` | Backend concerns — duplicated at root |
| `mssql`, `tedious` | Backend only — at root unnecessarily |
| `bcrypt`, `multer` | Backend only — at root unnecessarily |
| `myapp: "file:"` | Circular self-reference — suspicious |

**Missing scripts (recommended later):**

- `lint` — none configured beyond CRA eslint
- `test:backend` — only runnable via `cd backend && npm test`
- `dev:agent` — will need after import

### 6.2 `backend/package.json`

**Used dependencies:** `express`, `cors`, `dotenv`, `mssql`, `tedious`, `bcrypt`, `axios`, `cookie-parser`, `multer`, `nodemailer`, `google-auth-library`, `googleapis`, `moment-timezone`, `uuid`, `qs`, `punycode`, `nodemon`.

**Quirks:**

- `"backend": "file:"` — circular self-reference (harmless but odd)
- `main: "index.js"` but entry is `server.js`
- No `package-lock.json` tracked (gitignored at root pattern)

**Scripts:**

| Script | Status |
|--------|--------|
| `dev` | `nodemon server.js` — OK |
| `test` | Node native test for chat — OK |
| Missing | `start` (production), `lint` |

### 6.3 Python AI service

| Status | Detail |
|--------|--------|
| **In TravelWeb repo** | **Does not exist** |
| **External `Chatbot_AI/requirements.txt`** | fastapi, uvicorn, faiss-cpu, transformers, torch, sentence-transformers, google-genai, vncorenlp, pytest, httpx, etc. |
| **Entry** | `server.py` + `TourRetrievalPipeline` |
| **Action** | Import later into `services/ai-agent/` — trim heavy training deps for runtime image |

---

## 7. Environment and Secret Hygiene

### 7.1 Env files inventory (names only — no values read)

| File | Tracked? | Purpose |
|------|----------|---------|
| `.env.example` (root) | Yes | `REACT_APP_API_URL` only |
| `backend/.env.example` | Yes | DB, JWT, Python URL, analytics, payments, OAuth, email |
| `backend/.env` | **No** (gitignored) | Local secrets — present on disk |
| External `Chatbot_AI/.env.example` | N/A | `GOOGLE_API_KEY`, `GEMINI_MODEL`, `TOUR_DATA_FILE` |
| External `Chatbot_AI/.env` | N/A | **Must not copy** |

### 7.2 Gaps in `.env.example` coverage

| Gap | Recommendation |
|-----|----------------|
| Root `.env.example` missing `REACT_APP_*` variants | Add comment block pointing to backend URL |
| No `CORS_ORIGINS` override | Add to `backend/.env.example` when cleaning hardcoded CORS |
| No `INTERNAL_SERVICE_TOKEN` | Add when internal tool routes exist (post-cleanup / AI plan) |
| No `services/ai-agent/.env.example` | Create in Cleanup Phase E |

### 7.3 Secret commit risk

| Risk | Mitigation |
|------|------------|
| `backend/uploads/` may contain PII in filenames | Stop tracking; use `.gitignore` |
| Auth middleware logs tokens | Remove debug logs in Cleanup Phase D |
| `.env` gitignored | OK — verify CI uses secrets, not committed files |
| Payment keys in `backend/config/vnpay.js`, `momo.js` | Currently modified in working tree — ensure env-driven only |

### 7.4 Recommended env layout (target)

```
.env.example                          # REACT_APP_API_URL
backend/.env.example                  # Node: DB, JWT, AI_SERVICE_URL, payments
services/ai-agent/.env.example        # GEMINI_API_KEY, GEMINI_MODEL, index paths
infra/docker/.env.example             # Compose: service URLs, ports (optional)
```

---

## 8. Deployment Readiness Audit

| Dimension | Score | Evidence |
|-----------|-------|----------|
| **Local dev** | **Good** | `npm run dev`, README, MSSQL manual setup |
| **Docker Compose** | **Not ready** | No compose file; gitignore blocks Docker files |
| **Cloud Run** | **Not ready** | No images, no health/readiness split for agent |
| **GKE** | **Not ready** | No Helm/Terraform |
| **CI/CD** | **Partial** | `.github/workflows/deploy.yml` — frontend → EC2 nginx only |

### 8.1 Health / readiness / ports

| Endpoint | Service | Exists? |
|----------|---------|---------|
| `GET /api/health` | Express | Yes (`backend/server.js`) |
| `GET /chat/health` | Express (+ Python probe) | Yes |
| `GET /health` | Python | Yes (external `server.py`) |
| `GET /ready` | Python | **No** — add during AI import |
| Port 3000 | React | CRA default |
| Port 3001 | Express | `PORT` env |
| Port 8000 | Python | Documented default |

### 8.2 nginx / CI issues

- **Three configs** — `nginx.conf`, `fix-nginx-config.conf`, `nginx-proxy.conf` — consolidate under `infra/nginx/` with README explaining each environment.
- **CI health check** uses wrong path: `http://100.90.83.88:3001/health` but Express health is `/api/health` (deploy script line 155).
- **Backend not deployed by CI** — only static frontend; AI service not deployed at all.

---

## 9. Recommended Target Structure

**Minimal target** (no huge monorepo migration):

```
TravelWeb/
├── src/                          # React — unchanged
├── backend/                      # Express — unchanged path
├── services/
│   └── ai-agent/                 # Python FastAPI (imported from Chatbot_AI)
│       ├── app/ or flat modules   # refactor gradually
│       ├── data/
│       ├── indexes/              # faiss + metadata (gitignore large gen)
│       ├── tests/
│       ├── requirements.txt
│       ├── .env.example
│       └── README.md
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── .env.example
│   ├── nginx/
│   │   ├── ec2.conf              # from fix-nginx-config.conf
│   │   └── local-proxy.conf
│   ├── cloud-run/                # later
│   └── gke/                      # later
├── docs/
│   ├── AI_AGENT_UPGRADE_PLAN.md
│   ├── REPO_STRUCTURE_AUDIT_AND_CLEANUP_PLAN.md
│   └── chatbot-integration-refactor.md
├── scripts/                      # optional: seed-db.sh, smoke-test.sh
├── sql/                          # optional: move sql_*.sql here
├── .github/workflows/
├── public/
├── package.json
└── README.md
```

**What stays where:**

- Do **not** move `src/` or `backend/` — too much churn for little gain.
- **New** `services/ai-agent/` is the only major addition before AI feature work.
- **Move** nginx + docker files to `infra/` when created (old paths can symlink or README redirect one release).

---

## 10. Cleanup Plan Before AI Agent Work

> **Order:** Complete Cleanup Phases A → E **before** `AI_AGENT_UPGRADE_PLAN.md` Phase 0/1.

### Cleanup Phase A — Safety and inventory

**Goal:** Establish baseline, fix critical auth bug, document current state, no destructive changes.

**Tasks:**
1. Verify admin role casing: test `restrictTo('admin')` vs JWT role `Admin` from login — document fix for Phase D.
2. Add `docs/REPO_INVENTORY.md` snapshot (optional) or commit this audit file.
3. Confirm `backend/tests/chatIntegration.test.js` passes (`cd backend && npm test`).
4. List all env var **names** in `docs/ENV_VARIABLES.md` (optional short doc).
5. Fix CI health check path `/health` → `/api/health` in plan only (implement in Phase D).

**Files likely touched:**
- `docs/REPO_STRUCTURE_AUDIT_AND_CLEANUP_PLAN.md` (this file)
- Possibly `backend/routes/adminRoutes.js` (role fix — **small, high value**)

**Acceptance criteria:**
- Audit doc committed.
- Admin API auth behavior documented or fixed.
- Backend chat tests green.

**Risks:** Role fix may affect other `restrictTo` calls — grep all usages.

---

### Cleanup Phase B — Gitignore and generated artifacts

**Goal:** Stop tracking generated/user/binary junk; unblock Docker files.

**Tasks:**
1. Update `.gitignore`:
   - Add `backend/uploads/` (keep `uploads/.gitkeep` for empty dir)
   - Add `.expo/`, `.claude/`
   - **Remove** lines that ignore `Dockerfile`, `docker-compose.yml`, `Makefile` (lines 109–121)
   - **Stop ignoring** `package-lock.json` — commit lockfiles for reproducibility
   - Add `services/ai-agent/.venv/`, `__pycache__/`, `*.faiss` optional rule or `indexes/` with README for rebuild
2. `git rm --cached backend/uploads/*` (72 files) — **after user confirms** uploads are reproducible from DB/demo.
3. `git rm --cached .expo/*`
4. Ensure `backend/logs/`, `build/`, `*.jsonl` remain ignored.

**Files likely touched:**
- `.gitignore`
- `backend/uploads/.gitkeep` (create)
- Git index only for cached removals

**Acceptance criteria:**
- `git status` shows no tracked files under `backend/uploads/` or `.expo/`.
- `package-lock.json` and `backend/package-lock.json` can be committed.
- Docker files are not gitignored.

**Risks:** Removing uploads from git may break image URLs in demo DB until re-seeded or placeholder images added.

---

### Cleanup Phase C — Documentation and env normalization

**Goal:** README and env examples match target structure; remove broken external paths.

**Tasks:**
1. Update `README.md`:
   - Prerequisites: Node 18+, Python 3.11+, MSSQL
   - Replace `../AI_Project/Chatbot_AI` with `services/ai-agent/` (**after Phase E** — can stub "coming soon" in Phase C)
   - Add "Repository structure" section
   - Document three-service startup commands
2. Expand root `.env.example` with `REACT_APP_API_URL`
3. Add `services/ai-agent/.env.example` template (placeholder until import)
4. Add `infra/docker/.env.example` template
5. Move `docs/chatbot-integration-refactor.md` stale paths to relative links
6. Add note in README: chat analytics endpoints will require admin auth

**Files likely touched:**
- `README.md`
- `.env.example`
- `backend/.env.example` (add `AI_SERVICE_URL` alias comment)
- `docs/chatbot-integration-refactor.md`

**Acceptance criteria:**
- New developer can follow README without sibling-folder assumptions (post Phase E).
- No absolute machine paths in docs.

**Risks:** README ahead of actual `services/ai-agent/` — coordinate with Phase E.

---

### Cleanup Phase D — Route, dependency, and config cleanup

**Goal:** Remove obvious duplication and hardcoding without feature changes.

**Tasks:**
1. Fix `restrictTo('admin')` → `restrictTo('Admin')` in `backend/routes/adminRoutes.js` (and audit all `restrictTo` calls).
2. Remove duplicate `/tour-price` or `/tourPrice` mount — keep one canonical path, document deprecation.
3. Remove dead fallback in `src/utils/API_Port.js`: `|| 'http://100.90.83.88:3001'`
4. Externalize CORS origins to `CORS_ORIGINS` env in `backend/server.js`.
5. Move hardcoded nginx upstream to env-substituted template under `infra/nginx/`.
6. Root `package.json`: remove unused deps (`sequelize`, `json-server`, `@google/generative-ai`, duplicate `express`/`mssql`/etc.) — **one commit, run build + backend test**.
7. Delete or untrack `src/pages/ConsultantEmployee/test.txt`.
8. Remove duplicate `/unauthorized` and `*` routes in `src/App.js`.
9. Reduce auth middleware cookie/token `console.log` noise (keep structured logger later).
10. Fix `pythonChatbotClient.js` `search_metadata` passthrough (small bugfix — acceptable in cleanup).

**Files likely touched:**
- `backend/routes/adminRoutes.js`
- `backend/server.js`
- `src/utils/API_Port.js`
- `src/App.js`
- `package.json`
- `backend/services/pythonChatbotClient.js`
- `nginx*.conf` → `infra/nginx/`
- `.github/workflows/deploy.yml` (health URL, parameterize host)

**Acceptance criteria:**
- `npm run build` succeeds.
- `cd backend && npm test` passes.
- Admin routes work for `Admin` role user.
- No hardcoded VPN IP in `API_Port.js`.

**Risks:** Removing duplicate tour price route may break frontend if it uses both paths — grep `tour-price` vs `tourPrice` in `src/api/`.

---

### Cleanup Phase E — AI service import preparation

**Goal:** Create `services/ai-agent/` with selective copy from external Chatbot_AI; wire Express to local path; **no agent redesign yet**.

**Tasks:**
1. Create `services/ai-agent/` directory structure.
2. Selective copy from `/Users/nguyen_bao/Projects/AIproject/AI_Project/Chatbot_AI` (see Section 11).
3. Add service-level `README.md` with `uvicorn` command.
4. Update `backend/.env.example`: `PYTHON_CHATBOT_URL=http://localhost:8000/chat`
5. Verify: start agent + `npm run dev` + `curl POST /chat/chatbot` returns valid contract.
6. Add root `package.json` script: `"dev:agent": "cd services/ai-agent && uvicorn server:app --reload --port 8000"` and extend `dev` to run all three (optional).
7. Do **not** start ReAct refactor or new tools — run existing pipeline as-is.

**Files likely touched:**
- `services/ai-agent/**` (new)
- `README.md`
- `package.json` (scripts)
- `.gitignore` (python artifacts)

**Acceptance criteria:**
- Fresh clone + import steps documented = working chat with Python running.
- Express `/chat/health` returns `ok` when agent is up.
- External repo path no longer required for daily dev.

**Risks:** Torch/FAISS install size; document Python venv setup clearly.

---

## 11. AI Service Import Plan

**Source:** `/Users/nguyen_bao/Projects/AIproject/AI_Project/Chatbot_AI`  
**Target:** `TravelWeb/services/ai-agent/`  
**Method:** Selective copy (not `mv`, not blind copy)

### 11.1 Copy checklist

| Copy | Source | Notes |
|------|--------|-------|
| ✅ | `server.py` | Entry point — may move to `app/main.py` later |
| ✅ | `requirements.txt` | Pin versions on import |
| ✅ | `pipelines/` | Core runtime |
| ✅ | `services/` | Runtime services |
| ✅ | `extractors/` | Entity extraction |
| ✅ | `repositories/` | Data access |
| ✅ | `schemas/` | Pydantic models |
| ✅ | `scripts/` | Index/build utilities |
| ✅ | `tests/` | pytest suite |
| ✅ | `data/processed/faq_cleaned.json` | Smaller corpus for demo |
| ✅ | `data/tours_sample.json` | Referenced by `.env.example` |
| ✅ | `faq_index.faiss` + `faq_metadata.json` | ~6.4MB total — OK for git OR rebuild via script |
| ✅ | `docs/ai_context/` | Valuable architecture context — move to `services/ai-agent/docs/` |
| ✅ | `.env.example` | Rename vars to match TravelWeb conventions (`GEMINI_API_KEY`) |
| ✅ | `README.md` | Trim + point to TravelWeb root README |

### 11.2 Do NOT copy

| Exclude | Reason |
|---------|--------|
| `.env` | Secrets |
| `.venv/`, `venv/` | 1.3GB — recreate locally |
| `.git/` | History stays in old repo |
| `__pycache__/`, `.pytest_cache/` | Generated |
| `log/` | Runtime logs |
| `training/VnCoreNLP-*.jar` | 52MB — not needed for inference MVP |
| `training/` (mostly) | Keep only `phobert_intent_finetuned_train.py` doc if needed — models downloaded at runtime |
| `data/raw/*.json` (large) | Use `processed/` subsets unless needed for retraining |
| `.DS_Store` | Junk |

### 11.3 FAISS / model handling

| Asset | Strategy |
|-------|----------|
| `faq_index.faiss` (5.1MB) | Commit in git for demo **or** add `scripts/build_faq_index.py` + gitignore `indexes/*.faiss` |
| PhoBERT / transformers weights | Download on first run (HF cache) — document in README; gitignore `models/` |
| `torch` dependency | Accept large venv; use `requirements-runtime.txt` slim option later for Docker |

### 11.4 Env mapping after import

| Old (`Chatbot_AI/.env.example`) | New (`services/ai-agent/.env.example`) |
|-----------------------------------|----------------------------------------|
| `GOOGLE_API_KEY` | `GEMINI_API_KEY` (document alias in README) |
| `GEMINI_MODEL` | `GEMINI_MODEL` |
| `TOUR_DATA_FILE` | `TOUR_DATA_FILE=data/tours_sample.json` |

Express keeps:

```
PYTHON_CHATBOT_URL=http://localhost:8000/chat
# future alias: AI_SERVICE_URL=http://localhost:8000
```

### 11.5 Verification steps (post-import)

```bash
# Terminal 1
cd services/ai-agent && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill GEMINI_API_KEY locally
uvicorn server:app --host 0.0.0.0 --port 8000

# Terminal 2
cd backend && npm run dev

# Terminal 3
curl -s http://localhost:8000/health
curl -s http://localhost:3001/chat/health
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H 'Content-Type: application/json' \
  -d '{"query":"Tìm tour Đà Lạt","user_id":"audit_test"}'
```

### 11.6 Rollback strategy

- Import commit is single logical commit on branch `plan/travelweb-ai-agent-upgrade`.
- Rollback: `git revert <import-commit>` — Express still points to external URL if `.env` unchanged.
- Keep external `Chatbot_AI` repo untouched until import verified for 1 week.

---

## 12. Risk Matrix

| Risk | Severity | Probability | Mitigation | When |
|------|----------|-------------|------------|------|
| Clone without AI service fails | High | Certain (today) | Cleanup Phase E import | Before AI Agent Phase 0 |
| Admin API 403 due to role case | High | High | Fix `restrictTo('Admin')` | Cleanup Phase A/D |
| Secrets committed via uploads | Medium | Medium | Untrack uploads; scan git history | Phase B |
| Docker files gitignored | Medium | Certain | Fix `.gitignore` | Phase B |
| Broken demo image URLs after upload untrack | Medium | Medium | DB seed placeholders or S3 later | Phase B |
| Python deps too heavy for reviewers | Medium | High | Document venv + optional Docker | Phase E |
| Hardcoded VPN IP blocks cloud deploy | High | Certain | Env-driven nginx/CORS | Phase C/D |
| Public `/chat/insights` leaks usage patterns | Medium | High | Admin auth (AI plan Phase 0) | After cleanup, before public deploy |
| `search_metadata` dropped at runtime | Low | High | Fix in Phase D | Before analytics work |
| Import duplicates maintenance burden | Low | Medium | Single `services/ai-agent/` canonical; archive external repo read-only | Phase E |
| CI deploys frontend only — stale API | Medium | Certain | Document; add API deploy later | Phase C+ |

---

## 13. Recommended Immediate Next Prompt

After reviewing this audit, give the coding agent **cleanup only** — **not** AI Agent Phase 0/1:

```
You are working in TravelWeb on branch plan/travelweb-ai-agent-upgrade.

Read docs/REPO_STRUCTURE_AUDIT_AND_CLEANUP_PLAN.md and execute Cleanup Phase A and Cleanup Phase B only.

Strict rules:
- Do NOT start AI_AGENT_UPGRADE_PLAN.md Phase 0 or Phase 1.
- Do NOT redesign the chatbot agent or add ReAct tools.
- Do NOT import services/ai-agent/ yet (that is Phase E).

Cleanup Phase A:
1. Fix backend/routes/adminRoutes.js: restrictTo('admin') → restrictTo('Admin') to match sql_dataEx.sql role names. Grep all restrictTo usages and fix case mismatches.
2. Run cd backend && npm test — all tests must pass.
3. No other code changes unless required for the role fix.

Cleanup Phase B:
1. Update .gitignore:
   - Add backend/uploads/, .expo/, .claude/
   - Remove rules that ignore Dockerfile, docker-compose.yml, Makefile (lines ~109-121)
   - Stop ignoring package-lock.json
   - Add Python patterns for future services/ai-agent: .venv/, __pycache__/, .pytest_cache/
2. Create backend/uploads/.gitkeep
3. git rm --cached for tracked files under backend/uploads/ and .expo/ (do not delete local files)
4. Commit package-lock.json and backend/package-lock.json if present

Deliverables:
- Two commits: "cleanup: fix admin role authorization" and "cleanup: gitignore and untrack generated artifacts"
- Short summary of what was untracked and what remains manual (e.g. upload images now local-only)

Do not modify README or import Python service in this task.
```

---

## Appendix: Corrected Implementation Order (Project-Wide)

```
0. Repo structure audit + cleanup plan     ← this document
1. Cleanup Phases A–E                    ← hygiene + import chatbot
2. AI_AGENT_UPGRADE_PLAN Phase 0–1       ← metadata fix, health, agent skeleton
3. AI_AGENT_UPGRADE_PLAN Phase 2+        ← ReAct, RAG, memory, Docker, cloud
```

This supersedes starting directly at `AI_AGENT_UPGRADE_PLAN.md` Phase 0 before repo cleanup.

---

*End of audit.*
