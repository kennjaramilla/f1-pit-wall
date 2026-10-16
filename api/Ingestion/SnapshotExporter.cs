using System.Text.Json;
using F1PitWall.Api.Queries;

namespace F1PitWall.Api.Ingestion;

/// Writes the exact API responses to disk so the web app can run without the API (Vercel).
public static class SnapshotExporter
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static async Task Export(RaceQueries q, string outDir)
    {
        Directory.CreateDirectory(outDir);
        var races = await q.ListRaces();
        await Write(Path.Combine(outDir, "races.json"), races);
        foreach (var r in races)
        {
            var dir = Path.Combine(outDir, "races", r.SessionKey.ToString());
            Directory.CreateDirectory(Path.Combine(dir, "telemetry"));
            await Write(Path.Combine(outDir, "races", $"{r.SessionKey}.json"), await q.Bundle(r.SessionKey));
            await Write(Path.Combine(dir, "replay.json"), await q.Replay(r.SessionKey));
            var drivers = await q.TelemetryDrivers(r.SessionKey);
            await Write(Path.Combine(dir, "telemetry.json"), drivers);
            foreach (var d in drivers)
                await Write(Path.Combine(dir, "telemetry", $"{d}.json"), await q.Telemetry(r.SessionKey, d));
        }
        Console.WriteLine($"Exported {races.Length} races to {Path.GetFullPath(outDir)}");
    }

    private static async Task Write<T>(string path, T value)
    {
        await using var f = File.Create(path);
        await JsonSerializer.SerializeAsync(f, value, Json);
    }
}
