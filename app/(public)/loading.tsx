import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3 sm:space-y-5 min-w-0">
      <section className="space-y-2 sm:space-y-3 w-full xl:w-1/2 xl:transition-all xl:duration-300 mx-auto">
        <div className="w-full sm:max-w-sm space-y-1.5">
          <Skeleton className="h-8 w-36 sm:h-9 sm:w-44" />
          <Skeleton className="h-10 w-full" />
        </div>
      </section>

      <section className="space-y-2 sm:space-y-3 w-full xl:w-1/2 xl:transition-all xl:duration-300 mx-auto">
        <div className="min-w-0 w-full space-y-2">
          <Skeleton className="h-8 w-28 sm:h-9 sm:w-36" />
          <Skeleton className="h-4 w-52 sm:h-5 sm:w-72" />
          <Skeleton className="h-4 w-60 sm:h-5 sm:w-80" />
        </div>

        <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="w-full overflow-hidden">
            <div className="grid grid-cols-[44px_1fr_64px_88px] sm:grid-cols-[52px_1fr_84px_120px] gap-0 border-b border-slate-100 bg-slate-50/50 p-2 sm:p-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={`leaderboard-head-${i}`} className="h-4 w-full" />
              ))}
            </div>
            {[...Array(10)].map((_, rowIndex) => (
              <div
                key={`leaderboard-row-${rowIndex}`}
                className="grid grid-cols-[44px_1fr_64px_88px] sm:grid-cols-[52px_1fr_84px_120px] gap-2 border-b border-slate-100 p-2 sm:p-3"
              >
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-4 w-28 sm:w-36" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-14 sm:w-16" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-2 sm:space-y-4 pt-2 sm:pt-4">
        <Skeleton className="h-8 w-28 sm:h-9 sm:w-40" />
        <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="overflow-hidden">
            <div className="grid grid-cols-[88px_1fr_88px_1fr_1fr_1fr] gap-2 border-b border-slate-100 bg-slate-50/50 p-2 sm:p-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={`predictions-head-${i}`} className="h-4 w-full" />
              ))}
            </div>
            {[...Array(4)].map((_, sectionIndex) => (
              <div key={`predictions-section-${sectionIndex}`} className="border-b border-slate-100">
                <div className="grid grid-cols-[88px_1fr_88px_1fr_1fr_1fr] gap-2 bg-emerald-50/60 p-2 sm:p-3">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                {[...Array(2)].map((_, rowIndex) => (
                  <div
                    key={`predictions-row-${sectionIndex}-${rowIndex}`}
                    className="grid grid-cols-[88px_1fr_88px_1fr_1fr_1fr] gap-2 p-2 sm:p-3"
                  >
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[88px_1fr_88px_1fr_1fr_1fr] gap-2 border-t border-slate-100 bg-emerald-50/60 p-2 sm:p-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={`predictions-foot-${i}`} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-2 sm:space-y-4 pt-2 sm:pt-4 w-full xl:w-3/4 xl:transition-all xl:duration-300 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          <div className="space-y-3">
            <Skeleton className="h-8 w-40 sm:h-9 sm:w-52" />
            <Card className="w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <div className="space-y-0">
                {[...Array(7)].map((_, i) => (
                  <div key={`hof-row-${i}`} className="grid grid-cols-2 gap-2 border-b border-slate-100 p-4 last:border-b-0">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20 justify-self-start" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-8 w-44 sm:h-9 sm:w-56" />
            <Card className="w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <div key={`hos-row-${i}`} className="grid grid-cols-2 gap-2 border-b border-slate-100 p-4 last:border-b-0">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16 justify-self-start" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-2 sm:space-y-4 pt-2 sm:pt-4 w-full xl:w-3/4 xl:transition-all xl:duration-300 mx-auto">
        <Skeleton className="h-8 w-48 sm:h-9 sm:w-64" />

        <div className="space-y-6 sm:space-y-8">
          {[...Array(3)].map((_, stageIndex) => (
            <div key={`sheet-stage-${stageIndex}`} className="space-y-3">
              <Skeleton className="h-6 w-44 sm:w-56" />
              <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                <div className="overflow-hidden">
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50/50 p-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20 justify-self-end" />
                  </div>
                  {[...Array(2)].map((_, rowIndex) => (
                    <div
                      key={`sheet-row-${stageIndex}-${rowIndex}`}
                      className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4"
                    >
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-32 justify-self-end" />
                    </div>
                  ))}
                  <div className="p-3">
                    <Skeleton className="h-8 w-28 mx-auto" />
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
