# Resume Lens — Project Plan

> A structured, AI-powered resume screener that evaluates your resume against a job description through the eyes of the four real readers: ATS, Recruiter, Interviewer, and Hiring Manager.

---

## 1. Why This Exists

Most people treat resume screening as a one-shot LLM task: paste JD + CV, ask for feedback, get generic advice, repeat blindly. The output rarely converts.

The problem isn't the AI — it's the lack of a framework. Real hiring pipelines have four distinct reader personas, each filtering candidates with different criteria. A resume that passes ATS can fail a recruiter scan in 5 seconds. A resume that impresses a recruiter can get torn apart by a hiring manager looking for measurable impact.

**Resume Lens** applies a principled, criteria-based evaluation — not vibes — so job seekers know exactly where they're getting filtered out and what to fix.

**Philosophy on AI assistance:** AI reviews and helps you co-create. The ideas have to be yours. Resume Lens gives you structured feedback, flags specific weaknesses, and helps you think — but it doesn't write your resume for you.

---

## 2. Target User

A software engineer (or technical professional) who:
- Is actively job hunting and applying to multiple roles
- Has been iterating their resume with generic LLM help without seeing results
- Wants specific, actionable feedback — not a list of tips they've already read

---

## 3. The Evaluation Framework

Based on the 4-reader model from Austen McDonald / Neo Kim (System Design Newsletter, April 2026).

### Reader 01 — ATS / Machine Filter
**What it looks for:**
- Clean, parseable formatting (no tables, text boxes, images, unusual section names)
- Keyword relevance to the JD (not just exact match — semantic relevance counts)
- Minimum qualifications clearly present (years of experience, education, role titles)
- Technologies named explicitly and indexably

**Evaluation criteria for the app:**
- Keyword overlap score (resume vs JD terms)
- Missing minimum qualifications
- Formatting risk flags
- Skills section completeness

### Reader 02 — Recruiter / Sourcer
**What it looks for:**
- Strong summary that immediately signals fit
- Name-brand companies or recognizable signals
- Clear titles and tenure
- Brevity — ideally one page
- 5–7 second visual scan yields something exciting

**Evaluation criteria for the app:**
- Summary quality (specific vs generic/buzzword-laden)
- Visual length and density estimate
- Presence and prominence of recognizable companies/projects
- Whether minimum qualifications are surfaced early

### Reader 03 — Interviewers
**What it looks for:**
- Accomplishments that are defensible under technical scrutiny
- Technical depth embedded in bullets (not just in skills section)
- Leadership and ownership signals
- No red flags (short stints, gaps, vague claims)

**Evaluation criteria for the app:**
- Bullet quality: results-led vs activity-led
- Quantification presence (numbers, percentages, scope)
- Technical specificity within accomplishment bullets
- Red flag detection (short stints, gaps, vague language)

### Reader 04 — Hiring Manager
**What it looks for:**
- Measurable business impact with appropriate scope
- Evidence past work resembles what they're hiring for
- Ownership and growth trajectory
- Clear visual hierarchy — finds what matters quickly

**Evaluation criteria for the app:**
- Impact quantification and scope
- Role-relevance of top accomplishments to the JD
- Seniority signals (did they drive things, or support them?)
- Ordering: most impactful bullets first, not chronological

---

## 4. Product Scope

### V1 — MVP (Build First)

**Inputs:**
- Resume: PDF upload OR plain text paste
- Job Description: plain text paste

**Processing:**
- Extract text from PDF (if uploaded)
- Send resume + JD to Claude API with a structured evaluation prompt
- Claude scores and critiques each of the 4 reader personas

**Outputs — the Analysis Report:**
- Overall fit score (0–100) with a one-line verdict
- Per-persona breakdown (ATS / Recruiter / Interviewer / Hiring Manager):
  - Score (0–100)
  - 2–3 specific strengths
  - 2–3 specific issues with explanation
- Top 5 Priority Fixes — ranked, actionable, specific (e.g. "Your summary uses 3 buzzwords and doesn't mention your specialty — here's what it's missing")
- Missing Keywords — terms in the JD not reflected in the resume
- Red Flags — short stints, gaps, vague bullets, no quantification

**UI:**
- Clean, minimal single-page app
- Two-panel input (Resume | Job Description)
- Analyze button → loading state → results
- Results displayed as a structured report with the 4-persona funnel visible
- Mobile-responsive

### Backlog (Future Iterations)

- **AI Co-creation mode:** For each flagged weak bullet, show 2–3 alternative framings as inspiration — clearly labeled as starting points, not final copy. User chooses and edits.
- **Resume format checker:** Visual scan of the resume's formatting quality (multi-column detection, section naming, density)
- **Version history:** Save and compare multiple resume versions against the same JD
- **Share link:** Generate a shareable link to an analysis result
- **Tailoring advisor:** Given a resume, recommend which version/variant to use for different role types
- **LinkedIn profile mode:** Apply the same framework to a LinkedIn profile URL

---

## 5. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one repo — handles frontend + API routes. Trivial Vercel deploy. |
| Styling | Tailwind CSS | Fast, utility-first, looks clean with minimal effort |
| AI | Claude API (claude-sonnet-4-6) | Structured output, strong reasoning, consistent rubric application |
| PDF parsing | pdf-parse (npm) | Lightweight, works inside Next.js API routes |
| Deployment | Vercel | Free tier, GitHub-integrated, one-command deploy |
| Language | TypeScript | Stronger for a portfolio project — shows discipline |

**No database in V1.** Analysis is stateless — no user accounts, no stored data. Keep it simple. Users get results in-session only.

---

## 6. App Structure

```
resume-lens/
├── app/
│   ├── page.tsx                  # Main UI — input form
│   ├── results/
│   │   └── page.tsx              # Results display (or inline on same page)
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts          # API route: receives resume + JD, calls Claude
│   └── layout.tsx
├── components/
│   ├── ResumeInput.tsx           # Resume upload/paste toggle
│   ├── JDInput.tsx               # Job description textarea
│   ├── AnalysisReport.tsx        # Full results component
│   ├── PersonaCard.tsx           # Per-persona score + feedback card
│   ├── PriorityFixes.tsx         # Top 5 fixes list
│   └── ScoreGauge.tsx            # Visual score display
├── lib/
│   ├── claude.ts                 # Claude API client + prompt construction
│   ├── pdf.ts                    # PDF text extraction
│   └── types.ts                  # TypeScript types for analysis output
├── public/
├── .env.local                    # ANTHROPIC_API_KEY (not committed)
├── .env.example                  # Template for contributors
├── README.md
└── PLAN.md                       # This file
```

---

## 7. Claude Prompt Architecture

The analysis is driven by a structured system prompt that:
1. Defines the 4-persona evaluation framework explicitly
2. Receives the resume text and JD as user content
3. Returns a **structured JSON response** with scores, findings, and fixes per persona
4. Is instructed to cite specific text from the resume when flagging issues (not generic advice)

The response schema will be typed in TypeScript and validated before rendering.

**Example prompt structure:**
```
System: You are a senior engineering hiring expert. Evaluate the resume below against the job description using the following 4-reader framework: [framework]. Return your analysis as valid JSON matching this schema: [schema].

User: 
RESUME:
{resumeText}

JOB DESCRIPTION:
{jobDescription}
```

The prompt is the core IP of this app. It will be iterated on heavily.

---

## 8. UI/UX Design Notes

**Key screens:**

1. **Home / Input screen**
   - Headline: something honest and direct (not marketing fluff)
   - Two-panel layout: Resume (left) | Job Description (right)
   - Resume panel has toggle: "Upload PDF" / "Paste text"
   - Single "Analyze" CTA button
   - Brief explainer of the 4-reader framework (sets expectations)

2. **Results screen** (below fold or new section, not new page)
   - Overall score at the top — big, clear
   - 4 persona cards in funnel order (ATS → Recruiter → Interviewer → HM)
   - Each card: score, strengths, issues
   - Priority Fixes section below — numbered, specific
   - Missing keywords list
   - Red flags section (if any)
   - "Analyze another" CTA

**Design inspiration:** The article's own funnel diagram (ATS → Recruiter → Interviewer → HM) should be echoed in the UI. Users should feel like they're seeing their resume through the eyes of each reader, in sequence.

---

## 9. Deployment Plan

1. Develop locally with `next dev`
2. Push to GitHub (public repo under Vaibhav's profile)
3. Connect repo to Vercel
4. Set `ANTHROPIC_API_KEY` as environment variable in Vercel dashboard
5. Deploy — `git push` triggers auto-deploy

**Domain:** Vercel provides a free `.vercel.app` subdomain. Optional: custom domain later.

---

## 10. GitHub / Documentation Requirements

Since this is a portfolio project, the repo must look professional:

- **README.md** — Project overview, problem statement, how it works, tech stack, local setup instructions, live demo link, screenshot
- **PLAN.md** — This document (shows thoughtful product thinking)
- **.env.example** — So contributors know what env vars are needed
- **Clean commit history** — Meaningful commit messages, not "fix" or "update"
- **Pinned on GitHub profile** — Once live
- **Live deployment** — A working URL, not just code

---

## 11. Success Criteria for V1

- [ ] User can paste or upload a resume and paste a JD
- [ ] App returns a structured analysis report in under 15 seconds
- [ ] Each of the 4 personas has a score + specific, cited feedback
- [ ] Priority fixes are specific enough to act on (not generic)
- [ ] App is deployed and publicly accessible
- [ ] GitHub repo has a complete README with live demo link
- [ ] Code is clean enough to be read as a portfolio piece

---

## 12. Build Order (for Claude Code)

1. **Scaffold** — `npx create-next-app resume-lens --typescript --tailwind --app`
2. **Types** — Define the full TypeScript schema for the analysis output
3. **Claude integration** — Build the API route and prompt, test with mock data
4. **PDF parsing** — Add pdf-parse, test extraction quality
5. **Input UI** — Resume + JD input components
6. **Results UI** — PersonaCard, PriorityFixes, ScoreGauge components
7. **Wire it together** — Connect input → API → results
8. **Polish** — Loading states, error handling, mobile responsiveness
9. **README** — Write documentation
10. **Deploy** — Push to GitHub, connect Vercel, ship

---

*Built by Vaibhav. Inspired by "I rejected 1000s of resumes at Meta" — Austen McDonald & Neo Kim, System Design Newsletter.*
