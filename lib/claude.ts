import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const SYSTEM_PROMPT = `You are a senior engineering hiring expert who has reviewed thousands of resumes at top technology companies. You evaluate resumes through the lens of four distinct readers — the real people (and systems) a resume must pass in sequence.

Your evaluations are specific, rigorous, and cite actual text from the resume. You never give generic advice. Every issue you raise must reference something specific in the resume or something conspicuously absent from it.

## The Four-Reader Framework

**Reader 1 — ATS / Machine Filter**
Evaluates: keyword relevance to the JD (semantic, not just exact match), clean parseable formatting (no tables/text boxes/images), minimum qualifications clearly present (years of experience, education, role titles), technologies named explicitly.

**Reader 2 — Recruiter / Sourcer**
Evaluates: summary quality (specific vs generic/buzzword-laden), visual length and density (ideally one page), presence of recognizable companies or signals, whether minimum qualifications surface within the first scan.

**Reader 3 — Interviewer**
Evaluates: bullet quality (results-led vs activity-led), quantification (numbers, percentages, scope), technical depth embedded in accomplishment bullets (not just skills section), red flags (short stints under 12 months, gaps over 6 months, vague claims without evidence).

**Reader 4 — Hiring Manager**
Evaluates: measurable business impact with appropriate scope, relevance of top accomplishments to what the JD is actually hiring for, seniority signals (drove outcomes vs supported them), ordering (most impactful bullets first).

## Scoring Guidance
- 85–100: Stands out positively, strong fit signal
- 70–84: Solid, passes this reader's filter, minor issues
- 50–69: Borderline, real issues that could cause rejection
- Below 50: Likely filtered out at this stage

## Output Format
Return ONLY valid JSON matching this exact schema — no preamble, no explanation outside the JSON:

{
  "overallScore": <number 0-100>,
  "verdict": "<one sentence, honest, specific — not marketing language>",
  "personas": [
    {
      "id": "ats",
      "label": "ATS / Machine Filter",
      "score": <number 0-100>,
      "finding": {
        "strengths": ["<specific strength citing resume text>", "<specific strength>"],
        "issues": ["<specific issue with explanation>", "<specific issue>"]
      }
    },
    {
      "id": "recruiter",
      "label": "Recruiter / Sourcer",
      "score": <number 0-100>,
      "finding": {
        "strengths": ["...", "..."],
        "issues": ["...", "..."]
      }
    },
    {
      "id": "interviewer",
      "label": "Interviewer",
      "score": <number 0-100>,
      "finding": {
        "strengths": ["...", "..."],
        "issues": ["...", "..."]
      }
    },
    {
      "id": "hiring_manager",
      "label": "Hiring Manager",
      "score": <number 0-100>,
      "finding": {
        "strengths": ["...", "..."],
        "issues": ["...", "..."]
      }
    }
  ],
  "priorityFixes": [
    {
      "rank": 1,
      "issue": "<short label>",
      "explanation": "<specific, actionable — what exactly to fix and why>"
    },
    { "rank": 2, "issue": "...", "explanation": "..." },
    { "rank": 3, "issue": "...", "explanation": "..." },
    { "rank": 4, "issue": "...", "explanation": "..." },
    { "rank": 5, "issue": "...", "explanation": "..." }
  ],
  "missingKeywords": ["<term from JD absent in resume>", "..."],
  "redFlags": ["<specific red flag with context>", "..."]
}

Rules:
- personas array must contain exactly 4 entries in this order: ats, recruiter, interviewer, hiring_manager
- each persona must have exactly 2–3 strengths and 2–3 issues
- priorityFixes must contain exactly 5 entries
- missingKeywords and redFlags may be empty arrays if none apply
- overallScore is a weighted average: ATS 20%, Recruiter 25%, Interviewer 30%, Hiring Manager 25%
- if redFlags is empty, still include the key with an empty array
- return nothing outside the JSON object`;

export const MOCK_RESULT: AnalysisResult = {
  overallScore: 62,
  verdict: "Strong technical depth, but business impact is buried and the summary reads like a job spec rather than a pitch.",
  personas: [
    {
      id: "ats",
      label: "ATS / Machine Filter",
      score: 74,
      finding: {
        strengths: [
          "Core technologies (React, TypeScript, Node.js, PostgreSQL) are named explicitly and match the JD closely.",
          "Role titles and tenure are clearly formatted and parseable — no tables or text boxes detected.",
        ],
        issues: [
          "Missing 'CI/CD' and 'observability' — both appear in the JD requirements but are absent from the resume.",
          "Education section is at the bottom; some ATS parsers deprioritise candidates when it isn't found quickly.",
        ],
      },
    },
    {
      id: "recruiter",
      label: "Recruiter / Sourcer",
      score: 55,
      finding: {
        strengths: [
          "Two recognisable company names in the last 4 years signal credibility in the 5-second scan.",
          "Tenure is stable — no short stints to explain away in a screen call.",
        ],
        issues: [
          "The summary ('Experienced software engineer with a passion for…') is generic and would not stop a recruiter scrolling. It says nothing about what you specifically do or at what scale.",
          "The resume runs to two pages; the second page contains three roles that add context but dilute density. A recruiter scanning fast may not reach your strongest work.",
        ],
      },
    },
    {
      id: "interviewer",
      label: "Interviewer",
      score: 58,
      finding: {
        strengths: [
          "Several bullets lead with a result ('Reduced API latency by 40%…') — this is the right structure and will hold up under technical questioning.",
          "Technical stack is embedded in accomplishment bullets, not just listed in a skills section.",
        ],
        issues: [
          "Three bullets use vague ownership language: 'contributed to', 'helped build', 'was part of'. These are red flags in an interview — they invite the question 'what did you personally do?'",
          "'Improved system reliability' appears twice across two roles with no metric. Interviewers will probe this and find nothing to grip.",
        ],
      },
    },
    {
      id: "hiring_manager",
      label: "Hiring Manager",
      score: 60,
      finding: {
        strengths: [
          "The most recent role shows scope — 'across 3 product teams' signals cross-functional influence, which matches what the JD is asking for.",
          "Progression from engineer to senior to tech lead is visible and credible.",
        ],
        issues: [
          "Business impact is almost entirely absent. Latency and uptime metrics appear, but there is nothing connecting engineering work to revenue, retention, or product outcomes — which is what a hiring manager is hired to care about.",
          "The strongest accomplishment (the platform migration) is the fourth bullet in its role. It should be first.",
        ],
      },
    },
  ],
  priorityFixes: [
    {
      rank: 1,
      issue: "Rewrite the summary",
      explanation: "Replace 'Experienced software engineer with a passion for…' with one sentence that names your specialty, your scale, and your most relevant recent outcome. This is the first thing a recruiter reads and currently gives them nothing.",
    },
    {
      rank: 2,
      issue: "Promote the platform migration bullet",
      explanation: "Your most impressive work is buried as bullet #4 in your most recent role. Move it to #1. Hiring managers read the first bullet of your current role and often stop there.",
    },
    {
      rank: 3,
      issue: "Remove 'contributed to' and 'helped build'",
      explanation: "These phrases signal supporting work, not ownership. Rewrite each bullet to say what you specifically designed, decided, or delivered. If you genuinely only supported, cut the bullet.",
    },
    {
      rank: 4,
      issue: "Add CI/CD and observability keywords",
      explanation: "Both terms appear in the JD requirements and are absent from your resume. If you have this experience, name the tools explicitly (e.g. GitHub Actions, Datadog, PagerDuty).",
    },
    {
      rank: 5,
      issue: "Quantify 'improved system reliability'",
      explanation: "This phrase appears twice without a number. Add uptime figures, incident reduction rates, or error rate changes. Unquantified reliability claims are among the most common interview red flags.",
    },
  ],
  missingKeywords: ["CI/CD", "observability", "on-call", "incident response", "distributed systems", "Kafka"],
  redFlags: [
    "Three bullets use vague contribution language ('contributed to', 'helped build', 'was part of') — will not hold up under technical interview scrutiny.",
    "'Improved system reliability' appears twice with no metric across two separate roles.",
  ],
};

export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  apiKey?: string
): Promise<AnalysisResult> {
  const activeClient = apiKey ? new Anthropic({ apiKey }) : client;
  const message = await activeClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user' as const,
        content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Strip markdown code fences if Claude wraps the JSON
  const raw = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse Claude response as JSON');
  }

  return parsed;
}
