'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Bot } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An unknown error occurred';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Bot className="text-blue-900" size={40} />
            <span className="text-2xl font-bold text-slate-900">BuildMyBot</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            Authentication Error
          </h1>

          <p className="text-slate-600 mb-6 text-center">
            {error}
          </p>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full text-center px-6 py-3 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 transition"
            >
              Try logging in again
            </Link>

            <Link
              href="/auth/signup"
              className="block w-full text-center px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
            >
              Create new account
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
