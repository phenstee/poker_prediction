import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { checkHealth, fetchAdvice, type ApiStatus } from "../api/advice";
import { getApiConfig } from "../api/client";
import { AdvicePanel, type ConnectionInfo } from "../components/AdvicePanel";
import { HandBuilder } from "../components/HandBuilder";
import { Header } from "../components/Header";
import { SessionSummary } from "../components/SessionSummary";
import { useToast } from "../components/ui/toast";
import { stepToStreet, useSessionStore } from "../store/session";
import { buildBeginnerCopySummary } from "../utils/copy";
import { nowIso } from "../utils/format";
import { buildAdviceRequest } from "../utils/request";

function initialConnection(): ConnectionInfo {
  const cfg = getApiConfig();
  return {
    status: "checking",
    apiStatus: "unreachable",
    apiBaseUrl: cfg.baseUrl,
    backendOrigin: cfg.backendOrigin,
    resolvedHealthUrl: `${cfg.baseUrl}/health`,
    warning: cfg.warning,
  };
}

export default function App() {
  const toast = useToast();
  const step = useSessionStore((s) => s.step);
  const heroHole = useSessionStore((s) => s.heroHole);
  const board = useSessionStore((s) => s.board);
  const opponentsByStreet = useSessionStore((s) => s.opponentsByStreet);
  const potBb = useSessionStore((s) => s.potBb);
  const toCallBb = useSessionStore((s) => s.facingBetBb);
  const allowBluffs = useSessionStore((s) => s.allowBluffs);
  const latestAdvice = useSessionStore((s) => s.latestAdvice);
  const setLatestAdvice = useSessionStore((s) => s.setLatestAdvice);
  const setLastRequestPayload = useSessionStore((s) => s.setLastRequestPayload);
  const isAdviceStale = useSessionStore((s) => s.isAdviceStale);
  const pushHistory = useSessionStore((s) => s.pushHistory);

  const [connection, setConnection] = useState<ConnectionInfo>(initialConnection());

  const street = stepToStreet(step);
  const currentOpponents = opponentsByStreet[street];

  const boardForStreet = useMemo(() => {
    if (street === "preflop") {
      return [];
    }
    if (street === "flop") {
      return board.slice(0, 3);
    }
    if (street === "turn") {
      return board.slice(0, 4);
    }
    return board.slice(0, 5);
  }, [street, board]);

  async function refreshHealth(showToast = false): Promise<boolean> {
    setConnection((prev) => ({ ...prev, status: "checking" }));
    const health = await checkHealth();

    const nextStatus: ConnectionInfo["status"] = health.ok ? "connected" : "not_connected";
    setConnection({
      status: nextStatus,
      apiStatus: health.apiStatus,
      errorMessage: health.errorMessage,
      httpStatus: health.httpStatus,
      rawBody: health.rawBody,
      apiBaseUrl: health.apiBaseUrl,
      backendOrigin: health.backendOrigin,
      resolvedHealthUrl: health.resolvedUrl,
      warning: health.warning,
    });

    if (showToast) {
      if (health.ok) {
        toast.push("Backend health check passed.");
      } else {
        toast.push(`Backend not connected: ${health.errorMessage ?? health.apiStatus}`, "error");
      }
    }

    return health.ok;
  }

  useEffect(() => {
    void refreshHealth(false);
  }, []);

  const mutation = useMutation({
    mutationFn: fetchAdvice,
    onSuccess: (result) => {
      setLatestAdvice(result);
      if (result.source === "api" && result.response) {
        setConnection((prev) => ({ ...prev, status: "connected", apiStatus: "ok" }));
        pushHistory({
          street,
          action: result.response.action,
          equity: result.response.equity,
          pot_odds: result.response.pot_odds,
          opponents: currentOpponents,
          timestamp: nowIso(),
        });
        toast.push("Advice received from API.");
      } else {
        const apiStatus: ApiStatus = result.apiStatus;
        setConnection((prev) => ({
          ...prev,
          status: "not_connected",
          apiStatus,
          errorMessage: result.errorMessage,
          httpStatus: result.httpStatus,
          rawBody: result.rawError,
        }));
        toast.push("No recommendation available. Check backend connection.", "error");
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unexpected request error";
      toast.push(message, "error");
    },
  });

  async function handleGetAdvice(): Promise<void> {
    if (!heroHole[0] || !heroHole[1]) {
      toast.push("Hero hole cards are required.", "error");
      return;
    }

    if (boardForStreet.some((c) => !c)) {
      toast.push(`Missing board card(s) for ${street}.`, "error");
      return;
    }

    const payload = buildAdviceRequest({
      heroHole: [heroHole[0], heroHole[1]],
      board: boardForStreet.filter((c): c is string => Boolean(c)),
      street,
      numOpponents: currentOpponents,
      potBb,
      toCallBb,
      allowBluffs,
    });

    setLastRequestPayload(payload);
    await mutation.mutateAsync(payload);
  }

  async function handleRetry(): Promise<void> {
    const ok = await refreshHealth(true);
    if (!ok) {
      return;
    }
    await handleGetAdvice();
  }

  function copyAdvice(): void {
    if (!latestAdvice) {
      return;
    }
    const summary = buildBeginnerCopySummary(latestAdvice);

    navigator.clipboard
      .writeText(summary)
      .then(() => toast.push("Advice copied."))
      .catch(() => toast.push("Could not copy to clipboard.", "error"));
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HandBuilder onGetAdvice={handleGetAdvice} isLoading={mutation.isPending} />
          <AdvicePanel advice={latestAdvice} isLoading={mutation.isPending} isStale={isAdviceStale} onCopy={copyAdvice} onRetry={handleRetry} connection={connection} />
          <div className="lg:col-span-2">
            <SessionSummary />
          </div>
        </div>
      </main>
    </div>
  );
}
