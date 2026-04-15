'use client';

interface JDInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JDInput({ value, onChange }: JDInputProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Job Description</h2>
        {value.length > 0 && (
          <button
            onClick={() => onChange('')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here..."
        className="flex-1 w-full resize-none rounded-lg border border-gray-200 p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent min-h-[320px]"
      />
    </div>
  );
}
