import { describe, expect, it } from "vitest";
import { hasDuplicates, normalizeCard, parseCardList } from "./cards";

describe("card utils", () => {
  it("parses quick card text", () => {
    expect(parseCardList("As Kh", 2)).toEqual(["As", "Kh"]);
    expect(parseCardList("Qd Js 2c", 3)).toEqual(["Qd", "Js", "2c"]);
  });

  it("rejects invalid card tokens", () => {
    expect(() => normalizeCard("1s")).toThrow();
    expect(() => normalizeCard("AA")).toThrow();
  });

  it("detects duplicates", () => {
    expect(hasDuplicates(["As", "Kh", "As"])).toBe(true);
    expect(hasDuplicates(["As", "Kh", "Qd"])).toBe(false);
  });

  it("rejects duplicate quick entry", () => {
    expect(() => parseCardList("As As", 2)).toThrow(/Duplicate/);
  });
});
