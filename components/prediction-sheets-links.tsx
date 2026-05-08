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

interface PredictionSheetsLinksProps {
  data: PredictionSheetLink[];
}

const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage",
  round_16: "Round of 16",
  quarter: "Quarter-finals",
  semi: "Semi-finals",
  final: "Final",
};

const STAGE_ORDER = ["group", "round_16", "quarter", "semi", "final"];

export function PredictionSheetsLinks({ data }: PredictionSheetsLinksProps) {
  if (!data.length) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No prediction sheets available yet.
      </Card>
    );
  }

  const groupedByStage = STAGE_ORDER.map((stage) => {
    const entries = data
      .filter((entry) => entry.stage === stage)
      .sort((a, b) => a.participantName.localeCompare(b.participantName));

    return {
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      entries,
    };
  }).filter((group) => group.entries.length > 0);

  return (
    <div className="space-y-8">
      {groupedByStage.map((group) => (
        <div key={group.stage} className="space-y-3">
          <h3 className="text-lg font-bold text-[#0a192f] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            {group.label}
          </h3>

          <Card className="rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <div className="overflow-x-auto public-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <TableHead className="p-4 h-auto w-1/3">
                      Participant
                    </TableHead>
                    <TableHead className="p-4 h-auto w-1/3">Uploaded</TableHead>
                    <TableHead className="p-4 h-auto w-1/3 text-right">
                      Sheet
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="hover:bg-slate-50 transition-colors"
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
                        <a
                          href={entry.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a192f] hover:text-[#10b981] transition-colors group"
                        >
                          <span className="underline decoration-slate-200 group-hover:decoration-[#10b981]/40 underline-offset-4">
                            Open sheet
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#10b981] transition-colors" />
                        </a>
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
