"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "selectedParticipant";

interface SelectedParticipantState {
  selectedParticipantId: number | null;
  selectedParticipantName: string | null;
  setSelectedParticipant: (
    participantId: number | null,
    participantName?: string | null,
  ) => void;
}

const SelectedParticipantContext =
  createContext<SelectedParticipantState | null>(null);

export function SelectedParticipantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | null
  >(null);
  const [selectedParticipantName, setSelectedParticipantName] = useState<
    string | null
  >(null);

  useEffect(() => {
    try {
      const savedRaw = window.localStorage.getItem(STORAGE_KEY);
      if (!savedRaw) return;

      const saved = JSON.parse(savedRaw) as {
        participantId?: number;
        participantName?: string;
      };

      if (typeof saved.participantId === "number") {
        setSelectedParticipantId(saved.participantId);
        setSelectedParticipantName(saved.participantName ?? null);
      }
    } catch {
      setSelectedParticipantId(null);
      setSelectedParticipantName(null);
    }
  }, []);

  const setSelectedParticipant = useCallback(
    (participantId: number | null, participantName?: string | null) => {
      setSelectedParticipantId(participantId);
      setSelectedParticipantName(participantName ?? null);

      try {
        if (participantId === null) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            participantId,
            participantName: participantName ?? null,
          }),
        );
      } catch {
        setSelectedParticipantId(null);
        setSelectedParticipantName(null);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      selectedParticipantId,
      selectedParticipantName,
      setSelectedParticipant,
    }),
    [selectedParticipantId, selectedParticipantName, setSelectedParticipant],
  );

  return (
    <SelectedParticipantContext.Provider value={value}>
      {children}
    </SelectedParticipantContext.Provider>
  );
}

export function useSelectedParticipant() {
  const context = useContext(SelectedParticipantContext);

  if (!context) {
    throw new Error(
      "useSelectedParticipant must be used within SelectedParticipantProvider",
    );
  }

  return context;
}
