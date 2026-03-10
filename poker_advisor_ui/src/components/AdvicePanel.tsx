import { Copy, Info, Loader2, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "./ui/primitives";
import type { AdviceResult, ApiStatus } from "../api/advice";
import { formatBb, formatPct, formatSignedPct } from "../utils/format";

export interface ConnectionInfo {
  status: "checking" | "connected" | "not_connected";
  apiStatus: ApiStatus;
  errorMessage?: string;
  httpStatus?: number;
  rawBody?: unknown;
  apiBaseUrl: string;
  backendOrigin: string;
  resolvedHealthUrl: string;
  warning?: string;
}

interface AdvicePanelProps {
  advice: AdviceResult | null;
  isLoading: boolean;
  isStale: boolean;
  onCopy: () => void;
  onRetry: () => void;
  connection: ConnectionInfo;
}

const CLOSE_MARGIN = 0.02;
const VALUE_RAISE_THRESHOLD = 0.65;

function statusStyle(connection: ConnectionInfo, source: AdviceResult["source"] | "initial"): { label: string; className: string } {
  if (source === "api" || connection.status === "connected") {
    return { label: "Connected", className: "border-emerald-400/30 bg-emerald-950/40 text-emerald-200" };
  }
  if (source === "offline") {
    return { label: "Offline estimate", className: "border-amber-400/30 bg-amber-950/40 text-amber-200" };
  }
  if (source === "none" || connection.status === "not_connected") {
    return { label: "No connection", className: "border-rose-400/30 bg-rose-950/40 text-rose-200" };
  }
  return { label: "Connecting", className: "border-slate-500/40 bg-slate-900/50 text-slate-300" };
}

function quickReadLabel(action: string, edge: number): string {
  if (action === "FOLD" && edge < -0.03) {
    return "Clear fold";
  }
  if (Math.abs(edge) <= CLOSE_MARGIN) {
    return "Close decision";
  }
  if (edge > 0.03) {
    return "Clear continue";
  }
  return "Close decision";
}

function oneSentence(action: string, breakEven: number, winChance: number): string {
  if (action === "FOLD") {
    return `You need to win about ${formatPct(breakEven)} to call, but you only win about ${formatPct(winChance)}, so calling loses chips over time.`;
  }
  if (action === "CALL") {
    return "Your win chance is close to what you need to call, so calling is reasonable.";
  }
  if (action === "RAISE") {
    return "Your win chance is much higher than what you need, so you can raise for value.";
  }
  if (action === "BET") {
    return "Your win chance is strong, so betting can win more chips.";
  }
  return "Your win chance is not high enough to value bet, so checking is fine.";
}

function GlossaryTip({ text }: { text: string }) {
  return (
    <span className="inline-flex align-middle" title={text}>
      <Info className="ml-1 h-3.5 w-3.5 text-slate-400" aria-label={text} />
    </span>
  );
}

export function AdvicePanel({ advice, isLoading, isStale, onCopy, onRetry, connection }: AdvicePanelProps) {
  const [showConfigWarning, setShowConfigWarning] = useState(true);
  const source = advice?.source ?? "initial";
  const status = statusStyle(connection, source);

  const response = advice?.response;
  const toCall = advice?.request.facing_bet_bb ?? 0;
  const potBeforeCall = advice?.request.pot_bb ?? 0;
  const potAfterCall = potBeforeCall + toCall;
  const breakEvenWinChance = response?.pot_odds ?? (toCall > 0 ? toCall / (potBeforeCall + toCall) : 0);
  const winChance = response?.equity ?? 0;
  const diffFromBreakEven = winChance - breakEvenWinChance;

  const quickRead = response ? quickReadLabel(response.action, diffFromBreakEven) : null;
  const summary = response ? oneSentence(response.action, breakEvenWinChance, winChance) : null;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-100">Advice</h2>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          {isStale ? <span className="rounded-full border border-amber-300/40 bg-amber-900/20 px-2 py-0.5 text-xs text-amber-100">Stale</span> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRetry} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Retry
          </Button>
          <Button variant="ghost" onClick={onCopy} disabled={!advice}>
            <Copy className="mr-2 h-4 w-4" />
            Copy result
          </Button>
        </div>
      </div>

      {connection.warning && showConfigWarning ? (
        <div className="mb-3 flex items-start justify-between rounded-lg border border-amber-400/30 bg-amber-950/30 p-2 text-xs text-amber-100">
          <p>{connection.warning}</p>
          <button
            type="button"
            className="ml-2 rounded p-1 text-amber-200 hover:bg-amber-900/40"
            onClick={() => setShowConfigWarning(false)}
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculating advice...
        </div>
      ) : null}

      {!advice && !isLoading ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-4 text-sm text-slate-400">
          <p className="font-medium text-slate-200">Enter your cards and click Get Advice.</p>
        </div>
      ) : null}

      {advice && advice.source === "none" ? (
        <div className="space-y-3 rounded-lg border border-rose-400/30 bg-rose-950/20 p-3 text-sm">
          <p className="text-rose-100">Cannot reach the server, so I cannot calculate advice right now.</p>
          <p className="text-slate-200">Reason: {advice.errorMessage ?? "Unknown error"}</p>
          <Button variant="secondary" onClick={onRetry} disabled={isLoading}>
            Retry
          </Button>
        </div>
      ) : null}

      {advice && response ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-400">Suggested action</p>
              <p className="mt-1 text-3xl font-black tracking-wide text-accent">{response.action}</p>
              <p className="mt-1 text-xs text-slate-400">{quickRead}</p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-400">To call</p>
              <p className="text-xl font-semibold text-slate-100">{formatBb(toCall)}</p>
              <p className="mt-2 text-xs text-slate-400">Pot after call</p>
              <p className="text-sm text-slate-200">{formatBb(potAfterCall)}</p>
              <p className="mt-2 text-xs text-slate-400">Opponents</p>
              <p className="text-sm text-slate-200">{advice.request.num_opponents}</p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-400">
                Win chance
                <GlossaryTip text="Win chance: How often you would win if we dealt the remaining cards many times." />
              </p>
              <p className="text-xl font-semibold text-slate-100">{formatPct(winChance)}</p>
              <p className="mt-2 text-xs text-slate-400">
                Break even win chance
                <GlossaryTip text="Break even win chance: The win chance you need for calling to not lose chips long term." />
              </p>
              <p className="text-sm text-slate-200">{formatPct(breakEvenWinChance)}</p>
            </div>
          </div>

          {response.recommended_raise_bb ? (
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-950/20 p-3 text-sm">
              <p className="font-medium text-emerald-200">
                {response.action === "BET" ? "Recommended bet" : "Recommended raise to"}: {formatBb(response.recommended_raise_bb)}
                <GlossaryTip text="Sizing is a simple heuristic, not a solver-perfect output." />
              </p>
              {response.recommended_raise_label ? <p className="text-emerald-100/90">{response.recommended_raise_label}</p> : null}
              {response.raise_reason ? <p className="text-xs text-emerald-200/80">{response.raise_reason}</p> : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm">
            <p className="font-medium text-slate-100">Why</p>
            <p className="mt-1 text-slate-200">{summary}</p>
            <ul className="mt-2 list-disc pl-5 text-slate-300">
              <li>
                How far above or below break even: <span className={diffFromBreakEven >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatSignedPct(diffFromBreakEven)}</span>
              </li>
              <li>
                Simulations run: {response.samples}
                <GlossaryTip text="Simulations run: How many random deals were used to estimate win chance." />
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {(advice || connection.status === "not_connected") ? (
        <details className="mt-4 rounded-lg border border-slate-700 bg-slate-900/30 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-200">Advanced details</summary>
          <div className="mt-3 space-y-3 text-xs text-slate-300">
            <div>
              <p className="text-slate-400">Original metrics and formulas</p>
              <pre className="overflow-auto rounded bg-slate-950/60 p-2">{JSON.stringify({ winChanceRaw: response?.equity ?? null, priceToCallRaw: response?.pot_odds ?? null, breakEvenWinChanceRaw: breakEvenWinChance, marginThreshold: CLOSE_MARGIN, valueRaiseThreshold: VALUE_RAISE_THRESHOLD, potOddsFormula: "toCall / (potBeforeCall + toCall)" }, null, 2)}</pre>
            </div>
            <div>
              <p className="text-slate-400">Health check</p>
              <pre className="overflow-auto rounded bg-slate-950/60 p-2">{JSON.stringify({ status: connection.status, apiStatus: connection.apiStatus, errorMessage: connection.errorMessage, httpStatus: connection.httpStatus, resolvedHealthUrl: connection.resolvedHealthUrl, backendOrigin: connection.backendOrigin, apiBaseUrl: connection.apiBaseUrl, warning: connection.warning, rawBody: connection.rawBody }, null, 2)}</pre>
            </div>
            <div>
              <p className="text-slate-400">Request payload</p>
              <pre className="overflow-auto rounded bg-slate-950/60 p-2">{JSON.stringify(advice?.request ?? null, null, 2)}</pre>
            </div>
            <div>
              <p className="text-slate-400">Response JSON</p>
              <pre className="overflow-auto rounded bg-slate-950/60 p-2">{JSON.stringify(advice?.rawResponse ?? advice?.response ?? null, null, 2)}</pre>
            </div>
            <div>
              <p className="text-slate-400">Request error</p>
              <pre className="overflow-auto rounded bg-slate-950/60 p-2">{JSON.stringify(advice ? { apiStatus: advice.apiStatus, errorMessage: advice.errorMessage, httpStatus: advice.httpStatus, rawError: advice.rawError, requestId: advice.requestId, resolvedUrl: advice.resolvedUrl } : null, null, 2)}</pre>
            </div>
          </div>
        </details>
      ) : null}
    </Card>
  );
}
