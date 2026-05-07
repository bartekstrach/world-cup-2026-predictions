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
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-end">
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Participant
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right w-44">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.email || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingParticipant(p)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
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
