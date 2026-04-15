# Resume Lens — Backlog & Hypotheses

Working notes on what's worth building next, what I want to test with real users, and what I've already decided against. Updated as the product evolves.

---

## Immediate fixes (before scaling)

- [ ] Replace file-based `data/store.json` with Vercel KV for production persistence
- [ ] Add rate limiting on the analyze endpoint — currently no protection against rapid-fire requests
- [ ] Add email format validation on signup (currently server-side only)
- [ ] Handle the edge case where a PDF is scanned (image-only) and returns empty text — give a clear user message rather than a generic error
- [ ] Test the algorithm scorer against edge cases: non-English resumes, academic CVs, portfolio-style resumes

---

## Hypotheses to test with first 100 users

These are specific things I want to learn from early usage, not just feature ideas.

**H1: Algorithm scores correlate with user satisfaction**
Do users who get higher algorithm scores feel the feedback was more useful? Or does the score not matter and only the specific findings do? If the score is meaningless to users, remove it.

**H2: The four-reader framing is intuitive without explanation**
Currently there's a brief explainer on the home page. Do users read it, or do they skip straight to pasting their resume? If they skip it, maybe the explainer is in the wrong place — or unnecessary entirely.

**H3: BYOK converts among power users**
People who already use Claude or ChatGPT regularly will bring their own key. People who don't know what an API key is won't. If BYOK is unused after 100 tests, simplify the UI and hide it behind an "Advanced" toggle.

**H4: The "3 free AI uses" drives signups**
Does the 3-free-use limit actually motivate signup, or do most users just use the algorithm and never feel the need? If signups are low, the friction isn't the right tradeoff.

**H5: People want to fix and re-analyze in the same session**
The current flow is one-way: input → analyze → read results. Do users want to edit their resume text and run again? If yes, keep the inputs visible after analysis so they can iterate without scrolling up.

---

## Features worth building in V2

**Bullet rewriter (co-creation mode)**
For each flagged weak bullet, show 2–3 alternative framings as starting points — not final copy. User chooses and edits. This is where AI genuinely adds value over an algorithm: generating options, not just scoring.

Constraint: label these clearly as AI-generated starting points. The ideas have to be the user's. Resume Lens helps you think — it doesn't think for you.

**Before/after comparison**
Let users paste two versions of a resume and compare scores side by side. Useful for people iterating on a draft.

**JD analysis mode**
Before analyzing the resume, analyze the job description: what does this role actually care about, what are the unstated requirements, what kind of candidate is this company looking for? Useful framing for users before they even run the resume through.

**Resume format checker**
Detect multi-column layouts, tables, headers, and text boxes from the raw PDF extraction quality. Flag format issues before scoring. Currently the algorithm makes inferences from line length — this could be more precise.

**Version history**
Save multiple resume versions against the same JD. Let users see how their score changes as they iterate. Requires user accounts and storage — save for after the auth system is proven.

**Share link**
Generate a shareable URL to a specific analysis result. Useful for getting feedback from a friend or mentor.

---

## Things I've ruled out (and why)

**LinkedIn profile URL input**
Tempting but the LinkedIn scraping problem is painful — they actively block it and the Terms of Service are unclear. Not worth the maintenance overhead for V1.

**Resume writing service / paid upgrades**
Not the point. Resume Lens is a thinking tool, not a ghostwriting service. If it ever makes money, it's through usage pricing on the AI analysis tier, not upselling human review.

**Storing the user's resume**
No. Keep the product stateless where possible. Users paste or upload, get results, done. Storing resumes creates GDPR obligations and security exposure that aren't worth it at this stage.

**OAuth (Google/GitHub login)**
Adds complexity and OAuth app approval overhead. Email + password is sufficient for testing. Revisit when there's evidence users want it.

---

## Open questions

- Is the algorithm good enough to be the primary product, with AI as optional enhancement? Or is the algorithm just a fallback?
- What's the right model for sustainability: free algorithm forever, paid AI tier? BYOK only? Something else?
- Should this stay focused on software engineers, or is the framework generic enough for any professional role?

---

*Last updated: April 2026*
