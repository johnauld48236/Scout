import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AIContextProvider } from "@/components/ai/AIContextProvider";
import { AICommandPalette } from "@/components/ai/AICommandPalette";
import { AIChatDrawer } from "@/components/ai/AIChatDrawer";
import { ScoutAIButton } from "@/components/ai/ScoutAIButton";

export const metadata: Metadata = {
  title: "Scout | Sales Execution Intelligence",
  description: "Read the terrain. Make the move.",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AIContextProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {children}
            </main>
          </div>
          <ScoutAIButton />
          <AICommandPalette />
          <AIChatDrawer />
        </AIContextProvider>
      </body>
    </html>
  );
}
