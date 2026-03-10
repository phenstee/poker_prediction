import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CardPicker } from "./CardPicker";
import { Stepper } from "./Stepper";
import { Button, Card, Input } from "./ui/primitives";
import { Dialog } from "./ui/dialog";
import { Tabs, TabsContent } from "./ui/tabs";
import { useSessionStore, stepToStreet } from "../store/session";
import { hasDuplicates, parseCardList, type CardCode } from "../utils/cards";
import { useToast } from "./ui/toast";

interface HandBuilderProps {
  onGetAdvice: () => void;
  isLoading: boolean;
}

const STEPS = ["Preflop", "Flop", "Turn", "River"];

type FieldErrors = {
  cards?: string;
  pot?: string;
  toCall?: string;
  opponents?: string;
};

export function HandBuilder({ onGetAdvice, isLoading }: HandBuilderProps) {
  const toast = useToast();
  const [tab, setTab] = useState("picker");
  const [heroText, setHeroText] = useState("");
  const [flopText, setFlopText] = useState("");
  const [turnText, setTurnText] = useState("");
  const [riverText, setRiverText] = useState("");
  const [quickInputError, setQuickInputError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const step = useSessionStore((s) => s.step);
  const heroHole = useSessionStore((s) => s.heroHole);
  const board = useSessionStore((s) => s.board);
  const opponentsByStreet = useSessionStore((s) => s.opponentsByStreet);
  const potBb = useSessionStore((s) => s.potBb);
  const toCallBb = useSessionStore((s) => s.facingBetBb);
  const allowBluffs = useSessionStore((s) => s.allowBluffs);

  const setStep = useSessionStore((s) => s.setStep);
  const prevStep = useSessionStore((s) => s.prevStep);
  const nextStep = useSessionStore((s) => s.nextStep);
  const setHeroCard = useSessionStore((s) => s.setHeroCard);
  const setBoardCard = useSessionStore((s) => s.setBoardCard);
  const setOpponentsForStreet = useSessionStore((s) => s.setOpponentsForStreet);
  const setPotBb = useSessionStore((s) => s.setPotBb);
  const setFacingBetBb = useSessionStore((s) => s.setFacingBetBb);
  const setAllowBluffs = useSessionStore((s) => s.setAllowBluffs);
  const resetHand = useSessionStore((s) => s.resetHand);
  const clearStreetCards = useSessionStore((s) => s.clearStreetCards);

  const street = stepToStreet(step);
  const currentOpponents = opponentsByStreet[street];

  const usedCards = useMemo(() => [...heroHole, ...board].filter((c): c is CardCode => Boolean(c)), [heroHole, board]);

  const validation = useMemo(() => {
    const errors: FieldErrors = {};

    const knownCards = [...heroHole, ...board].filter((c): c is CardCode => Boolean(c));
    if (!heroHole[0] || !heroHole[1]) {
      errors.cards = "Enter both hero hole cards.";
    }

    if (hasDuplicates(knownCards)) {
      errors.cards = "Duplicate cards found across hero and board.";
    }

    const requiredBoardCards = street === "preflop" ? 0 : street === "flop" ? 3 : street === "turn" ? 4 : 5;
    const actualBoardCards = board.filter(Boolean).length;
    if (actualBoardCards < requiredBoardCards) {
      errors.cards = `Add ${requiredBoardCards} board cards for ${street}.`;
    }

    if (!Number.isFinite(potBb) || potBb < 0) {
      errors.pot = "Pot must be 0 bb or higher.";
    }

    if (!Number.isFinite(toCallBb) || toCallBb < 0) {
      errors.toCall = "To call must be 0 bb or higher.";
    }

    if (!Number.isInteger(currentOpponents) || currentOpponents < 1 || currentOpponents > 8) {
      errors.opponents = "Opponents still in hand must be between 1 and 8.";
    }

    const reasons = Object.values(errors).filter(Boolean) as string[];

    return {
      valid: reasons.length === 0,
      errors,
      reasons,
      firstReason: reasons[0] ?? null,
    };
  }, [board, currentOpponents, heroHole, potBb, street, toCallBb]);

  function safeSetCards(next: Array<CardCode | null | undefined>, apply: () => void): void {
    if (hasDuplicates(next)) {
      toast.push("Duplicate cards are not allowed.", "error");
      return;
    }
    apply();
  }

  function applyQuickText(): void {
    try {
      setQuickInputError(null);
      if (street === "preflop") {
        const cards = parseCardList(heroText, 2);
        safeSetCards([cards[0], cards[1], ...board], () => {
          setHeroCard(0, cards[0]);
          setHeroCard(1, cards[1]);
          toast.push("Hero cards updated.");
        });
      }
      if (street === "flop") {
        const cards = parseCardList(flopText, 3);
        safeSetCards([...heroHole, cards[0], cards[1], cards[2], board[3], board[4]], () => {
          setBoardCard(0, cards[0]);
          setBoardCard(1, cards[1]);
          setBoardCard(2, cards[2]);
          toast.push("Flop cards updated.");
        });
      }
      if (street === "turn") {
        const cards = parseCardList(turnText, 1);
        safeSetCards([...heroHole, board[0], board[1], board[2], cards[0], board[4]], () => {
          setBoardCard(3, cards[0]);
          toast.push("Turn card updated.");
        });
      }
      if (street === "river") {
        const cards = parseCardList(riverText, 1);
        safeSetCards([...heroHole, board[0], board[1], board[2], board[3], cards[0]], () => {
          setBoardCard(4, cards[0]);
          toast.push("River card updated.");
        });
      }
    } catch (error) {
      const message = (error as Error).message;
      setQuickInputError(message);
      toast.push(message, "error");
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Hand Builder</h2>
        <p className="text-sm text-slate-400">Manual input only. Enter cards and chip values in bb.</p>
      </div>

      <Stepper steps={STEPS} activeStep={step} onStepClick={setStep} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="pot" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Pot (bb)
          </label>
          <Input
            id="pot"
            type="number"
            min={0}
            step="0.1"
            value={potBb}
            aria-invalid={Boolean(validation.errors.pot)}
            aria-describedby={validation.errors.pot ? "pot-error" : undefined}
            onChange={(e) => setPotBb(Number(e.target.value))}
          />
          {validation.errors.pot ? (
            <p id="pot-error" className="mt-1 text-xs text-rose-300" role="alert">
              {validation.errors.pot}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="to-call" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            To call (bb)
          </label>
          <Input
            id="to-call"
            type="number"
            min={0}
            step="0.1"
            value={toCallBb}
            aria-invalid={Boolean(validation.errors.toCall)}
            aria-describedby={validation.errors.toCall ? "to-call-error" : undefined}
            onChange={(e) => setFacingBetBb(Number(e.target.value))}
          />
          {validation.errors.toCall ? (
            <p id="to-call-error" className="mt-1 text-xs text-rose-300" role="alert">
              {validation.errors.toCall}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="opp" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Opponents still in hand
          </label>
          <Input
            id="opp"
            type="number"
            min={1}
            max={8}
            step="1"
            value={currentOpponents}
            aria-invalid={Boolean(validation.errors.opponents)}
            aria-describedby={validation.errors.opponents ? "opp-error" : undefined}
            onChange={(e) => setOpponentsForStreet(street, Number(e.target.value))}
          />
          {validation.errors.opponents ? (
            <p id="opp-error" className="mt-1 text-xs text-rose-300" role="alert">
              {validation.errors.opponents}
            </p>
          ) : null}
        </div>
      </div>

      {street === "preflop" ? (
        <div className="mt-3">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={allowBluffs} onChange={(e) => setAllowBluffs(e.target.checked)} className="accent-emerald-400" />
            Allow bluff suggestions
          </label>
        </div>
      ) : null}

      {validation.errors.cards ? <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">{validation.errors.cards}</p> : null}

      <div className="mt-4">
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: "picker", label: "Card Picker" }, { value: "text", label: "Quick Text" }]}>
          <TabsContent value="picker" current={tab}>
            {street === "preflop" ? (
              <div className="grid gap-3">
                <CardPicker label="Hero Card 1" value={heroHole[0]} usedCards={usedCards} onChange={(card) => safeSetCards([card, heroHole[1], ...board], () => setHeroCard(0, card))} />
                <CardPicker label="Hero Card 2" value={heroHole[1]} usedCards={usedCards} onChange={(card) => safeSetCards([heroHole[0], card, ...board], () => setHeroCard(1, card))} />
              </div>
            ) : null}

            {street === "flop" ? (
              <div className="grid gap-3">
                <CardPicker label="Flop Card 1" value={board[0]} usedCards={usedCards} onChange={(card) => safeSetCards([...heroHole, card, board[1], board[2], board[3], board[4]], () => setBoardCard(0, card))} />
                <CardPicker label="Flop Card 2" value={board[1]} usedCards={usedCards} onChange={(card) => safeSetCards([...heroHole, board[0], card, board[2], board[3], board[4]], () => setBoardCard(1, card))} />
                <CardPicker label="Flop Card 3" value={board[2]} usedCards={usedCards} onChange={(card) => safeSetCards([...heroHole, board[0], board[1], card, board[3], board[4]], () => setBoardCard(2, card))} />
              </div>
            ) : null}

            {street === "turn" ? <CardPicker label="Turn Card" value={board[3]} usedCards={usedCards} onChange={(card) => safeSetCards([...heroHole, board[0], board[1], board[2], card, board[4]], () => setBoardCard(3, card))} /> : null}

            {street === "river" ? <CardPicker label="River Card" value={board[4]} usedCards={usedCards} onChange={(card) => safeSetCards([...heroHole, board[0], board[1], board[2], board[3], card], () => setBoardCard(4, card))} /> : null}
          </TabsContent>

          <TabsContent value="text" current={tab}>
            <div className="space-y-2">
              {street === "preflop" ? (
                <>
                  <Input value={heroText} onChange={(e) => setHeroText(e.target.value)} placeholder="As Kh" aria-label="Hero cards text" />
                  <p className="text-xs text-slate-500">Enter two cards separated by space.</p>
                </>
              ) : null}
              {street === "flop" ? <Input value={flopText} onChange={(e) => setFlopText(e.target.value)} placeholder="Qd Js 2c" aria-label="Flop cards text" /> : null}
              {street === "turn" ? <Input value={turnText} onChange={(e) => setTurnText(e.target.value)} placeholder="9h" aria-label="Turn card text" /> : null}
              {street === "river" ? <Input value={riverText} onChange={(e) => setRiverText(e.target.value)} placeholder="4s" aria-label="River card text" /> : null}
              <Button variant="secondary" onClick={applyQuickText} disabled={isLoading}>
                Apply Text Input
              </Button>
              {quickInputError ? (
                <p className="text-xs text-rose-300" role="alert">
                  {quickInputError}
                </p>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={prevStep} disabled={step === 0 || isLoading}>
          Back
        </Button>
        <Button variant="secondary" onClick={nextStep} disabled={step === 3 || isLoading}>
          Next
        </Button>
        <Button onClick={onGetAdvice} disabled={isLoading || !validation.valid} title={!validation.valid ? validation.firstReason ?? undefined : undefined}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Get Advice
        </Button>
        <Button variant="ghost" onClick={() => clearStreetCards(street)} disabled={isLoading}>
          Clear Street
        </Button>
        <Button variant="danger" onClick={() => setShowResetDialog(true)} disabled={isLoading}>
          Reset Hand
        </Button>
      </div>

      {!validation.valid ? <p className="mt-2 text-xs text-slate-400">Resolve validation issues to enable Get Advice.</p> : null}

      <Dialog
        open={showResetDialog}
        title="Reset hand session?"
        description="This will clear hero cards, board, advice history, and betting values."
        onCancel={() => setShowResetDialog(false)}
        onConfirm={() => {
          resetHand();
          setShowResetDialog(false);
          setQuickInputError(null);
          toast.push("Hand reset complete.");
        }}
        confirmText="Reset"
      />
    </Card>
  );
}
