import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

interface HallOfShameItem {
  participantId: number;
  participantName: string;
  currentMissing: number;
  currentTotal: number;
  nextMissing: number;
  nextTotal: number;
}

interface HallOfShameCardProps {
  currentStage: string | null;
  nextStage: string | null;
  rows: HallOfShameItem[];
}

export async function HallOfShameCard({
  currentStage,
  nextStage,
  rows,
}: HallOfShameCardProps) {
  const t = await getT();

  return (
    <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          {t("admin.hallOfShame.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="text-left font-medium py-2 pr-4">
                    {t("admin.hallOfShame.headers.participant")}
                  </th>
                  <th className="text-right font-medium py-2 pr-4 whitespace-nowrap">
                    {currentStage
                      ? t(`predictionSheets.stages.${currentStage}`)
                      : t("admin.hallOfShame.noStage")}
                  </th>
                  <th className="text-right font-medium py-2 whitespace-nowrap">
                    {nextStage
                      ? t(`predictionSheets.stages.${nextStage}`)
                      : t("admin.hallOfShame.noStage")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.participantId}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate-700">
                      {row.participantName}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-slate-600">
                      {row.currentMissing}/{row.currentTotal}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {row.nextMissing}/{row.nextTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {t("admin.hallOfShame.none")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
