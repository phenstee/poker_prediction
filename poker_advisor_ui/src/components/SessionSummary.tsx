import { Download } from "lucide-react";
import { CardTile } from "./CardTile";
import { Button, Card } from "./ui/primitives";
import { stepToStreet, useSessionStore } from "../store/session";
import { formatBb, formatPct } from "../utils/format";

export function SessionSummary() {
  const step = useSessionStore((s) => s.step);
  const heroHole = useSessionStore((s) => s.heroHole);
  const board = useSessionStore((s) => s.board);
  const opponentsByStreet = useSessionStore((s) => s.opponentsByStreet);
  const potBb = useSessionStore((s) => s.potBb);
  const facingBetBb = useSessionStore((s) => s.facingBetBb);
  const adviceHistory = useSessionStore((s) => s.adviceHistory);

  const street = stepToStreet(step);
  const currentOpponents = opponentsByStreet[street];

  function exportJson(): void {
    const blob = new Blob([JSON.stringify({ heroHole, board, opponentsByStreet, potBb, facingBetBb, adviceHistory }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `poker-advice-session-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Session Summary</h2>
        <Button variant="secondary" onClick={exportJson}>
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wider text-slate-400">Hero</p>
          <div className="mt-2 flex gap-2">
            <CardTile card={heroHole[0]} />
            <CardTile card={heroHole[1]} />
          </div>

          <p className="mt-4 text-xs uppercase tracking-wider text-slate-400">Board</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {board.map((c, idx) => (
              <CardTile key={`${idx}-${c ?? "empty"}`} card={c} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-3 text-xs uppercase tracking-wider text-slate-400">Hand Meta</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400">Street</p>
              <p className="font-semibold text-slate-100 capitalize">{street}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Opponents</p>
              <p className="font-semibold text-slate-100">{currentOpponents}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Pot</p>
              <p className="font-semibold text-slate-100">{formatBb(potBb)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">To call</p>
              <p className="font-semibold text-slate-100">{formatBb(facingBetBb)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Advice History</p>
          {adviceHistory.length === 0 ? <p className="text-sm text-slate-500">No advice entries yet.</p> : null}
          <ul className="space-y-2 lg:max-h-[320px] lg:overflow-auto">
            {adviceHistory.map((entry, idx) => (
              <li key={`${entry.timestamp}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-sm">
                <p className="font-semibold text-slate-100">
                  {entry.street.toUpperCase()} - {entry.action}
                </p>
                <p className="text-slate-300">
                  Opponents {entry.opponents} | Equity {formatPct(entry.equity)} | Pot odds {formatPct(entry.pot_odds)}
                </p>
                <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Card>
  );
}
