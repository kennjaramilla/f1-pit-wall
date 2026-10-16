import { RacePicker } from "@/components/RacePicker";

export default function Home() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Race replay</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">See the race the way the strategists did.</h1>
        <p className="mt-3 text-lg text-muted">
          Pick a Grand Prix to replay every car on track, follow the timing tower lap by lap, and compare tyre strategy, gaps and
          fastest-lap telemetry.
        </p>
      </div>
      <RacePicker />
    </div>
  );
}
