import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuildMyBot – AI Chatbots, Marketing Automation, and Reseller Platform',
  description:
    'BuildMyBot gives teams and resellers an AI chatbot builder with CRM, marketing studio, and white-label customization backed by Supabase and secure edge functions.',
  applicationName: 'BuildMyBot',
  keywords: [
    'AI chatbot platform',
    'Supabase',
    'marketing automation',
    'reseller tools',
    'voice agent',
    'knowledge base search',
  ],
  openGraph: {
    title: 'BuildMyBot – AI Chatbot Platform',
    description:
      'Launch AI chatbots, phone agents, and marketing automations with secure Supabase, rich analytics, and white-label controls.',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
