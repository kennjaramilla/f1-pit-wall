using F1PitWall.Api.Data;
using F1PitWall.Api.Domain;
using F1PitWall.Api.OpenF1;
using Microsoft.EntityFrameworkCore;

namespace F1PitWall.Api.Ingestion;

/// Pulls one race from OpenF1, downsamples it and replaces whatever is cached for that session.
public class IngestionService(OpenF1Client of1, PitWallDb db, ILogger<IngestionService> log)
{
    public const int FrameStepMs = 500;

    public async Task Ingest(int sessionKey, CancellationToken ct = default)
    {
        log.LogInformation("Ingesting session {Session}", sessionKey);
        var session = (await of1.Sessions(sessionKey)).SingleOrDefault()
            ?? throw new InvalidOperationException($"Session {sessionKey} not found on OpenF1");
        var meetingTask = of1.Meetings(session.MeetingKey);
        var driversTask = of1.Drivers(sessionKey);
        var lapsTask = of1.Laps(sessionKey);
        var stintsTask = of1.Stints(sessionKey);
        var pitsTask = of1.Pits(sessionKey);
        var rcTask = of1.RaceControl(sessionKey);
        var posTask = of1.Positions(sessionKey);
        await Task.WhenAll(meetingTask, driversTask, lapsTask, stintsTask, pitsTask, rcTask, posTask);

        var laps = lapsTask.Result;
        var raceStart = laps.Where(l => l.LapNumber == 1 && l.DateStart != null).Min(l => l.DateStart!.Value);
        long Rel(DateTimeOffset d) => (long)(d - raceStart).TotalMilliseconds;

        var crossings = laps.GroupBy(l => l.DriverNumber).ToDictionary(g => g.Key, g => RaceMath.Crossings(
            g.Select(l => new LapTiming(l.LapNumber, l.DateStart is { } d ? Rel(d) : null,
                l.LapDuration is { } dur ? (long)(dur * 1000) : null))));
        var raceEndMs = crossings.Values.Where(c => c.Count > 0).Max(c => c.Values.Max());
        var windowStart = -10_000L;
        var windowEnd = raceEndMs + 15_000;
        var frameCount = (int)((windowEnd - windowStart) / FrameStepMs) + 1;

        var drivers = driversTask.Result.DistinctBy(d => d.DriverNumber).ToList();

        var locationTasks = drivers.Select(async d =>
        {
            var rows = await of1.Location(sessionKey, d.DriverNumber, raceStart.AddMilliseconds(windowStart), raceStart.AddMilliseconds(windowEnd));
            var pts = rows.Where(r => r.X != 0 || r.Y != 0 || r.Z != 0)
                .Select(r => new TimedPoint(Rel(r.Date), r.X, r.Y)).OrderBy(p => p.T).ToList();
            return (Driver: d.DriverNumber, Points: pts);
        }).ToList();
        var locations = (await Task.WhenAll(locationTasks)).ToDictionary(x => x.Driver, x => x.Points);

        var telemetryTasks = laps
            .Where(l => l.LapDuration is not null && l.DateStart is not null && l.IsPitOutLap != true && l.LapNumber > 1)
            .GroupBy(l => l.DriverNumber)
            .Select(g => g.MinBy(l => l.LapDuration)!)
            .Select(async lap =>
            {
                var from = lap.DateStart!.Value;
                var to = from.AddSeconds(lap.LapDuration!.Value);
                var car = (await of1.CarData(sessionKey, lap.DriverNumber, from, to)).OrderBy(c => c.Date).ToList();
                var dist = RaceMath.Distance(car.Select(c => (Rel(c.Date), c.Speed)).ToList());
                var pts = locations.GetValueOrDefault(lap.DriverNumber) ?? [];
                return car.Select((c, i) =>
                {
                    var loc = RaceMath.LocationAt(pts, Rel(c.Date));
                    return new TelemetrySample
                    {
                        SessionKey = sessionKey, DriverNumber = lap.DriverNumber, Seq = i, LapNumber = lap.LapNumber,
                        OffsetMs = (int)(c.Date - from).TotalMilliseconds, DistanceM = Math.Round(dist[i], 1),
                        Speed = c.Speed, Throttle = Math.Clamp(c.Throttle, 0, 100), Brake = c.Brake > 0, Gear = c.NGear,
                        Drs = c.Drs >= 10, X = loc?.X, Y = loc?.Y,
                    };
                }).ToList();
            }).ToList();
        var telemetry = (await Task.WhenAll(telemetryTasks)).SelectMany(t => t).ToList();

        var meeting = meetingTask.Result.FirstOrDefault();
        var frames = locations.SelectMany(kv =>
            RaceMath.Resample(kv.Value, windowStart, FrameStepMs, frameCount)
                .Select((f, i) => (f, i))
                .Where(x => x.f is not null)
                .Select(x => new LocationFrame { SessionKey = sessionKey, DriverNumber = kv.Key, Index = x.i, X = x.f!.Value.X, Y = x.f!.Value.Y }))
            .ToList();

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await Purge(sessionKey, ct);
        db.ChangeTracker.AutoDetectChangesEnabled = false;

        db.Sessions.Add(new RaceSession
        {
            SessionKey = sessionKey, MeetingKey = session.MeetingKey, Year = session.Year,
            Name = meeting?.MeetingName ?? $"{session.CountryName} Grand Prix",
            Country = session.CountryName ?? "", Circuit = session.CircuitShortName ?? "",
            RaceStartUtc = raceStart, WindowStartMs = windowStart, WindowEndMs = windowEnd, FrameStepMs = FrameStepMs,
            TotalLaps = laps.Max(l => l.LapNumber), IngestedAt = DateTimeOffset.UtcNow,
        });
        db.Drivers.AddRange(drivers.Select(d => new Driver
        {
            SessionKey = sessionKey, Number = d.DriverNumber, Acronym = d.NameAcronym ?? d.DriverNumber.ToString(),
            FullName = Title(d.FirstName, d.LastName, d.FullName), Team = d.TeamName ?? "", Colour = d.TeamColour ?? "888888",
            HeadshotUrl = d.HeadshotUrl,
        }));
        db.Laps.AddRange(laps.DistinctBy(l => (l.DriverNumber, l.LapNumber)).Select(l => new Lap
        {
            SessionKey = sessionKey, DriverNumber = l.DriverNumber, LapNumber = l.LapNumber, DateStart = l.DateStart,
            Duration = l.LapDuration, S1 = l.DurationSector1, S2 = l.DurationSector2, S3 = l.DurationSector3,
            PitOut = l.IsPitOutLap == true,
        }));
        db.Stints.AddRange(stintsTask.Result.DistinctBy(s => (s.DriverNumber, s.StintNumber)).Select(s => new Stint
        {
            SessionKey = sessionKey, DriverNumber = s.DriverNumber, StintNumber = s.StintNumber,
            Compound = s.Compound ?? "UNKNOWN", LapStart = s.LapStart ?? 1, LapEnd = s.LapEnd ?? s.LapStart ?? 1,
            TyreAgeAtStart = s.TyreAgeAtStart ?? 0,
        }));
        db.PitStops.AddRange(pitsTask.Result.Select(p => new PitStop
        {
            SessionKey = sessionKey, DriverNumber = p.DriverNumber, LapNumber = p.LapNumber ?? 0, Date = p.Date,
            LaneDuration = p.LaneDuration ?? p.PitDuration, StopDuration = p.StopDuration,
        }));
        db.RaceControl.AddRange(rcTask.Result.Select(m => new RaceControlMessage
        {
            SessionKey = sessionKey, Date = m.Date, LapNumber = m.LapNumber, Category = m.Category ?? "",
            Flag = m.Flag, Scope = m.Scope, Message = m.Message ?? "", DriverNumber = m.DriverNumber,
        }));
        db.Positions.AddRange(posTask.Result.Select(p => new PositionChange
        {
            SessionKey = sessionKey, DriverNumber = p.DriverNumber, Date = p.Date, Position = p.Position,
        }));
        db.LocationFrames.AddRange(frames);
        db.Telemetry.AddRange(telemetry);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        db.ChangeTracker.Clear();
        log.LogInformation("Session {Session} cached: {Frames} frames, {Telemetry} telemetry samples", sessionKey, frames.Count, telemetry.Count);
    }

    private async Task Purge(int s, CancellationToken ct)
    {
        await db.Telemetry.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.LocationFrames.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.Positions.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.RaceControl.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.PitStops.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.Stints.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.Laps.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.Drivers.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
        await db.Sessions.Where(x => x.SessionKey == s).ExecuteDeleteAsync(ct);
    }

    private static string Title(string? first, string? last, string? full) =>
        first is not null && last is not null ? $"{first} {last}" : full ?? "";
}
