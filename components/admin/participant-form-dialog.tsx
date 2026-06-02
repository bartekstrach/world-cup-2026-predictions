"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

export interface ParticipantFormValues {
  name: string;
  email: string;
}

interface ParticipantFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: ParticipantFormValues;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ParticipantFormValues) => Promise<void>;
}

function normalizeEmail(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function ParticipantFormDialog({
  open,
  mode,
  initialValues,
  submitting,
  onOpenChange,
  onSubmit,
}: ParticipantFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () =>
      mode === "create"
        ? t("forms.participantDialog.addTitle")
        : t("forms.participantDialog.editTitle"),
    [mode, t],
  );

  useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? "");
    setEmail(initialValues?.email ?? "");
    setError(null);
  }, [open, initialValues]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const normalizedEmail = normalizeEmail(email);

    if (!trimmedName) {
      setError(t("forms.participantDialog.nameRequired"));
      return;
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setError(t("forms.participantDialog.emailInvalid"));
      return;
    }

    setError(null);
    await onSubmit({
      name: trimmedName,
      email: normalizedEmail,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("forms.participantDialog.createDescription")
              : t("forms.participantDialog.editDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participant-name">
              {t("forms.participantDialog.name")}
            </Label>
            <Input
              id="participant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("forms.participantDialog.namePlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="participant-email">
              {t("forms.participantDialog.emailOptional")}
            </Label>
            <Input
              id="participant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("forms.participantDialog.emailPlaceholder")}
              disabled={submitting}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("forms.common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? mode === "create"
                  ? t("forms.common.creating")
                  : t("forms.common.saving")
                : mode === "create"
                  ? t("forms.common.create")
                  : t("forms.common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
