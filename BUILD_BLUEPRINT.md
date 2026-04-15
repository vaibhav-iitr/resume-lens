# Resume Lens — Build Blueprint

A full record of how this was built, what broke, and how it was fixed. Written so a future project can start here instead of at zero.

---

## The build sequence that worked

1. **Types first** — define the full TypeScript schema for the analysis output before writing any logic. This forces you to think about what the product actually produces before getting lost in how.
2. **API integration second** — wire Claude before building UI. A working API call with a real response is proof of concept. Everything else is packaging.
3. **UI third** — once the data shape is known and the API returns real data, building the UI is filling in a form you already understand.
4. **Algorithm layer fourth** — the algorithmic fallback was added after the LLM path existed, which meant it could be tested against real Claude output to check calibration.
5. **Auth last** — because auth before a working product is premature optimisation. Add it when you know the product works and you're ready to gate something behind it.

---

## Errors encountered and how each was fixed

### Error 1 — pdfjs-dist worker at build time
**Message:** `Cannot find module '.next/dev/server/chunks/pdf.worker.mjs'`
**Cause:** Turbopack was bundling `pdfjs-dist` and trying to resolve a web worker file that didn't exist in the bundled output.
**Fix:** Added `serverExternalPackages: ['pdf-parse', 'pdfjs-dist']` to `next.config.ts`. This tells Next.js to require these packages natively at runtime rather than bundle them.
**Also tried but insufficient:** `PDFParse.setWorker('')` — this runs too late; the module has already tried to resolve the worker by then.

### Error 2 — API key missing error on every request in production
**Message:** `Missing credentials. Please pass an apiKey`
**Cause:** OpenAI SDK throws at class instantiation time if the API key is missing. The client was instantiated at module level (`const client = new OpenAI(...)`), so every cold start of the serverless function threw — even for algorithm requests that never touched OpenAI.
**Fix:** Removed module-level client. Create the client inside the function body, only when the function is actually called with a valid key.
**Lesson:** SDKs vary. Anthropic and Groq are lenient (throw at request time). OpenAI is strict (throws at construction time). Assume nothing; create clients lazily.

### Error 3 — `@napi-rs/canvas` warning crashing the Vercel function
**Message:** `Warning: Cannot load '@napi-rs/canvas' package`
**Cause:** `pdfjs-dist` tries to load a native canvas module for image rendering. It's not installed. The warning itself is non-fatal, but the module initialisation was running on every request because `lib/pdf.ts` was imported at the top of the route file.
**Fix:** Changed to dynamic import inside the PDF upload handler only: `const { extractTextFromPdf } = await import('@/lib/pdf')`. Text-paste requests no longer touch pdf-parse at all.
**Lesson:** In Next.js API routes, every top-level import runs on every cold start. Import heavy or platform-sensitive packages dynamically, at the point of actual use.

### Error 4 — Vercel deployment name validation loop
**Symptom:** UI kept rejecting project name with "invalid characters" error regardless of what name was entered.
**Fix:** Bypassed the web UI entirely with `npx vercel` from the terminal. CLI had none of the validation issues.
**Lesson:** When a UI blocks you in a loop, go to the CLI. For Vercel specifically, `npx vercel` is often more reliable than the import wizard for non-standard setups.

### Error 5 — GitHub push failing with password authentication
**Message:** `remote: Invalid username or token. Password authentication is not supported`
**Cause:** GitHub dropped password auth for git operations in 2021. Requires a Personal Access Token.
**Fix:** Generated PAT at GitHub → Settings → Developer settings → Personal access tokens → repo scope. Used as password when prompted.

---

## Architecture decisions and why

**Algorithm as first-class engine, not fallback**
The algorithm isn't a degraded experience — it's a different tradeoff: deterministic, fast, free, explainable. LLM adds nuance and citation quality. Framing them as equals rather than primary/fallback changes what you build and how users perceive it.

**JWT + bcrypt + flat JSON file for auth**
No database, no OAuth, no third-party auth service. For 100–500 users in testing, a flat JSON file is sufficient. The store interface is abstracted so swapping to Vercel KV for production is a one-file change. Don't build infrastructure for scale you don't have.

**Three BYOK providers (Anthropic, OpenAI, Groq)**
Anthropic: the native model this was built for. OpenAI: the most common key people already have. Groq: free tier, useful for users who want AI quality without paying. Adding more providers has diminishing returns and increases prompt-compatibility risk — each model interprets structured JSON prompts slightly differently.

**SYSTEM_PROMPT exported from a single file**
All three LLM integrations (Claude, Groq, OpenAI) import the same `SYSTEM_PROMPT` from `lib/claude.ts`. The prompt is the core IP. One definition, multiple consumers.

---

## What I would do differently

- **Start with `serverExternalPackages` configured from day one** for any package that uses native modules or web workers. Don't wait for the production error.
- **Test on Vercel earlier** — local dev with `next dev` masks a class of serverless-specific errors that only surface at deployment. A quick `npx vercel` early catches these.
- **Use Vercel KV from the start** rather than the file-based store. The file store works locally but requires a production swap. Vercel KV has a free tier and the setup cost is low.
- **Set up git identity** (`git config --global user.name` / `user.email`) before the first commit. The auto-configured committer name (`vaibhav@Mac.home`) isn't portfolio-quality.

---

## RAM management for development on 8GB

The machine crashed multiple times during this build. These changes helped:

- `NODE_OPTIONS='--max-old-space-size=512'` in the dev script — caps Node heap at 512MB
- `typescript: { ignoreBuildErrors: true }` in `next.config.ts` — prevents a second tsc process from competing for RAM
- `serverExternalPackages` — reduces what Turbopack has to bundle and cache
- Kill all Chrome tabs and other apps before starting dev

---

## Reusable patterns for future projects

1. **Dynamic import for heavy server-side packages:** `const { thing } = await import('./lib/thing')` inside the handler, not at the top of the file.
2. **Lazy client creation:** Never instantiate SDK clients at module level. Always create inside function scope.
3. **Abstract your store behind an interface:** `getUserById`, `createUser`, `decrementX` — implementation is swappable without touching business logic.
4. **Engine selector pattern:** Accept an `engine` field in every analysis request. Route to algorithm / server LLM / BYOK based on it. Decouples UI from AI provider completely.
5. **BYOK via request body, not storage:** API key comes in the request, gets used, never stored. Zero server-side risk.

---

*Built: April 2026. Stack: Next.js 16, Tailwind v4, Anthropic SDK, Groq SDK, OpenAI SDK, pdf-parse v2, jose, bcryptjs. Deployed: Vercel.*
