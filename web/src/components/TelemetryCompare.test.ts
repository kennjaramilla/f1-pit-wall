import { describe, expect, it } from "vitest";
import { sampleAt } from "./TelemetryCompare";
import type { TelemetryPoint } from "@/lib/types";

const p = (d: number): TelemetryPoint => ({ d, speed: d, throttle: 0, brake: false, gear: 1, drs: false, x: 0, y: 0 });

describe("sampleAt", () => {
  it("returns the nearest sample by distance", () => {
    const pts = [p(0), p(10), p(20), p(30)];
    expect(sampleAt(pts, 14)?.d).toBe(10);
    expect(sampleAt(pts, 16)?.d).toBe(20);
    expect(sampleAt(pts, 999)?.d).toBe(30);
    expect(sampleAt([], 5)).toBeNull();
  });
});
