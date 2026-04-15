'use client';

import { useState, useRef } from 'react';

interface ResumeInputProps {
  onResumeChange: (value: { type: 'text'; text: string } | { type: 'file'; file: File }) => void;
}

export default function ResumeInput({ onResumeChange }: ResumeInputProps) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    onResumeChange({ type: 'text', text: e.target.value });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onResumeChange({ type: 'file', file });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setFileName(file.name);
    onResumeChange({ type: 'file', file });
  }

  function switchMode(next: 'paste' | 'upload') {
    setMode(next);
    setText('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Resume</h2>
        <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs">
          <button
            onClick={() => switchMode('paste')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'paste'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste text
          </button>
          <button
            onClick={() => switchMode('upload')}
            className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
              mode === 'upload'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload PDF
          </button>
        </div>
      </div>

      {mode === 'paste' ? (
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste your resume here as plain text..."
          className="flex-1 w-full resize-none rounded-lg border border-gray-200 p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent min-h-[320px]"
        />
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors min-h-[320px] px-6 text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {fileName ? (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-400 mt-1">Click to replace</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Drop your PDF here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
