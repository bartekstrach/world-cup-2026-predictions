import type { Metadata } from "next";
import { Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "2026 FIFA World Cup Predictions",
  description: "Private betting competition",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                World Cup 2026 Predictions
              </h1>
              <p className="text-sm text-muted-foreground">
                Private betting competition
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
