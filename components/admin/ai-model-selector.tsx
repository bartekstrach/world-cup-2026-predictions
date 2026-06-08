"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateActiveAiModel } from "@/actions/settings";
import { AI_MODEL_OPTIONS, type AiModel } from "@/lib/ai-models";

type Props = {
  initialModel: AiModel;
};

export function AiModelSelector({ initialModel }: Props) {
  const [model, setModel] = useState<AiModel>(initialModel);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextModel = event.target.value as AiModel;
    const previous = model;
    setModel(nextModel);

    startTransition(async () => {
      try {
        await updateActiveAiModel(nextModel);
        toast.success("Model AI został zapisany");
      } catch {
        setModel(previous);
        toast.error("Nie udało się zapisać modelu AI");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-[#0a192f]">Model OCR AI</h3>
        <p className="text-sm text-slate-500">
          Zmiana zapisuje się automatycznie po wyborze.
        </p>
      </div>

      <div className="mt-4">
        <label
          htmlFor="ai-model"
          className="mb-2 block text-sm font-medium text-[#0a192f]"
        >
          Aktywny model
        </label>
        <select
          id="ai-model"
          value={model}
          onChange={handleChange}
          disabled={isPending}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none shadow-sm focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          {AI_MODEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {isPending ? (
          <p className="mt-2 text-xs text-slate-500">Zapisywanie...</p>
        ) : null}
      </div>
    </div>
  );
}
