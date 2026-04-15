# Resume Lens

Most people use AI to review their resume like this: paste CV, paste job description, ask for feedback, get a wall of generic suggestions, repeat. The output rarely converts, because the advice isn't tied to how hiring actually works.

A resume doesn't have one reader. It has four — in sequence. An ATS filter. A recruiter doing a 5-second scan. An interviewer looking for defensible claims. A hiring manager looking for business impact. Each one filters candidates using different criteria. Resume Lens evaluates your resume through each reader, in order, and tells you specifically where you're getting filtered out.

**[Live demo →](https://resume-lens.vercel.app)**

---

## How it works

Paste your resume (or upload a PDF) and the job description. Choose how you want to run the analysis. Get a structured report with scores, specific findings, and ranked fixes from four perspectives.

### The four-reader framework

Based on how real hiring pipelines work, not how we imagine them:

1. **ATS / Machine filter** — keyword coverage, parseable formatting, minimum qualifications present
2. **Recruiter** — 5-second scan, strong summary, recognisable signals, brevity
3. **Interviewer** — defensible bullets, quantification, ownership language, no red flags
4. **Hiring Manager** — business impact, relevance to the JD, seniority signals, ordering

---

## Analysis engines

Three ways to run an analysis — pick what fits your situation:

**Algorithm** — rule-based scorer, runs locally, no API key, unlimited. Keyword matching, quantification detection, weak language flagging, date parsing for short stints. Fast and free.

**AI Analysis** — powered by Groq (Llama 3.3 70B). 3 free uses per account. Requires signup. Better at nuance and citation — will reference specific phrases from your resume.

**Your API key** — bring your own Anthropic (Claude), OpenAI (GPT-4o), or Groq key. Unlimited, uses your credits. Key is held in memory only, never stored server-side.

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| AI | Claude via Anthropic SDK · Llama 3.3 70B via Groq · GPT-4o via OpenAI SDK |
| PDF parsing | pdf-parse v2 |
| Auth | JWT (jose) + bcrypt, file-based store |
| Deployment | Vercel |

No database in V1. Auth state persists via httpOnly JWT cookie. User store is a flat JSON file — works for the current scale, swappable for Vercel KV when needed.

---

## Local setup

```bash
git clone https://github.com/vaibhav-iitr/resume-lens.git
cd resume-lens
npm install
cp .env.example .env.local
```

Edit `.env.local` with the keys you want active. Only `JWT_SECRET` is required to run the app — everything else unlocks specific engines:

```
JWT_SECRET=any-random-string-works-locally

# For BYOK with Claude:
ANTHROPIC_API_KEY=sk-ant-...

# For the free AI Analysis tier + BYOK with Groq:
# Get a free key at console.groq.com (no credit card)
GROQ_API_KEY=gsk_...

# For BYOK with GPT-4o:
OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

Open `http://localhost:3000`. The algorithm engine works without any API keys.

---

## Deployment

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in the Vercel dashboard
4. Deploy — every push to main auto-deploys

One production note: the file-based user store (`data/store.json`) doesn't persist on Vercel's serverless infrastructure. For production, swap `lib/store.ts` for a Vercel KV implementation — the interface is identical.

---

## What's next

See [BACKLOG.md](./BACKLOG.md) for hypotheses being tested with early users and features in consideration for V2.

---

Built by [Vaibhav Shrivastava](https://vaibhav.sh) · [GitHub](https://github.com/vaibhav-iitr/resume-lens). Inspired by the four-reader hiring model from Austen McDonald and Neo Kim.
