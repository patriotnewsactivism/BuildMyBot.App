import React, { useState } from 'react';
import { X, Mail, Lock, Loader, ArrowRight, Bot } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { dbService } from '../../services/dbService';
import { UserRole, PlanType } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  onLoginSuccess?: (email: string, name?: string, companyName?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login', onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
       // Supabase not configured, use fallback
       if (onLoginSuccess) {
         onLoginSuccess(email, email.split('@')[0], companyName);
         return;
       }
       setError("Supabase not configured.");
       setLoading(false);
       return;
    }

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        
        if (data.user) {
           // Check for referral code
           const referralCode = localStorage.getItem('bmb_ref_code') || undefined;

           // Create user profile in Database
           await dbService.saveUserProfile({
             id: data.user.id,
             name: email.split('@')[0], // Default name
             email: email,
             role: UserRole.OWNER,
             plan: PlanType.FREE,
             companyName: companyName || 'My Company',
             referredBy: referralCode
           });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      onClose();
    } catch (err: any) {
      console.error("Auth Error:", err);
      
      // Fallback for Demo Mode / Bad Config
      const isConfigError = err.message.includes('missing') || err.status === 500;

      if (isConfigError && onLoginSuccess) {
         console.warn("Auth blocked. Switching to Demo Mode.");
         onLoginSuccess(email, email.split('@')[0], companyName);
         return;
      }

      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X size={20} />
        </button>

        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-900/30">
            <Bot size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'login' ? 'Welcome Back' : 'Start Building Free'}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {mode === 'login' 
              ? 'Log in to manage your AI workforce.' 
              : 'Join thousands of businesses automating with AI.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {mode === 'signup' && (
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
               <input 
                 type="text"
                 required
                 value={companyName}
                 onChange={(e) => setCompanyName(e.target.value)}
                 className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                 placeholder="Acme Inc."
               />
             </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-3.5 rounded-xl font-bold hover:bg-blue-950 transition shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : (
              <>
                {mode === 'login' ? 'Log In' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="text-sm text-slate-500 hover:text-blue-900 font-medium"
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Log in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}