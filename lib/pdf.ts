import { PDFParse } from 'pdf-parse';

// Disable pdfjs web worker — it cannot run in a Next.js server/API route context.
PDFParse.setWorker('');

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text.trim();

  if (!text || text.length < 50) {
    throw new Error(
      'Could not extract readable text from this PDF. Try pasting the resume as plain text instead.'
    );
  }

  return text;
}
