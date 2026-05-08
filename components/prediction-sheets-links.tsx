import { Card } from "@/components/ui/card";
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

export function PredictionSheetsLinks({ data }: PredictionSheetsLinksProps) {
  if (!data.length) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No prediction sheets available yet.
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Participant</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Sheet</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">
                {entry.participantName}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.stage}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(entry.updatedAt ?? entry.createdAt)
                  ? formatDateTime({ date: entry.updatedAt ?? entry.createdAt! })
                  : "-"}
              </TableCell>
              <TableCell>
                <a
                  href={entry.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-800 underline"
                >
                  Open sheet
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
