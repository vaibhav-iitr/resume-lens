'use client';

type Engine = 'algorithm' | 'llm' | 'byok';
type ByokProvider = 'anthropic' | 'openai' | 'groq';

interface AuthUser {
  id: string;
  email: string;
  llmUsesRemaining: number;
}

interface Props {
  engine: Engine;
  onEngineChange: (e: Engine) => void;
  byokKey: string;
  onByokKeyChange: (k: string) => void;
  byokProvider: ByokProvider;
  onByokProviderChange: (p: ByokProvider) => void;
  user: AuthUser | null;
  onLoginRequest: () => void;
}

export default function EngineSelector({
  engine,
  onEngineChange,
  byokKey,
  onByokKeyChange,
  byokProvider,
  onByokProviderChange,
  user,
  onLoginRequest,
}: Props) {
  const llmExhausted = user !== null && user.llmUsesRemaining <= 0;

  function cardClass(id: Engine) {
    const selected = engine === id;
    return `flex-1 min-w-0 rounded-xl border p-4 cursor-pointer transition-colors ${
      selected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
    }`;
  }

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Analysis Engine</p>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Algorithm */}
        <div
          className={cardClass('algorithm')}
          onClick={() => onEngineChange('algorithm')}
        >
          <p className="text-sm font-semibold text-gray-900">Algorithm</p>
          <p className="text-xs text-gray-500 mt-0.5">Unlimited · No signup</p>
        </div>

        {/* AI Analysis */}
        <div
          className={`${cardClass('llm')} ${llmExhausted ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (llmExhausted) return;
            if (!user) {
              onLoginRequest();
            } else {
              onEngineChange('llm');
            }
          }}
        >
          <p className="text-sm font-semibold text-gray-900">AI Analysis</p>
          <p className="text-xs text-gray-500 mt-0.5">3 free uses</p>
          {!user && (
            <p className="text-xs text-gray-400 mt-1">Login to use</p>
          )}
          {user && !llmExhausted && (
            <p className="text-xs text-green-600 mt-1">{user.llmUsesRemaining} of 3 remaining</p>
          )}
          {user && llmExhausted && (
            <p className="text-xs text-red-500 mt-1">Exhausted — use algorithm or your key</p>
          )}
        </div>

        {/* BYOK */}
        <div
          className={cardClass('byok')}
          onClick={() => onEngineChange('byok')}
        >
          <p className="text-sm font-semibold text-gray-900">Your API Key</p>
          <p className="text-xs text-gray-500 mt-0.5">Anthropic or Groq</p>
        </div>
      </div>

      {/* BYOK details */}
      {engine === 'byok' && (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Provider</p>
            <div className="flex border border-gray-200 rounded-lg p-0.5 w-fit">
              {(['anthropic', 'openai', 'groq'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onByokProviderChange(p)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors capitalize ${
                    byokProvider === p
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={byokKey}
              onChange={(e) => onByokKeyChange(e.target.value)}
              placeholder="Paste your API key..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
