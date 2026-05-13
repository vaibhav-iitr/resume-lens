import { PDFParse } from 'pdf-parse';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // disableWorker: true — pdfjs-dist requires a worker script path in browser
  // environments; in a Next.js API route (Node.js) the worker cannot be
  // resolved, so we disable it and run synchronously in the main thread.
  const parser = new PDFParse({ data: buffer, disableWorker: true });
  const result = await parser.getText();
  const text = result.text.trim();

  if (!text || text.length < 50) {
    throw new Error(
      'Could not extract readable text from this PDF. If your CV is a scanned image, try pasting the text instead.'
    );
  }

  return text;
}
