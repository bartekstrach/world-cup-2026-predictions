import { Trophy } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] via-white to-[#e6f2ef] text-slate-800 pb-12">
      <header className="border-b border-slate-200/60">
        <div className="mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pt-4 sm:pt-6 pb-3 sm:pb-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-[#0a192f] rounded-lg shadow-sm">
              <Trophy
                className="text-[#10b981]"
                style={{
                  width: "clamp(1rem, 4.4vw, 1.5rem)",
                  height: "clamp(1rem, 4.4vw, 1.5rem)",
                }}
              />
            </div>
            <h1 className="font-bold text-[#0a192f] tracking-tight text-[clamp(1rem,5vw,1.85rem)] leading-tight">
              {t("public.headerTitle")}
            </h1>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 pt-4 sm:pt-6">
        {children}
      </main>
    </div>
  );
}
