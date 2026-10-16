// Mirrors api/Contracts/Dtos.cs. All times are ms relative to lights out.

export interface Winner {
  number: number;
  acronym: string;
  fullName: string;
  team: string;
  colour: string;
}

export interface RaceSummary {
  sessionKey: number;
  year: number;
  name: string;
  country: string;
  circuit: string;
  raceStartUtc: string;
  totalLaps: number;
  winner: Winner | null;
  outline: number[][];
}

export interface Driver {
  number: number;
  acronym: string;
  fullName: string;
  team: string;
  colour: string;
  headshotUrl: string | null;
}

export interface Lap {
  driver: number;
  lap: number;
  t: number | null;
  durationMs: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  pitOut: boolean;
}

export interface Stint {
  driver: number;
  stint: number;
  compound: string;
  lapStart: number;
  lapEnd: number;
  tyreAgeAtStart: number;
}

export interface Pit {
  driver: number;
  lap: number;
  t: number;
  laneDuration: number | null;
  stopDuration: number | null;
}

export interface PositionChange {
  driver: number;
  t: number;
  position: number;
}

export type EventKind = "sc" | "vsc" | "red" | "yellow" | "green" | "chequered" | "penalty" | "investigation" | "drs" | "weather";

export interface RaceEvent {
  t: number;
  lap: number | null;
  kind: EventKind;
  message: string;
  driver: number | null;
}

export type PeriodKind = "sc" | "vsc" | "red";

export interface Period {
  kind: PeriodKind;
  startMs: number;
  endMs: number;
}

export interface LapStart {
  lap: number;
  t: number;
}

export interface DriverGaps {
  driver: number;
  gaps: (number | null)[];
}

export interface FastestLap {
  driver: number;
  lap: number;
  durationMs: number;
}

export interface Classification {
  position: number;
  driver: number;
  lapsCompleted: number;
  status: string;
}

export interface RaceBundle {
  race: RaceSummary;
  windowStartMs: number;
  windowEndMs: number;
  drivers: Driver[];
  lapStarts: LapStart[];
  laps: Lap[];
  stints: Stint[];
  pits: Pit[];
  positions: PositionChange[];
  events: RaceEvent[];
  periods: Period[];
  gaps: DriverGaps[];
  fastestLaps: FastestLap[];
  classification: Classification[];
}

export interface ReplayDriver {
  driver: number;
  xy: (number | null)[];
}

export interface Replay {
  startMs: number;
  stepMs: number;
  frameCount: number;
  outline: number[][];
  drivers: ReplayDriver[];
}

export interface TelemetryPoint {
  d: number;
  speed: number;
  throttle: number;
  brake: boolean;
  gear: number;
  drs: boolean;
  x: number | null;
  y: number | null;
}

export interface Telemetry {
  driver: number;
  lap: number;
  lapTimeMs: number;
  points: TelemetryPoint[];
}
