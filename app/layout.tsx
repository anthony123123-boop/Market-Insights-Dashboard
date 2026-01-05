import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Insights Dashboard',
  description: 'Real-time market analysis and insights dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f14] text-white min-h-screen antialiased">
        <div className="bg-blobs" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
