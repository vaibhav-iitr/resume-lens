/**
 * Algorithmic resume analyzer — no LLM required.
 *
 * Scores a resume against a job description across the same four-reader
 * framework as the Claude-based analyzer. Every finding cites specific
 * text or counts from the resume, not generic advice.
 */

import { AnalysisResult, PersonaScore, PriorityFix } from './types';

// Word lists

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'had', 'him', 'his', 'has', 'its', 'may', 'will',
  'who', 'with', 'this', 'that', 'from', 'they', 'been', 'have', 'what',
  'when', 'your', 'each', 'also', 'into', 'some', 'than', 'then', 'them',
  'these', 'those', 'such', 'more', 'very', 'just', 'both', 'only', 'over',
  'must', 'well', 'able', 'here', 'how', 'work', 'able', 'across', 'within',
  'about', 'including', 'using', 'strong', 'good', 'new', 'other', 'need',
  'role', 'team', 'join', 'help', 'make', 'take', 'seek', 'looking',
]);

const STRONG_ACTION_VERBS = new Set([
  'led', 'built', 'designed', 'architected', 'launched', 'drove', 'delivered',
  'created', 'developed', 'engineered', 'established', 'founded', 'grew',
  'improved', 'increased', 'reduced', 'decreased', 'accelerated', 'achieved',
  'automated', 'consolidated', 'cut', 'defined', 'deployed', 'eliminated',
  'expanded', 'generated', 'hired', 'implemented', 'introduced', 'led',
  'managed', 'migrated', 'optimised', 'optimized', 'owned', 'pioneered',
  'productionised', 'productionized', 'published', 'rebuilt', 'refactored',
  'replaced', 'rescued', 'restructured', 'scaled', 'secured', 'shipped',
  'solved', 'spearheaded', 'streamlined', 'transformed', 'unified',
]);

const WEAK_ACTION_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'helped build', 'helped develop',
  'contributed to', 'assisted with', 'assisted in', 'was part of', 'involved in',
  'participated in', 'supported', 'collaborated on', 'tasked with',
];

const BUZZWORDS = new Set([
  'passionate', 'results-driven', 'results driven', 'team player', 'self-starter',
  'self starter', 'hard worker', 'detail-oriented', 'detail oriented',
  'go-getter', 'thought leader', 'synergy', 'leverage', 'dynamic', 'motivated',
  'enthusiastic', 'dedicated', 'proactive', 'innovative', 'strategic thinker',
  'problem solver', 'fast learner', 'quick learner', 'outside the box',
  'value add', 'value-add', 'rockstar', 'ninja', 'guru', 'wizard',
]);

const BUSINESS_IMPACT_TERMS = [
  'revenue', 'cost', 'saving', 'savings', 'profit', 'margin', 'conversion',
  'retention', 'churn', 'growth', 'customers', 'users', 'adoption', 'engagement',
  'efficiency', 'productivity', 'roi', 'arpu', 'mrr', 'arr', 'nps', 'csat',
  'incidents', 'downtime', 'reliability', 'availability', 'latency', 'p99',
  'throughput', 'scale', 'capacity',
];

const SCOPE_TERMS = [
  'team', 'engineers', 'stakeholders', 'cross-functional', 'cross functional',
  'organisation', 'organization', 'department', 'reports', 'budget', 'roadmap',
  'strategy', 'quarterly', 'annual', 'million', 'billion', 'thousand',
];

// Text utilities

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\+#\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function meaningfulTokens(text: string): string[] {
  return tokenize(text).filter(w => !STOP_WORDS.has(w) && w.length > 2);
}

/** Extract lines that look like resume bullets or content lines. */
function extractBullets(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 25)
    .filter(l => !/^(education|experience|skills|summary|objective|profile|work history|employment|projects|certifications|awards)/i.test(l));
}

/** Rough word count → estimated page count. */
function estimatePages(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 450));
}

/** Detect dates in text and return list of {start, end, durationMonths, context}. */
function extractRoledurations(text: string): Array<{ durationMonths: number; context: string }> {
  const results: Array<{ durationMonths: number; context: string }> = [];

  // Match patterns like: Jan 2020 – Mar 2021, 2019 - 2022, Jan 2021 – Present
  const dateRangeRe =
    /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{4})\s*[–\-—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{4}|present|current|now)/gi;

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  let match;
  while ((match = dateRangeRe.exec(text)) !== null) {
    const startYear = parseInt(match[1]);
    const endRaw = match[2].toLowerCase();
    const endYear = endRaw === 'present' || endRaw === 'current' || endRaw === 'now'
      ? new Date().getFullYear()
      : parseInt(match[2]);

    const duration = (endYear - startYear) * 12;
    if (duration >= 0 && duration < 600) {
      const context = text.slice(Math.max(0, match.index - 80), match.index + 40).trim();
      results.push({ durationMonths: duration, context });
    }
  }

  return results;
}

/** Count bullets containing a number, percentage, or multiplier. */
function countQuantifiedBullets(bullets: string[]): { quantified: number; total: number; examples: string[] } {
  const numberRe = /\d+[%x]?|\d+\s*(million|billion|thousand|k\b|x\b)/i;
  const quantified = bullets.filter(b => numberRe.test(b));
  return {
    quantified: quantified.length,
    total: bullets.length,
    examples: quantified.slice(0, 2),
  };
}

/** Find weak phrases in bullet list and return matching bullets. */
function findWeakBullets(bullets: string[]): string[] {
  return bullets.filter(b => {
    const lower = b.toLowerCase();
    return WEAK_ACTION_PHRASES.some(phrase => lower.includes(phrase));
  });
}

/** Find buzzwords present in a text block. */
function findBuzzwords(text: string): string[] {
  const lower = text.toLowerCase();
  return Array.from(BUZZWORDS).filter(bz => lower.includes(bz));
}

/** Extract JD keywords above noise threshold. */
function extractJDKeywords(jd: string): string[] {
  const tokens = meaningfulTokens(jd);
  const freq: Record<string, number> = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }

  // Also extract adjacent two-word technical terms
  const words = tokenize(jd);
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      freq[bigram] = (freq[bigram] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .filter(([, count]) => count >= 2 || /[A-Z]/.test(jd.slice(jd.toLowerCase().indexOf(Object.keys(freq)[0]), jd.toLowerCase().indexOf(Object.keys(freq)[0]) + 20)))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 40)
    .map(([term]) => term);
}

/** Find JD keywords absent from resume. */
function findMissingKeywords(resumeText: string, jdKeywords: string[]): string[] {
  const resumeLower = resumeText.toLowerCase();
  return jdKeywords
    .filter(kw => !resumeLower.includes(kw))
    .slice(0, 12);
}

/** Keyword overlap score (0–100). */
function keywordOverlapScore(resumeText: string, jdKeywords: string[]): number {
  if (!jdKeywords.length) return 50;
  const resumeLower = resumeText.toLowerCase();
  const matched = jdKeywords.filter(kw => resumeLower.includes(kw)).length;
  return Math.round((matched / jdKeywords.length) * 100);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Persona scorers

function scoreATS(resumeText: string, jdKeywords: string[], missingKeywords: string[]): PersonaScore {
  const lower = resumeText.toLowerCase();
  const strengths: string[] = [];
  const issues: string[] = [];

  // Keyword overlap
  const overlapPct = keywordOverlapScore(resumeText, jdKeywords);

  // Section presence
  const hasSkills = /skills|technologies|tech stack/i.test(resumeText);
  const hasEducation = /education|degree|university|college|b\.s\.|m\.s\.|bachelor|master/i.test(resumeText);
  const hasExperience = /experience|employment|work history/i.test(resumeText);

  // Format risk: tables are invisible in plain text, but multi-column layouts
  // produce garbled extraction — look for unusual line patterns
  const pages = estimatePages(resumeText);
  const avgLineLen = resumeText.split('\n').filter(l => l.trim()).reduce((s, l) => s + l.length, 0) /
    Math.max(1, resumeText.split('\n').filter(l => l.trim()).length);
  const formatRisk = avgLineLen < 30; // Very short lines suggest multi-column

  // Score
  let score = overlapPct * 0.55;
  if (hasSkills) score += 10;
  if (hasEducation) score += 8;
  if (hasExperience) score += 12;
  if (formatRisk) score -= 10;

  score = clamp(Math.round(score), 20, 95);

  // Strengths
  if (overlapPct >= 60) {
    strengths.push(`Good keyword coverage — ${overlapPct}% of key JD terms appear in your resume.`);
  } else if (overlapPct >= 40) {
    strengths.push(`Moderate keyword match — ${overlapPct}% of JD terms found. Core terms are present.`);
  }
  if (hasSkills) strengths.push('Skills section is present and indexable by ATS.');
  if (hasEducation && !strengths.find(s => s.includes('Education'))) {
    strengths.push('Education credentials are clearly present and parseable.');
  }
  if (strengths.length === 0) strengths.push('Standard resume sections detected — parseable by most ATS systems.');

  // Issues
  if (missingKeywords.length > 0) {
    issues.push(
      `${missingKeywords.length} JD terms are absent from your resume: ${missingKeywords.slice(0, 5).join(', ')}${missingKeywords.length > 5 ? ` and ${missingKeywords.length - 5} more` : ''}.`
    );
  }
  if (formatRisk) {
    issues.push('Short average line length suggests a multi-column layout. Many ATS parsers misread columns and scramble your content.');
  }
  if (pages > 2) {
    issues.push(`Resume is approximately ${pages} pages. Most ATS systems deprioritise resumes over 2 pages for individual contributor roles.`);
  }
  if (issues.length === 0 && overlapPct < 50) {
    issues.push('Keyword overlap is below 50% — this resume may be filtered before a human sees it. Review the missing keywords list.');
  }
  if (issues.length === 0) issues.push('No critical ATS risks detected, but review missing keywords to improve your ranking.');

  return {
    id: 'ats',
    label: 'ATS / Machine Filter',
    score,
    finding: { strengths: strengths.slice(0, 3), issues: issues.slice(0, 3) },
  };
}

function scoreRecruiter(resumeText: string, jdText: string): PersonaScore {
  const strengths: string[] = [];
  const issues: string[] = [];

  const pages = estimatePages(resumeText);
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);

  // Summary detection: look for a block of 2–5 lines near the top that isn't a section header
  const topLines = lines.slice(0, 15).join(' ');
  const hasSummary = topLines.length > 100;
  const summaryText = lines.slice(0, 8).join(' ');
  const buzzwordsFound = findBuzzwords(summaryText);

  // Brand signal: look for known markers of recognisable companies (imperfect but reasonable)
  const companySignals = (resumeText.match(/\b(google|meta|facebook|amazon|apple|microsoft|netflix|uber|stripe|airbnb|spotify|twitter|linkedin|salesforce|oracle|ibm|accenture|mckinsey|goldman|jpmorgan|booking\.com|booking|shopify|atlassian|twilio|databricks|snowflake|openai|anthropic)\b/gi) || []);

  // Score
  let score = 50;
  if (hasSummary) score += 10;
  if (pages === 1) score += 15;
  else if (pages === 2) score += 5;
  else score -= 10;
  if (buzzwordsFound.length > 2) score -= 10;
  if (companySignals.length > 0) score += 10;
  if (!hasSummary) score -= 5;

  score = clamp(Math.round(score), 20, 95);

  // Strengths
  if (companySignals.length > 0) {
    const unique = [...new Set(companySignals.map(c => c.toLowerCase()))];
    strengths.push(`Recognisable company names present (${unique.slice(0, 2).join(', ')}) — will catch a recruiter's eye in a 5-second scan.`);
  }
  if (pages === 1) strengths.push('Resume fits one page — recruiters can scan the full picture without scrolling.');
  if (hasSummary && buzzwordsFound.length <= 1) strengths.push('A summary is present and relatively specific — recruiter can quickly assess fit.');

  // Issues
  if (!hasSummary) {
    issues.push('No summary section detected. Recruiters spend 5–7 seconds on a first pass — without a strong opening, they move on.');
  } else if (buzzwordsFound.length > 1) {
    issues.push(`Summary contains buzzwords that signal nothing: "${buzzwordsFound.slice(0, 3).join('", "')}". Replace with specific outcomes or technologies.`);
  }
  if (pages > 2) {
    issues.push(`At ~${pages} pages, this resume is too long for a quick recruiter scan. Trim to 1–2 pages.`);
  }
  if (companySignals.length === 0) {
    issues.push('No immediately recognisable company or project names detected. If you have notable brand signals, make them visible in the top half.');
  }
  if (strengths.length === 0) strengths.push('Contact information and standard structure are in place.');
  if (issues.length === 0) issues.push('No major recruiter red flags. Ensure the most impressive role is in the top third of the resume.');

  return {
    id: 'recruiter',
    label: 'Recruiter / Sourcer',
    score,
    finding: { strengths: strengths.slice(0, 3), issues: issues.slice(0, 3) },
  };
}

function scoreInterviewer(resumeText: string): PersonaScore {
  const strengths: string[] = [];
  const issues: string[] = [];

  const bullets = extractBullets(resumeText);
  const { quantified, total, examples } = countQuantifiedBullets(bullets);
  const weakBullets = findWeakBullets(bullets);
  const durations = extractRoledurations(resumeText);
  const shortStints = durations.filter(d => d.durationMonths > 0 && d.durationMonths < 12);

  // Quantification rate
  const quantRate = total > 0 ? quantified / total : 0;

  // Strong verb rate — check first word of each bullet
  const strongVerbBullets = bullets.filter(b => {
    const firstWord = b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    return STRONG_ACTION_VERBS.has(firstWord);
  });
  const strongVerbRate = total > 0 ? strongVerbBullets.length / total : 0;

  // Score
  let score = 50;
  score += Math.round(quantRate * 25);
  score += Math.round(strongVerbRate * 15);
  score -= Math.min(20, weakBullets.length * 5);
  score -= Math.min(15, shortStints.length * 8);

  score = clamp(Math.round(score), 15, 95);

  // Strengths
  if (quantRate >= 0.4) {
    strengths.push(`${quantified} of ${total} bullets (${Math.round(quantRate * 100)}%) include numbers or metrics — strong signal for interviewers.`);
  } else if (quantRate >= 0.2) {
    strengths.push(`${quantified} bullets include quantification. This is a foundation to build on.`);
  }
  if (strongVerbRate >= 0.5) {
    strengths.push(`Majority of bullets lead with strong action verbs — shows ownership and decisiveness.`);
  }
  if (weakBullets.length === 0 && total > 3) {
    strengths.push('No weak ownership language detected — every bullet reads as direct contribution.');
  }

  // Issues
  if (quantRate < 0.3 && total > 0) {
    issues.push(
      `Only ${quantified} of ${total} bullets (${Math.round(quantRate * 100)}%) include a number or metric. Interviewers will probe for evidence — give it to them upfront.`
    );
  }
  if (weakBullets.length > 0) {
    const examples = weakBullets.slice(0, 2).map(b => `"${b.slice(0, 60)}..."`).join('; ');
    issues.push(`${weakBullets.length} bullet${weakBullets.length > 1 ? 's' : ''} use weak ownership language. Examples: ${examples}`);
  }
  if (shortStints.length > 0) {
    issues.push(`${shortStints.length} role${shortStints.length > 1 ? 's' : ''} under 12 months detected. Expect questions — prepare a clear narrative.`);
  }

  if (strengths.length === 0) strengths.push('Resume includes role-specific technical context, which supports interview discussions.');
  if (issues.length === 0) issues.push('No major interviewer red flags. Ensure every claim can be defended under follow-up questions.');

  return {
    id: 'interviewer',
    label: 'Interviewer',
    score,
    finding: { strengths: strengths.slice(0, 3), issues: issues.slice(0, 3) },
  };
}

function scoreHiringManager(resumeText: string, jdText: string): PersonaScore {
  const strengths: string[] = [];
  const issues: string[] = [];

  const bullets = extractBullets(resumeText);
  const lower = resumeText.toLowerCase();

  // Business impact language
  const impactTermsFound = BUSINESS_IMPACT_TERMS.filter(t => lower.includes(t));
  const scopeTermsFound = SCOPE_TERMS.filter(t => lower.includes(t));

  // JD relevance: do the first 3 bullets of the most recent role contain JD terms?
  const jdTokens = new Set(meaningfulTokens(jdText));
  const topBullets = bullets.slice(0, 5);
  const relevantTopBullets = topBullets.filter(b =>
    meaningfulTokens(b).some(t => jdTokens.has(t))
  );

  // Outcome vs activity: does bullet start with impact term or number?
  const outcomeLeadBullets = bullets.filter(b => {
    const lower = b.toLowerCase();
    return /^\d/.test(b) || BUSINESS_IMPACT_TERMS.some(t => lower.startsWith(t)) ||
      STRONG_ACTION_VERBS.has(b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, ''));
  });
  const outcomeRate = bullets.length > 0 ? outcomeLeadBullets.length / bullets.length : 0;

  // Score
  let score = 45;
  score += Math.min(20, impactTermsFound.length * 3);
  score += Math.min(10, scopeTermsFound.length * 2);
  score += Math.round(outcomeRate * 15);
  if (relevantTopBullets.length >= 3) score += 10;
  else if (relevantTopBullets.length >= 1) score += 5;

  score = clamp(Math.round(score), 15, 95);

  // Strengths
  if (impactTermsFound.length >= 4) {
    strengths.push(`Business impact language is present throughout: ${impactTermsFound.slice(0, 4).join(', ')}. Hiring managers read for outcomes.`);
  } else if (impactTermsFound.length >= 2) {
    strengths.push(`Some business impact language found (${impactTermsFound.slice(0, 3).join(', ')}). A foundation, but it can go further.`);
  }
  if (scopeTermsFound.length >= 2) {
    strengths.push(`Scope signals present (${scopeTermsFound.slice(0, 3).join(', ')}) — hiring managers look for evidence of operating at the right level.`);
  }
  if (relevantTopBullets.length >= 3) {
    strengths.push('Most recent role\'s top bullets are directly relevant to the JD — hiring manager will see immediate fit.');
  }

  // Issues
  if (impactTermsFound.length < 2) {
    issues.push('Almost no business impact language. A hiring manager cares about what the work achieved, not what was built. Add revenue, cost, user, or scale context to your strongest bullets.');
  }
  if (relevantTopBullets.length < 2) {
    issues.push('The first bullets in your most recent role do not clearly match what the JD is hiring for. Reorder to lead with the most relevant work.');
  }
  if (outcomeRate < 0.3) {
    issues.push(`Only ${Math.round(outcomeRate * 100)}% of bullets lead with an outcome or impact signal. Hiring managers skim for results first — restructure bullets to lead with the "so what".`);
  }

  if (strengths.length === 0) strengths.push('Career progression and tenure are visible and credible.');
  if (issues.length === 0) issues.push('Strong business framing. Ensure the most impactful work is ordered first within each role.');

  return {
    id: 'hiring_manager',
    label: 'Hiring Manager',
    score,
    finding: { strengths: strengths.slice(0, 3), issues: issues.slice(0, 3) },
  };
}

// Priority fixes

function generatePriorityFixes(
  resumeText: string,
  jdText: string,
  atsScore: PersonaScore,
  recruiterScore: PersonaScore,
  interviewerScore: PersonaScore,
  hmScore: PersonaScore,
  missingKeywords: string[],
): PriorityFix[] {
  const fixes: Array<{ weight: number; fix: PriorityFix }> = [];

  const bullets = extractBullets(resumeText);
  const weakBullets = findWeakBullets(bullets);
  const { quantified, total } = countQuantifiedBullets(bullets);
  const pages = estimatePages(resumeText);
  const hasSummary = resumeText.split('\n').slice(0, 15).join(' ').length > 100;
  const buzzwords = findBuzzwords(resumeText.split('\n').slice(0, 8).join(' '));
  const quantRate = total > 0 ? quantified / total : 0;
  const impactTermsFound = BUSINESS_IMPACT_TERMS.filter(t => resumeText.toLowerCase().includes(t));

  if (missingKeywords.length > 3) {
    fixes.push({
      weight: 90,
      fix: {
        rank: 0,
        issue: 'Add missing JD keywords',
        explanation: `${missingKeywords.length} terms from the JD don't appear in your resume: ${missingKeywords.slice(0, 6).join(', ')}. If you have this experience, name it explicitly. ATS filters on keyword presence.`,
      },
    });
  }

  if (!hasSummary || buzzwords.length > 1) {
    fixes.push({
      weight: 85,
      fix: {
        rank: 0,
        issue: !hasSummary ? 'Add a targeted summary' : 'Rewrite the summary',
        explanation: !hasSummary
          ? 'No summary detected. Add 2–3 sentences that name your specialty, your scale, and your most relevant recent outcome. This is the first thing a recruiter reads.'
          : `Your summary uses ${buzzwords.length} buzzwords ("${buzzwords.slice(0, 2).join('", "')}") that say nothing specific. Replace with a concrete outcome, your specialty, and the scope you operate at.`,
      },
    });
  }

  if (weakBullets.length > 0) {
    fixes.push({
      weight: 80,
      fix: {
        rank: 0,
        issue: `Remove weak ownership language (${weakBullets.length} bullet${weakBullets.length > 1 ? 's' : ''})`,
        explanation: `Phrases like "contributed to", "helped build", and "was part of" signal supporting work. Rewrite to state what you personally designed, decided, or delivered. If you genuinely only supported, cut the bullet.`,
      },
    });
  }

  if (quantRate < 0.3 && total > 3) {
    fixes.push({
      weight: 75,
      fix: {
        rank: 0,
        issue: 'Add metrics to more bullets',
        explanation: `Only ${quantified} of ${total} bullets (${Math.round(quantRate * 100)}%) include a number. Add percentages, user counts, latency figures, team sizes, or time saved. Unquantified claims are easy for interviewers to dismiss.`,
      },
    });
  }

  if (impactTermsFound.length < 3) {
    fixes.push({
      weight: 70,
      fix: {
        rank: 0,
        issue: 'Connect engineering work to business outcomes',
        explanation: 'Very little business impact language detected. For each major project, add one sentence explaining what it changed: cost, revenue, users, retention, or reliability. Hiring managers are measured on these — they hire people who speak the same language.',
      },
    });
  }

  if (pages > 2) {
    fixes.push({
      weight: 60,
      fix: {
        rank: 0,
        issue: `Trim to 2 pages (currently ~${pages})`,
        explanation: 'Resumes over 2 pages dilute density and cause recruiters and ATS to miss your strongest work. Cut roles older than 10 years to a single line or remove them entirely.',
      },
    });
  }

  // Sort by weight, rank, and cap at 5
  return fixes
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((f, i) => ({ ...f.fix, rank: i + 1 }));
}

// Red flag detection

function detectRedFlags(resumeText: string): string[] {
  const flags: string[] = [];
  const bullets = extractBullets(resumeText);
  const durations = extractRoledurations(resumeText);

  const shortStints = durations.filter(d => d.durationMonths > 0 && d.durationMonths < 12);
  if (shortStints.length >= 2) {
    flags.push(`${shortStints.length} roles under 12 months detected. Multiple short stints signal instability — expect questions about each.`);
  } else if (shortStints.length === 1) {
    flags.push('One role under 12 months detected. Be ready with a clear and credible explanation.');
  }

  const weakBullets = findWeakBullets(bullets);
  if (weakBullets.length >= 3) {
    flags.push(`${weakBullets.length} bullets use weak contribution language ("contributed to", "helped", "was part of") — will invite scrutiny in interviews.`);
  }

  const { quantified, total } = countQuantifiedBullets(bullets);
  if (total > 5 && quantified / total < 0.15) {
    flags.push('Fewer than 15% of bullets include any metric. Unquantified resumes are common red flags for interviewers looking for ownership evidence.');
  }

  // Check for repeated unquantified claims
  const vaguePhrases = ['improved performance', 'improved reliability', 'improved efficiency', 'improved quality'];
  const found = vaguePhrases.filter(p => (resumeText.toLowerCase().match(new RegExp(p, 'g')) || []).length >= 2);
  if (found.length > 0) {
    flags.push(`"${found[0]}" appears multiple times without metrics. Repeated vague claims are a red flag for experienced interviewers.`);
  }

  return flags.slice(0, 4);
}

// Main export

export function analyzeResumeAlgorithmically(
  resumeText: string,
  jobDescription: string,
): AnalysisResult {
  const jdKeywords = extractJDKeywords(jobDescription);
  const missingKeywords = findMissingKeywords(resumeText, jdKeywords);

  const ats = scoreATS(resumeText, jdKeywords, missingKeywords);
  const recruiter = scoreRecruiter(resumeText, jobDescription);
  const interviewer = scoreInterviewer(resumeText);
  const hm = scoreHiringManager(resumeText, jobDescription);

  const overallScore = Math.round(
    ats.score * 0.20 +
    recruiter.score * 0.25 +
    interviewer.score * 0.30 +
    hm.score * 0.25,
  );

  const priorityFixes = generatePriorityFixes(
    resumeText, jobDescription, ats, recruiter, interviewer, hm, missingKeywords,
  );

  const redFlags = detectRedFlags(resumeText);

  // Verdict
  let verdict: string;
  if (overallScore >= 75) {
    verdict = 'Strong overall profile — focused improvements to keywords and impact framing will sharpen it further.';
  } else if (overallScore >= 60) {
    verdict = 'Solid foundation with real gaps in business impact framing and keyword coverage — addressable with targeted edits.';
  } else if (overallScore >= 45) {
    verdict = 'Core experience is there but the resume is not packaging it effectively — significant rewriting needed to pass each reader.';
  } else {
    verdict = 'Resume needs substantial work before it will pass ATS and recruiter filters for this role.';
  }

  return {
    overallScore,
    verdict,
    personas: [ats, recruiter, interviewer, hm],
    priorityFixes,
    missingKeywords: missingKeywords.slice(0, 10),
    redFlags,
  };
}
