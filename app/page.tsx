'use client';

import { useRouter } from 'next/navigation';
import { Bot, Zap, CheckCircle, Globe, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-900" size={32} />
            <span className="text-xl font-bold text-slate-900">BuildMyBot</span>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-900 transition">
              Sign In
            </button>
            <button className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-950 shadow-sm shadow-blue-200">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900">
            Build AI Chatbots<br />
            <span className="text-blue-900">For Your Business</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Create intelligent chatbots that capture leads, answer questions, and close sales 24/7.
            RAG-enabled knowledge base and enterprise features included.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <button className="px-8 py-4 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 shadow-lg shadow-blue-200 flex items-center gap-2">
              Start Free Trial <ArrowRight size={20} />
            </button>
            <button className="px-8 py-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-50 shadow-sm border border-slate-200">
              View Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: Bot,
              title: 'AI-Powered Conversations',
              description: 'GPT-4 powered chatbots that understand context and provide intelligent responses.',
            },
            {
              icon: Zap,
              title: 'Lead Capture & Scoring',
              description: 'Automatically capture and qualify leads with intelligent conversation analysis.',
            },
            {
              icon: Globe,
              title: 'Easy Integration',
              description: 'Embed on any website with a simple code snippet. No technical knowledge required.',
            },
          ].map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-lg inline-block mb-4">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Migration Notice */}
        <div className="mt-20 bg-blue-900 text-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">🚀 Next.js Migration Complete</h2>
          <p className="mb-4">The application has been successfully migrated from Vite to Next.js 14.</p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              Backend API routes created (Bots CRUD, Chat)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              Supabase, Stripe, and OpenAI integrations set up
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              Security fix: OpenAI API calls moved to server-side
            </li>
          </ul>
          <p className="text-sm opacity-90">
            Next steps: Run `npm install` and set up environment variables. See .env.example for required configuration.
          </p>
        </div>
      </main>
    </div>
  );
}
