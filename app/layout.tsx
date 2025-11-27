import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuildMyBot - AI Chatbot Builder',
  description: 'Create intelligent chatbots that capture leads, answer questions, and close sales 24/7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
