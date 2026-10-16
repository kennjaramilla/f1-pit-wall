/** 87345 -> "1:27.345" */
export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const total = Math.round(ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Race clock from lights out: -5000 -> "-0:05", 3725000 -> "1:02:05" */
export function formatRaceClock(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${sign}${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Gap in seconds -> "+1.234"; leader -> "LEADER" */
export function formatGap(gapSec: number | null | undefined, lapsDown = 0, isLeader = false): string {
  if (isLeader) return "LEADER";
  if (lapsDown > 0) return `+${lapsDown} LAP${lapsDown > 1 ? "S" : ""}`;
  if (gapSec == null) return "—";
  return `+${gapSec.toFixed(3)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function hex(colour: string | null | undefined): string {
  if (!colour) return "#8a94a3";
  return colour.startsWith("#") ? colour : `#${colour}`;
}
