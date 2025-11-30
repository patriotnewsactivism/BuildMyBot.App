'use client';

import { useAuth } from '@/components/Auth/AuthProvider';
import { useState } from 'react';
import { MessageSquare, Bot, Zap, Shield, TrendingUp, CheckCircle } from 'lucide-react';

export default function Home() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">BuildMyBot</span>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to BuildMyBot!</h1>
          <p className="text-xl text-gray-600 mb-8">
            You're logged in as: <span className="font-semibold">{user.email}</span>
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">Migration in Progress</h2>
            <p className="text-yellow-800">
              The dashboard is being migrated from Firebase to Supabase. Please configure your environment variables in <code className="bg-yellow-100 px-2 py-1 rounded">.env.local</code> and set up your Supabase database using <code className="bg-yellow-100 px-2 py-1 rounded">supabase_schema.sql</code>.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <MessageSquare className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Bot Builder</h3>
              <p className="text-gray-600">Create and customize AI chatbots</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <TrendingUp className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">Track performance and engagement</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <Shield className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Enterprise Ready</h3>
              <p className="text-gray-600">Secure and scalable infrastructure</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">BuildMyBot</span>
          </div>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Build AI Chatbots in Minutes
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Create, deploy, and manage intelligent chatbots for your business. No coding required.
            </p>

            <div className="space-y-4 mb-12">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Easy Bot Builder</h3>
                  <p className="text-gray-600">Intuitive interface to create custom chatbots</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Powered by GPT-4</h3>
                  <p className="text-gray-600">Latest AI technology for natural conversations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Analytics & Insights</h3>
                  <p className="text-gray-600">Track performance and user engagement</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-4">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
