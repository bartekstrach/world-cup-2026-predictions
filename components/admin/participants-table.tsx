"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ParticipantFormDialog } from "@/components/admin/participant-form-dialog";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus } from "lucide-react";

interface Participant {
  id: number;
  name: string;
  email: string | null;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function ParticipantsTable({
  participants,
}: {
  participants: Participant[];
}) {
  const [rows, setRows] = useState<Participant[]>(participants);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  async function handleCreate(values: { name: string; email: string }) {
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to create participant"),
        );
      }

      const data = (await response.json()) as { participant: Participant };
      setRows((current) => [...current, data.participant]);
      setIsCreateOpen(false);
      toast.success("Participant created");
    } catch (error) {
      toast.error("Create failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to create participant",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(values: { name: string; email: string }) {
    if (!editingParticipant) return;

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/participants/${editingParticipant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to update participant"),
        );
      }

      const data = (await response.json()) as { participant: Participant };
      setRows((current) =>
        current.map((row) =>
          row.id === data.participant.id ? data.participant : row,
        ),
      );
      setEditingParticipant(null);
      toast.success("Participant updated");
    } catch (error) {
      toast.error("Update failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to update participant",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/participants/${deleteTarget.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to delete participant"),
        );
      }

      setRows((current) => current.filter((row) => row.id !== deleteTarget.id));
      toast.success("Participant deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Delete failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete participant",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
        <div className="flex items-center justify-end">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="m-4 inline-flex items-center justify-center gap-2 bg-[#0a192f] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0a192f]/90"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Participant
          </Button>
        </div>

        <div className="overflow-x-auto public-table-scroll">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <TableHead className="w-16 p-4 h-auto">ID</TableHead>
                <TableHead className="p-4 h-auto">Name</TableHead>
                <TableHead className="p-4 h-auto">Email</TableHead>
                <TableHead className="text-right p-4 h-auto">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((p) => (
                <TableRow
                  key={p.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="font-mono text-slate-400 font-medium p-4">
                    {p.id}
                  </TableCell>
                  <TableCell className="font-medium text-slate-700 p-4">
                    {p.name}
                  </TableCell>
                  <TableCell className="p-4">
                    {p.email ? (
                      <a
                        href={`mailto:${p.email}`}
                        className="text-[#10b981] hover:underline"
                      >
                        {p.email}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => setEditingParticipant(p)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500 text-white hover:bg-red-600"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ParticipantFormDialog
        open={isCreateOpen}
        mode="create"
        submitting={submitting}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
      />

      <ParticipantFormDialog
        open={!!editingParticipant}
        mode="edit"
        initialValues={{
          name: editingParticipant?.name ?? "",
          email: editingParticipant?.email ?? "",
        }}
        submitting={submitting}
        onOpenChange={(open) => {
          if (!open) setEditingParticipant(null);
        }}
        onSubmit={handleEdit}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete participant?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong>
              . Deletion is only allowed when there are no linked predictions or
              uploaded sheets.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
