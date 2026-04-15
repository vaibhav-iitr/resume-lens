export type PersonaId = 'ats' | 'recruiter' | 'interviewer' | 'hiring_manager';

export interface PersonaFinding {
  strengths: string[];   // 2–3 specific strengths, citing resume text where possible
  issues: string[];      // 2–3 specific issues with explanation
}

export interface PersonaScore {
  id: PersonaId;
  label: string;         // e.g. "ATS / Machine Filter"
  score: number;         // 0–100
  finding: PersonaFinding;
}

export interface PriorityFix {
  rank: number;          // 1–5
  issue: string;         // Short label, e.g. "Summary is generic"
  explanation: string;   // Specific, actionable detail citing the resume
}

export interface AnalysisResult {
  overallScore: number;          // 0–100, weighted average across personas
  verdict: string;               // One-line summary, e.g. "Solid technical profile, weak business impact framing"
  personas: PersonaScore[];      // Ordered: ATS → Recruiter → Interviewer → Hiring Manager
  priorityFixes: PriorityFix[];  // Top 5, ranked by impact
  missingKeywords: string[];     // Terms in JD not reflected in resume
  redFlags: string[];            // Short stints, gaps, vague bullets, no quantification
}

// What the API route receives from the client
export interface AnalyzeRequest {
  resumeText: string;
  jobDescription: string;
}

// What the API route returns to the client
export type AnalyzeResponse =
  | { success: true; result: AnalysisResult; llmUsesRemaining?: number }
  | { success: false; error: string };
