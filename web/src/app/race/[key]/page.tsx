import { readFile } from "node:fs/promises";
import path from "node:path";
import { Suspense } from "react";
import { RaceSkeleton, RaceView } from "@/components/RaceView";
import type { RaceSummary } from "@/lib/types";

// Prebuild pages for the races in the bundled snapshot; others (live API) render on demand.
export async function generateStaticParams() {
  try {
    const races: RaceSummary[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/races.json"), "utf8"));
    return races.map((r) => ({ key: String(r.sessionKey) }));
  } catch {
    return [];
  }
}

async function Race({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <RaceView sessionKey={Number(key)} />;
}

export default function Page({ params }: { params: Promise<{ key: string }> }) {
  return (
    <Suspense fallback={<RaceSkeleton />}>
      <Race params={params} />
    </Suspense>
  );
}
