import { describe, expect, it } from "vitest";
import { formatGap, formatLapTime, formatRaceClock, hex } from "./format";

describe("format", () => {
  it("formats lap times as m:ss.mmm", () => {
    expect(formatLapTime(87_345)).toBe("1:27.345");
    expect(formatLapTime(59_999)).toBe("0:59.999");
    expect(formatLapTime(null)).toBe("—");
  });

  it("formats the race clock including pre-start and hours", () => {
    expect(formatRaceClock(-5_000)).toBe("-0:05");
    expect(formatRaceClock(1_500_000)).toBe("25:00");
    expect(formatRaceClock(3_725_000)).toBe("1:02:05");
  });

  it("formats gaps, lapped cars and the leader", () => {
    expect(formatGap(1.2345)).toBe("+1.234");
    expect(formatGap(12, 1)).toBe("+1 LAP");
    expect(formatGap(12, 2)).toBe("+2 LAPS");
    expect(formatGap(0, 0, true)).toBe("LEADER");
    expect(formatGap(null)).toBe("—");
  });

  it("normalises team colours", () => {
    expect(hex("4781D7")).toBe("#4781D7");
    expect(hex("#fff")).toBe("#fff");
    expect(hex(null)).toMatch(/^#/);
  });
});
