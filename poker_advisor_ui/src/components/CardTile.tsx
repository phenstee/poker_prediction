import type { CardCode } from "../utils/cards";
import { cardColor, toCardLabel } from "../utils/cards";
import { clsx } from "clsx";

interface CardTileProps {
  card: CardCode | null;
  className?: string;
}

export function CardTile({ card, className }: CardTileProps) {
  return (
    <div
      className={clsx(
        "flex h-14 w-11 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/80 text-base font-bold",
        cardColor(card),
        className,
      )}
      aria-label={card ? `Card ${card}` : "Empty card slot"}
    >
      {toCardLabel(card)}
    </div>
  );
}

