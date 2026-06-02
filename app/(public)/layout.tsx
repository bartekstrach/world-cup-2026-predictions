import { Trophy } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#f0f4f8] via-white to-[#e6f2ef] text-slate-800 pb-12">
      <header className="border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0a192f] rounded-lg shadow-sm">
              <Trophy className="h-6 w-6 text-[#10b981]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0a192f] tracking-tight">
              {t("public.headerTitle")}
            </h1>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </main>
    </div>
  );
}
