# AI for PMs Series — Content Brief: Resume Lens Episode

This session is the richest Apply exercise in the series so far. It warrants special treatment — not a regular daily lesson but a case study episode covering a complete build-to-deploy arc.

---

## What happened (the raw material)

Built and shipped Resume Lens — a full-stack AI product — in a single Claude Code session. The product has:
- A rule-based algorithmic analysis engine
- Groq-powered AI analysis (free tier, 3 uses per account)
- BYOK support for Anthropic, OpenAI, and Groq
- JWT + bcrypt auth (signup, login, session)
- PDF upload + text paste input
- Deployed on Vercel, source on GitHub

Five production errors encountered and fixed. Multiple architectural decisions made in real time. Zero engineers involved.

---

## The story arc for LinkedIn + Substack

**Not:** "I built an AI tool and here's what it does."
**Yes:** "I shipped a real product using Claude Code. Here's what actually happened — including the three times it broke and how I fixed it without knowing the error in advance."

The failure-and-fix arc is the story. The fact that a PM with an engineering background but years away from writing code could do this is the insight. The process is replicable — that's the value to readers.

---

## LinkedIn post — option A (the result)

Opens with the product, ends with the implication.

---

Something I shipped this week: [resumelens-olive.vercel.app](https://resumelens-olive.vercel.app)

A resume analyzer that evaluates your CV through four real readers in sequence — ATS, recruiter, interviewer, hiring manager. Built with Claude Code, deployed on Vercel, live for anyone to use.

What I want to share isn't the product. It's what the build taught me.

Three things that were true before this project that I now believe more specifically:

**The AI coding loop is real, but the debugging loop is what matters.** The code came quickly. The five production errors — a PDF worker that wouldn't load, an SDK that crashed before handling any requests, a Vercel function crashing on every cold start — those took longer. Claude diagnosed each one. But I had to know what to paste and what to ask. Knowing how to debug with AI is a different skill from knowing how to prompt with AI.

**Algorithm-first is underrated in AI products.** The most useful engine in this app is the rule-based one — no API key, no cost, no rate limits, unlimited use. The LLM adds quality, not function. Build the algorithm first. Add the model as an upgrade, not as a dependency.

**The boundary of what a PM can ship has moved.** I'm not a developer. I haven't written production code in years. This took one focused session. That's new.

---

## LinkedIn post — option B (the process)

Opens with the failure, ends with the pattern.

---

The third time the production build failed, I almost called an engineer.

I was deploying Resume Lens — a resume analyzer I built with Claude Code — to Vercel. The app worked perfectly locally. In production, every single request crashed. The error was about a PDF parsing library trying to load a web worker that didn't exist in the serverless environment.

I hadn't seen this error before. I didn't know what a Turbopack build chunk was. I didn't know what `serverExternalPackages` did.

But I knew how to read an error message, describe the context, and ask the right question.

The fix was eight words in a config file.

Then the next error. Then the next. Five production errors in total. Each one diagnosed and fixed without escalating, without a ticket, without a dependency on anyone else.

This is what's changed. Not that PMs can now write perfect code. But that the gap between "I understand the problem" and "I can fix the problem" has collapsed for a specific class of technical issues.

The prerequisite isn't coding skill. It's the ability to read a stack trace, understand the system well enough to describe what's happening, and trust the loop.

---

## Substack article — structure

**Title:** The Build Log: What Actually Happened When I Shipped a Product in One Session

**Opening:** Start with the moment the fifth error appeared. Not "I built a product." Start in the middle of the failure.

**Section 1 — What I set out to build and why**
The four-reader resume framework. The problem with generic AI feedback. The decision to build something specific.

**Section 2 — The build sequence**
How it actually went in order. Types → API → UI → Algorithm → Auth → Deployment. Why this order worked.

**Section 3 — The five errors (the real story)**
Each one as a mini case study: what the error said, what I didn't understand, what I asked, what the fix was, what the pattern was. This section is the most useful part for readers.

**Section 4 — Three decisions that mattered**
Algorithm-first. Lazy loading. BYOK over a shared key. Each one with the reasoning.

**Section 5 — What this changes**
Not "AI will replace engineers." The specific, honest claim: for a certain class of technical problem — configuration, integration, debugging known error patterns — the engineering dependency is lower than it was. That's real and it's specific.

**Close:** Not a summary. A question for the reader: what would you build if you believed you could ship it?

---

## Where to execute this content

**Option A: Continue in Claude Chat (recommended for this episode)**
The series lives in Claude Chat. Take this brief there and say: "I'm working on a special episode of the AI for PMs series. Here is the raw material [paste CONTENT_BRIEF.md]. Help me write the LinkedIn post and Substack article in my established voice."
Claude Chat will have the series context and your writing style calibrated.

**Option B: Write here in Claude Code**
Works if you want to stay in one environment. The limitation: Claude Code doesn't have memory of your previous series posts or your refined voice across 12 episodes unless you paste the relevant context.
If you do this: paste your Day #0 'Why I'm Starting This' piece as a voice anchor before asking for drafts.

**My recommendation:** use this brief as the bridge. Write it here (done), take it to Claude Chat, and write the post there. Then come back to Claude Code when you have the next technical project to build.

---

*This brief captures the Apply. The Teach is the LinkedIn post and Substack article. The Learn was the build itself.*
