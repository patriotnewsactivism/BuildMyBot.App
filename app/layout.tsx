import type { Metadata } from 'next';
import { AuthProvider } from '@/components/Auth/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuildMyBot - AI Chatbot Platform for Business',
  description: 'Create intelligent AI chatbots for customer support, sales, and lead generation. RAG-enabled knowledge base, reseller program, and enterprise features.',
  keywords: 'AI chatbot, customer support automation, lead generation, RAG, knowledge base, chatbot builder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
