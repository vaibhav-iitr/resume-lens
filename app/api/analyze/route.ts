import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { analyzeResume, MOCK_RESULT } from '@/lib/claude';
import { analyzeResumeWithGroq } from '@/lib/groq';
import { analyzeResumeWithOpenAI } from '@/lib/openai';
import { analyzeResumeAlgorithmically } from '@/lib/analyzer';
import { AnalyzeResponse } from '@/lib/types';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getUserById, decrementLLMUse } from '@/lib/store';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  let resumeText: string;
  let jobDescription: string;
  let engine: string;
  let apiKey: string | undefined;
  let provider: string;

  try {
    if (contentType.includes('multipart/form-data')) {
      // PDF upload path
      const formData = await request.formData();
      const file = formData.get('resume');
      const jd = formData.get('jobDescription');
      engine = (formData.get('engine') as string) ?? 'algorithm';
      apiKey = (formData.get('apiKey') as string) || undefined;
      provider = (formData.get('provider') as string) ?? 'anthropic';

      if (!file || typeof file === 'string') {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'No PDF file provided' },
          { status: 400 }
        );
      }

      if (typeof jd !== 'string' || jd.trim().length < 50) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Job description is too short or missing' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const { extractTextFromPdf } = await import('@/lib/pdf');
      resumeText = await extractTextFromPdf(Buffer.from(arrayBuffer));
      jobDescription = jd.trim();
    } else {
      // Plain text / JSON path
      const body = await request.json();
      resumeText = body.resumeText ?? '';
      jobDescription = body.jobDescription ?? '';
      engine = body.engine ?? 'algorithm';
      apiKey = body.apiKey || undefined;
      provider = body.provider ?? 'anthropic';

      if (resumeText.trim().length < 50) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Resume text is too short or missing' },
          { status: 400 }
        );
      }

      if (jobDescription.trim().length < 50) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Job description is too short or missing' },
          { status: 400 }
        );
      }

      resumeText = resumeText.trim();
      jobDescription = jobDescription.trim();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read request';
    return NextResponse.json<AnalyzeResponse>(
      { success: false, error: message },
      { status: 400 }
    );
  }

  try {
    if (engine === 'mock') {
      return NextResponse.json<AnalyzeResponse>({ success: true, result: MOCK_RESULT });
    }

    if (engine === 'byok') {
      const result =
        provider === 'groq'     ? await analyzeResumeWithGroq(resumeText, jobDescription, apiKey) :
        provider === 'openai'   ? await analyzeResumeWithOpenAI(resumeText, jobDescription, apiKey) :
        await analyzeResume(resumeText, jobDescription, apiKey);
      return NextResponse.json<AnalyzeResponse>({ success: true, result });
    }

    if (engine === 'llm') {
      // Check auth
      const cookieStore = await cookies();
      const token = cookieStore.get(COOKIE_NAME)?.value;
      if (!token) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      const payload = await verifyToken(token);
      if (!payload) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'Invalid or expired session' },
          { status: 401 }
        );
      }
      const user = getUserById(payload.sub);
      if (!user) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'User not found' },
          { status: 401 }
        );
      }
      if (user.llmUsesRemaining <= 0) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: 'No AI analyses remaining. Use the algorithm or your own API key.' },
          { status: 403 }
        );
      }

      const result = await analyzeResumeWithGroq(resumeText, jobDescription);
      const updated = decrementLLMUse(user.id);

      return NextResponse.json<AnalyzeResponse>({
        success: true,
        result,
        llmUsesRemaining: updated?.llmUsesRemaining ?? 0,
      });
    }

    // Default: algorithm
    // Also keep backward-compat with ANALYSIS_ENGINE env var for server-level default
    const envEngine = process.env.ANALYSIS_ENGINE ?? 'algorithm';
    const result =
      envEngine === 'mock'   ? MOCK_RESULT :
      envEngine === 'claude' ? await analyzeResume(resumeText, jobDescription) :
      analyzeResumeAlgorithmically(resumeText, jobDescription);

    return NextResponse.json<AnalyzeResponse>({ success: true, result });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json<AnalyzeResponse>(
      { success: false, error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
