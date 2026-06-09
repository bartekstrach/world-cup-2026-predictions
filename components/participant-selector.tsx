"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelectedParticipant } from "@/components/selected-participant-provider";

interface ParticipantSelectorParticipant {
  id: number;
  name: string;
}

interface ParticipantSelectorProps {
  participants: ParticipantSelectorParticipant[];
}

const ALL_PARTICIPANTS_VALUE = "all";

export function ParticipantSelector({
  participants,
}: ParticipantSelectorProps) {
  const { t } = useTranslation();
  const { selectedParticipantId, setSelectedParticipant } =
    useSelectedParticipant();

  const participantsById = useMemo(() => {
    return new Map(
      participants.map((participant) => [participant.id, participant]),
    );
  }, [participants]);

  const selectedValue =
    selectedParticipantId === null
      ? ALL_PARTICIPANTS_VALUE
      : selectedParticipantId.toString();

  function handleValueChange(value: string) {
    if (value === ALL_PARTICIPANTS_VALUE) {
      setSelectedParticipant(null, null);
      return;
    }

    const participantId = Number.parseInt(value, 10);
    const participant = participantsById.get(participantId);

    if (!participant) {
      setSelectedParticipant(null, null);
      return;
    }

    setSelectedParticipant(participant.id, participant.name);
  }

  return (
    <div className="w-full sm:max-w-sm space-y-1.5">
      <Label
        htmlFor="public-participant-selector"
        className="text-sm font-medium text-slate-600"
      >
        <h2 className="text-[clamp(1rem,4.8vw,1.45rem)] sm:text-2xl font-bold text-[#0a192f] leading-tight">
          {t("public.participantSelector.label")}
        </h2>
      </Label>
      <Select value={selectedValue} onValueChange={handleValueChange}>
        <SelectTrigger
          id="public-participant-selector"
          className="w-full border-slate-200 bg-white text-slate-800"
        >
          <SelectValue
            placeholder={t("public.participantSelector.placeholder")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PARTICIPANTS_VALUE}>
            {t("public.participantSelector.placeholder")}
          </SelectItem>
          {participants.map((participant) => (
            <SelectItem key={participant.id} value={participant.id.toString()}>
              {participant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
