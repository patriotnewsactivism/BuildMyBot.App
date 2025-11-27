import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader, ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { dbService } from '../../services/dbService';
import { UserRole, PlanType } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Fetch user profile from Firestore
        const profile = await dbService.getUserProfile(userCredential.user.uid);
        onLoginSuccess(profile || {
             id: userCredential.user.uid,
             name: userCredential.user.displayName || 'User',
             email: userCredential.user.email || '',
             role: UserRole.OWNER,
             plan: PlanType.FREE,
             companyName: 'My Company'
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        const newUser = {
            id: userCredential.user.uid,
            name: name,
            email: email,
            role: UserRole.OWNER,
            plan: PlanType.FREE,
            companyName: 'My Company'
        };
        await dbService.createUserProfile(newUser);
        onLoginSuccess(newUser);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">{isLogin ? 'Welcome Back' : 'Create Account'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20} /></button>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-blue-900 focus:border-blue-900 transition"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-blue-900 focus:border-blue-900 transition"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-blue-900 focus:border-blue-900 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-950 transition shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : (
                 <>
                   {isLogin ? 'Log In' : 'Start Building Free'} <ArrowRight size={18} />
                 </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-blue-900 font-bold hover:underline"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};