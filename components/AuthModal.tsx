'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; llmUsesRemaining: number }) => void;
  defaultMode?: 'login' | 'signup';
}

export default function AuthModal({ onClose, onSuccess, defaultMode = 'signup' }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      onSuccess(data.user);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-sm mx-4 p-6">
        {/* Tabs */}
        <div className="flex border border-gray-200 rounded-lg p-0.5 mb-6">
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              mode === 'signup'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              mode === 'login'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
          >
            {loading
              ? mode === 'signup' ? 'Creating account...' : 'Signing in...'
              : mode === 'signup' ? 'Create account' : 'Sign in'
            }
          </button>
        </form>

        {mode === 'signup' && (
          <p className="mt-4 text-xs text-gray-400 text-center">
            You get 3 free AI analyses after signing up.
          </p>
        )}
      </div>
    </div>
  );
}
