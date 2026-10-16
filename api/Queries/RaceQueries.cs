using F1PitWall.Api.Contracts;
using F1PitWall.Api.Data;
using F1PitWall.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace F1PitWall.Api.Queries;

/// Read side: shapes cached rows into the DTOs served by the API and written to the static snapshot.
public class RaceQueries(PitWallDb db)
{
    public async Task<RaceSummaryDto[]> ListRaces(CancellationToken ct = default)
    {
        var sessions = await db.Sessions.AsNoTracking().ToListAsync(ct);
        var result = new List<RaceSummaryDto>();
        foreach (var s in sessions.OrderByDescending(s => s.RaceStartUtc))
            result.Add(await Summary(s, ct));
        return [.. result];
    }

    public async Task<RaceBundleDto?> Bundle(int key, CancellationToken ct = default)
    {
        var s = await db.Sessions.AsNoTracking().SingleOrDefaultAsync(x => x.SessionKey == key, ct);
        if (s is null) return null;
        long Rel(DateTimeOffset d) => (long)(d - s.RaceStartUtc).TotalMilliseconds;

        var drivers = await db.Drivers.AsNoTracking().Where(d => d.SessionKey == key).ToListAsync(ct);
        var laps = await db.Laps.AsNoTracking().Where(l => l.SessionKey == key).ToListAsync(ct);
        var stints = await db.Stints.AsNoTracking().Where(x => x.SessionKey == key).ToListAsync(ct);
        var pits = await db.PitStops.AsNoTracking().Where(x => x.SessionKey == key).ToListAsync(ct);
        var rc = await db.RaceControl.AsNoTracking().Where(x => x.SessionKey == key).ToListAsync(ct);
        var positions = await db.Positions.AsNoTracking().Where(x => x.SessionKey == key).ToListAsync(ct);

        var lapDtos = laps
            .OrderBy(l => l.DriverNumber).ThenBy(l => l.LapNumber)
            .Select(l => new LapDto(l.DriverNumber, l.LapNumber, l.DateStart is { } d ? Rel(d) : null,
                l.Duration is { } dur ? (long)Math.Round(dur * 1000) : null, l.S1, l.S2, l.S3, l.PitOut))
            .ToArray();

        var crossings = lapDtos.GroupBy(l => l.Driver).ToDictionary(g => g.Key,
            g => RaceMath.Crossings(g.Select(l => new LapTiming(l.Lap, l.T, l.DurationMs))));
        var gaps = RaceMath.GapsToLeader(crossings, s.TotalLaps);

        // Leader's start of each lap = when the first car crossed the line at the end of the previous lap.
        var lapStarts = Enumerable.Range(1, s.TotalLaps).Select(lap =>
        {
            var t = lap == 1 ? 0 : crossings.Values.Where(c => c.ContainsKey(lap - 1)).Select(c => c[lap - 1]).DefaultIfEmpty(-1).Min();
            return new LapStartDto(lap, t);
        }).Where(x => x.T >= 0).ToArray();

        var periods = RaceMath.TrackPeriods(rc.Select(m => (Rel(m.Date), m.Category, m.Flag, m.Scope, m.Message)), s.WindowEndMs)
            .Where(p => p.EndMs > 0)
            .Select(p => new PeriodDto(p.Kind, Math.Max(0, p.StartMs), p.EndMs)).ToArray();

        var events = rc
            .Where(m => Rel(m.Date) >= -5_000)
            .Select(m => new EventDto(Rel(m.Date), m.LapNumber, EventKind(m), m.Message, m.DriverNumber))
            .Where(e => e.Kind != "skip")
            .OrderBy(e => e.T).ToArray();

        // Grid order = last known position before lights out; then every change after.
        var positionDtos = positions
            .GroupBy(p => p.DriverNumber)
            .SelectMany(g =>
            {
                var ordered = g.OrderBy(p => p.Date).ToList();
                var grid = ordered.LastOrDefault(p => Rel(p.Date) <= 0) ?? ordered.First();
                return ordered.Where(p => Rel(p.Date) > 0)
                    .Prepend(grid)
                    .Select(p => new PositionDto(p.DriverNumber, Math.Max(0, Rel(p.Date)), p.Position));
            })
            .OrderBy(p => p.T).ThenBy(p => p.Position).ToArray();

        var fastest = lapDtos.Where(l => l.DurationMs is not null && !l.PitOut && l.Lap > 1)
            .GroupBy(l => l.Driver)
            .Select(g => g.MinBy(l => l.DurationMs)!)
            .Select(l => new FastestLapDto(l.Driver, l.Lap, l.DurationMs!.Value))
            .OrderBy(f => f.DurationMs).ToArray();

        return new RaceBundleDto(
            await Summary(s, ct), s.WindowStartMs, s.WindowEndMs,
            drivers.OrderBy(d => d.Number).Select(d => new DriverDto(d.Number, d.Acronym, d.FullName, d.Team, d.Colour, d.HeadshotUrl)).ToArray(),
            lapStarts,
            lapDtos,
            stints.OrderBy(x => x.DriverNumber).ThenBy(x => x.StintNumber)
                .Select(x => new StintDto(x.DriverNumber, x.StintNumber, x.Compound, x.LapStart, x.LapEnd, x.TyreAgeAtStart)).ToArray(),
            pits.OrderBy(p => p.Date).Select(p => new PitDto(p.DriverNumber, p.LapNumber, Rel(p.Date), p.LaneDuration, p.StopDuration)).ToArray(),
            positionDtos,
            events,
            periods,
            gaps.OrderBy(g => g.Key).Select(g => new DriverGapsDto(g.Key, g.Value)).ToArray(),
            fastest,
            Classify(positionDtos, crossings, s.TotalLaps));
    }

    public async Task<ReplayDto?> Replay(int key, CancellationToken ct = default)
    {
        var s = await db.Sessions.AsNoTracking().SingleOrDefaultAsync(x => x.SessionKey == key, ct);
        if (s is null) return null;
        var frameCount = (int)((s.WindowEndMs - s.WindowStartMs) / s.FrameStepMs) + 1;
        var frames = await db.LocationFrames.AsNoTracking().Where(f => f.SessionKey == key).ToListAsync(ct);
        var drivers = frames.GroupBy(f => f.DriverNumber).OrderBy(g => g.Key).Select(g =>
        {
            var xy = new int?[frameCount * 2];
            foreach (var f in g)
            {
                xy[f.Index * 2] = f.X;
                xy[f.Index * 2 + 1] = f.Y;
            }
            return new ReplayDriverDto(g.Key, xy);
        }).ToArray();
        return new ReplayDto(s.WindowStartMs, s.FrameStepMs, frameCount, await Outline(key, 1, ct), drivers);
    }

    public async Task<TelemetryDto?> Telemetry(int key, int driver, CancellationToken ct = default)
    {
        var rows = await db.Telemetry.AsNoTracking()
            .Where(t => t.SessionKey == key && t.DriverNumber == driver).OrderBy(t => t.Seq).ToListAsync(ct);
        if (rows.Count == 0) return null;
        var lap = await db.Laps.AsNoTracking().SingleAsync(l => l.SessionKey == key && l.DriverNumber == driver && l.LapNumber == rows[0].LapNumber, ct);
        return new TelemetryDto(driver, rows[0].LapNumber, (long)Math.Round((lap.Duration ?? 0) * 1000),
            rows.Select(r => new TelemetryPointDto(r.DistanceM, r.Speed, r.Throttle, r.Brake, r.Gear, r.Drs, r.X, r.Y)).ToArray());
    }

    public async Task<int[]> TelemetryDrivers(int key, CancellationToken ct = default) =>
        await db.Telemetry.AsNoTracking().Where(t => t.SessionKey == key).Select(t => t.DriverNumber).Distinct().OrderBy(d => d).ToArrayAsync(ct);

    private async Task<RaceSummaryDto> Summary(RaceSession s, CancellationToken ct)
    {
        var finalPositions = await db.Positions.AsNoTracking()
            .Where(p => p.SessionKey == s.SessionKey)
            .Select(p => new { p.DriverNumber, p.Date, p.Position })
            .ToListAsync(ct);
        var winnerNumber = finalPositions.Where(p => p.Position == 1).MaxBy(p => p.Date)?.DriverNumber;
        var w = winnerNumber is null ? null
            : await db.Drivers.AsNoTracking().SingleOrDefaultAsync(d => d.SessionKey == s.SessionKey && d.Number == winnerNumber, ct);
        return new RaceSummaryDto(s.SessionKey, s.Year, s.Name, s.Country, s.Circuit, s.RaceStartUtc, s.TotalLaps,
            w is null ? null : new WinnerDto(w.Number, w.Acronym, w.FullName, w.Team, w.Colour),
            await Outline(s.SessionKey, 4, ct));
    }

    /// Track outline from the fastest lap's location trace; every Nth point.
    private async Task<int[][]> Outline(int key, int every, CancellationToken ct)
    {
        var fastestDriver = await db.Telemetry.AsNoTracking().Where(t => t.SessionKey == key)
            .GroupBy(t => t.DriverNumber)
            .Select(g => new { Driver = g.Key, Ms = g.Max(t => t.OffsetMs) })
            .OrderBy(g => g.Ms).Select(g => (int?)g.Driver).FirstOrDefaultAsync(ct);
        if (fastestDriver is null) return [];
        var pts = await db.Telemetry.AsNoTracking()
            .Where(t => t.SessionKey == key && t.DriverNumber == fastestDriver && t.X != null)
            .OrderBy(t => t.Seq).Select(t => new[] { t.X!.Value, t.Y!.Value }).ToListAsync(ct);
        return pts.Where((_, i) => i % every == 0).ToArray();
    }

    private static string EventKind(RaceControlMessage m)
    {
        var msg = m.Message.ToUpperInvariant();
        if (m.Flag == "BLUE") return "skip";
        if (m.Category == "SafetyCar") return msg.Contains("VIRTUAL") ? "vsc" : "sc";
        return m.Flag switch
        {
            "RED" => "red",
            "CHEQUERED" => "chequered",
            "YELLOW" or "DOUBLE YELLOW" => m.Scope == "Track" ? "yellow" : "skip",
            "GREEN" or "CLEAR" => m.Scope == "Track" ? "green" : "skip",
            _ when msg.Contains("PENALTY") => "penalty",
            _ when msg.Contains("INVESTIGATION") || msg.Contains("NOTED") => "investigation",
            _ when m.Category == "Drs" || msg.Contains("DRS") => "drs",
            _ when msg.Contains("RISK OF RAIN") || msg.Contains("WET") => "weather",
            _ => "skip",
        };
    }

    private static ClassificationDto[] Classify(PositionDto[] positions, Dictionary<int, SortedDictionary<int, long>> crossings, int totalLaps)
    {
        var winnerFinish = crossings.Values.Where(c => c.ContainsKey(totalLaps)).Select(c => c[totalLaps]).DefaultIfEmpty(long.MaxValue).Min();
        return positions.GroupBy(p => p.Driver)
            .Select(g => g.MaxBy(p => p.T)!)
            .OrderBy(p => p.Position)
            .Select(p =>
            {
                var c = crossings.GetValueOrDefault(p.Driver);
                var done = c?.Count > 0 ? c.Keys.Max() : 0;
                var last = c?.Count > 0 ? c.Values.Max() : 0;
                var finished = last >= winnerFinish;
                var down = totalLaps - done;
                var status = !finished ? "DNF" : down == 0 ? "Finished" : $"+{down} Lap{(down > 1 ? "s" : "")}";
                return new ClassificationDto(p.Position, p.Driver, done, status);
            }).ToArray();
    }
}
