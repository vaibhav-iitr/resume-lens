import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './claude';
import { AnalysisResult } from './types';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeResumeWithOpenAI(
  resumeText: string,
  jobDescription: string,
  apiKey?: string,
): Promise<AnalysisResult> {
  const openai = apiKey ? new OpenAI({ apiKey }) : client;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      },
    ],
  });

  const raw = (completion.choices[0]?.message?.content ?? '')
    .trim()
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '');

  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    throw new Error('Failed to parse OpenAI response as JSON');
  }
}
