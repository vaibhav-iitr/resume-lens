import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from './claude';
import { AnalysisResult } from './types';

export async function analyzeResumeWithGroq(
  resumeText: string,
  jobDescription: string,
  apiKey?: string,
): Promise<AnalysisResult> {
  const groq = new Groq({
    apiKey: apiKey ?? process.env.GROQ_API_KEY,
  });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      },
    ],
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content ?? '';

  // Strip markdown code fences if the model wraps the JSON
  const raw = content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse Groq response as JSON');
  }

  return parsed;
}
