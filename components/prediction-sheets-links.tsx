"use client";

import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/date";
import type { PredictionSheetLink } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useSelectedParticipant } from "@/components/selected-participant-provider";

interface PredictionSheetsLinksProps {
  data: PredictionSheetLink[];
}

const STAGE_ORDER = [
  "group_1",
  "group_2",
  "group_3",
  "round_32",
  "round_16",
  "quarter",
  "semi",
  "final",
];

export function PredictionSheetsLinks({ data }: PredictionSheetsLinksProps) {
  const { t } = useTranslation();
  const { selectedParticipantName } = useSelectedParticipant();

  if (!data.length) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        {t("public.visibility.noSheets")}
      </Card>
    );
  }

  const groupedByStage = STAGE_ORDER.map((stage) => {
    const entries = data
      .filter((entry) => entry.stage === stage)
      .sort((a, b) => {
        const aTime =
          (a.updatedAt ?? a.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime =
          (b.updatedAt ?? b.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return a.participantName.localeCompare(b.participantName);
      });

    return {
      stage,
      label: t(`predictionSheets.stages.${stage}`),
      entries,
    };
  }).filter((group) => group.entries.length > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {groupedByStage.map((group) => (
        <div key={group.stage} className="space-y-3">
          <h3 className="text-lg font-bold text-[#0a192f] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            {group.label}
          </h3>

          <Card className="w-full max-w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <div className="overflow-x-auto public-table-scroll">
              <Table className="table-auto min-w-max">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <TableHead className="p-4 h-auto w-1/3">
                      {t("predictionSheets.headers.participant")}
                    </TableHead>
                    <TableHead className="p-4 h-auto w-1/3">
                      {t("predictionSheets.headers.uploaded")}
                    </TableHead>
                    <TableHead className="p-4 h-auto w-1/3 text-right">
                      {t("predictionSheets.headers.sheet")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        selectedParticipantName === entry.participantName
                          ? "selected-highlight-row"
                          : ""
                      }`}
                    >
                      <TableCell className="p-4 font-medium text-slate-700 whitespace-nowrap">
                        {entry.participantName}
                      </TableCell>
                      <TableCell className="p-4 text-slate-500 text-sm whitespace-nowrap font-sans">
                        {(entry.updatedAt ?? entry.createdAt)
                          ? formatDateTime({
                              date: entry.updatedAt ?? entry.createdAt!,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          {entry.blobUrls.length > 1 ? (
                            entry.blobUrls.map((url, index) => (
                              <a
                                key={`${entry.id}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a192f] hover:text-[#10b981] transition-colors group"
                              >
                                <span className="underline decoration-slate-200 group-hover:decoration-[#10b981]/40 underline-offset-4">
                                  {t("predictionSheets.openSheetPage", {
                                    page: index + 1,
                                  })}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#10b981] transition-colors" />
                              </a>
                            ))
                          ) : (
                            <a
                              href={entry.blobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a192f] hover:text-[#10b981] transition-colors group"
                            >
                              <span className="underline decoration-slate-200 group-hover:decoration-[#10b981]/40 underline-offset-4">
                                {t("predictionSheets.openSheet")}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#10b981] transition-colors" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
