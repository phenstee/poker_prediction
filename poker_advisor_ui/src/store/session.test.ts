import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "./session";

describe("session store card updates", () => {
  beforeEach(() => {
    const state = useSessionStore.getState();
    state.resetHand();
    state.setStep(0);
  });

  it("allows setting hero cards after reset", () => {
    const beforeResetRef = useSessionStore.getState().heroHole;

    useSessionStore.getState().resetHand();
    useSessionStore.getState().setHeroCard(0, "As");
    useSessionStore.getState().setHeroCard(1, "Kh");

    const state = useSessionStore.getState();
    expect(state.heroHole).toEqual(["As", "Kh"]);
    expect(state.heroHole).not.toBe(beforeResetRef);
  });

  it("replaces flop card value", () => {
    useSessionStore.getState().setBoardCard(0, "Qd");
    expect(useSessionStore.getState().board[0]).toBe("Qd");

    useSessionStore.getState().setBoardCard(0, "Jh");
    expect(useSessionStore.getState().board[0]).toBe("Jh");
  });

  it("sets, clears, and sets turn/river again", () => {
    const store = useSessionStore.getState();
    store.setBoardCard(0, "Qd");
    store.setBoardCard(1, "Js");
    store.setBoardCard(2, "2c");
    store.setBoardCard(3, "9h");
    store.setBoardCard(4, "4s");

    expect(useSessionStore.getState().board[3]).toBe("9h");
    expect(useSessionStore.getState().board[4]).toBe("4s");

    useSessionStore.getState().clearStreetCards("turn");

    expect(useSessionStore.getState().board[3]).toBeNull();
    expect(useSessionStore.getState().board[4]).toBeNull();

    useSessionStore.getState().setBoardCard(3, "Tc");
    useSessionStore.getState().setBoardCard(4, "8d");

    expect(useSessionStore.getState().board[3]).toBe("Tc");
    expect(useSessionStore.getState().board[4]).toBe("8d");
  });

  it("stores opponents independently per street", () => {
    const store = useSessionStore.getState();
    store.setOpponentsForStreet("preflop", 4);
    store.setOpponentsForStreet("flop", 2);
    store.setOpponentsForStreet("turn", 2);
    store.setOpponentsForStreet("river", 1);

    const state = useSessionStore.getState();
    expect(state.opponentsByStreet.preflop).toBe(4);
    expect(state.opponentsByStreet.flop).toBe(2);
    expect(state.opponentsByStreet.turn).toBe(2);
    expect(state.opponentsByStreet.river).toBe(1);
  });
});
