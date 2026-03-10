import { useEffect, useMemo, useState } from "react";
import { CardTile } from "./CardTile";
import { Button, Select } from "./ui/primitives";
import type { CardCode } from "../utils/cards";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = [
  { value: "h", label: "Heart" },
  { value: "s", label: "Spade" },
  { value: "c", label: "Club" },
  { value: "d", label: "Diamond" },
] as const;

interface CardPickerProps {
  label: string;
  value: CardCode | null;
  usedCards: CardCode[];
  onChange: (card: CardCode | null) => void;
}

export function CardPicker({ label, value, usedCards, onChange }: CardPickerProps) {
  const [draftRank, setDraftRank] = useState(value?.[0] ?? "");
  const [draftSuit, setDraftSuit] = useState(value?.[1] ?? "");

  useEffect(() => {
    setDraftRank(value?.[0] ?? "");
    setDraftSuit(value?.[1] ?? "");
  }, [value]);

  const used = useMemo(() => {
    const set = new Set(usedCards);
    if (value) {
      set.delete(value);
    }
    return set;
  }, [usedCards, value]);

  function tryEmit(nextRank: string, nextSuit: string): void {
    if (!nextRank || !nextSuit) {
      return;
    }
    const next = `${nextRank}${nextSuit}` as CardCode;
    if (used.has(next)) {
      return;
    }
    onChange(next);
  }

  function onRankChange(nextRank: string): void {
    setDraftRank(nextRank);
    if (!nextRank) {
      onChange(null);
      return;
    }
    tryEmit(nextRank, draftSuit);
  }

  function onSuitChange(nextSuit: string): void {
    setDraftSuit(nextSuit);
    if (!nextSuit) {
      onChange(null);
      return;
    }
    tryEmit(draftRank, nextSuit);
  }

  function clearCard(): void {
    setDraftRank("");
    setDraftSuit("");
    onChange(null);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</label>
      <div className="flex items-center gap-3">
        <CardTile card={value} />
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Select value={draftRank} onChange={(e) => onRankChange(e.target.value)} aria-label={`${label} rank`}>
            <option value="">Rank</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select value={draftSuit} onChange={(e) => onSuitChange(e.target.value)} aria-label={`${label} suit`}>
            <option value="">Suit</option>
            {SUITS.map((suitOption) => {
              const candidate = draftRank ? (`${draftRank}${suitOption.value}` as CardCode) : null;
              const disabled = candidate ? used.has(candidate) : false;
              return (
                <option key={suitOption.value} value={suitOption.value} disabled={disabled}>
                  {suitOption.label}
                </option>
              );
            })}
          </Select>
        </div>
        <Button variant="ghost" onClick={clearCard}>
          Clear
        </Button>
      </div>
    </div>
  );
}
