"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface Participant {
  id: number;
  name: string;
  email: string | null;
}

export function ParticipantsTable({
  participants,
}: {
  participants: Participant[];
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.id}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {p.email || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
