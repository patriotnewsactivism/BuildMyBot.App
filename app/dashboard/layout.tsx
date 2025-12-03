'use client';

import { useAuth } from '@/components/Auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Users,
  Database,
  Megaphone,
  Globe,
  Phone,
  Store,
  CreditCard,
  LogOut,
  Home
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/bots', label: 'Bots', icon: Bot },
    { href: '/dashboard/leads', label: 'CRM', icon: Users },
    { href: '/dashboard/knowledge-base', label: 'Knowledge Base', icon: Database },
    { href: '/dashboard/marketing', label: 'Marketing', icon: Megaphone },
    { href: '/dashboard/website', label: 'Website', icon: Globe },
    { href: '/dashboard/phone', label: 'Phone Agent', icon: Phone },
    { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
    { href: '/dashboard/reseller', label: 'Reseller', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Bot className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BuildMyBot</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-4rem)] border-r border-gray-200">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
