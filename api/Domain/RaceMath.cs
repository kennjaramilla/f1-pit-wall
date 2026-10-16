namespace F1PitWall.Api.Domain;

public readonly record struct TimedPoint(long T, int X, int Y);

public readonly record struct LapTiming(int Lap, long? StartMs, long? DurationMs);

public record TrackPeriod(string Kind, long StartMs, long EndMs);

public static class RaceMath
{
    /// Linear resample onto a fixed grid; frames bridging a gap wider than maxGapMs stay null.
    public static (int X, int Y)?[] Resample(IReadOnlyList<TimedPoint> pts, long startMs, int stepMs, int count, long maxGapMs = 4000)
    {
        var frames = new (int X, int Y)?[count];
        if (pts.Count == 0) return frames;
        var j = 0;
        for (var i = 0; i < count; i++)
        {
            var t = startMs + (long)i * stepMs;
            while (j < pts.Count - 2 && pts[j + 1].T <= t) j++;
            var a = pts[j];
            var b = pts[Math.Min(j + 1, pts.Count - 1)];
            if (t == a.T) { frames[i] = (a.X, a.Y); continue; }
            if (t < a.T || t > b.T) continue;
            if (b.T - a.T > maxGapMs) continue;
            if (b.T == a.T) { frames[i] = (a.X, a.Y); continue; }
            var f = (double)(t - a.T) / (b.T - a.T);
            frames[i] = ((int)Math.Round(a.X + (b.X - a.X) * f), (int)Math.Round(a.Y + (b.Y - a.Y) * f));
        }
        return frames;
    }

    /// Time (ms from race start) each driver crosses the line at the end of each lap.
    public static SortedDictionary<int, long> Crossings(IEnumerable<LapTiming> laps)
    {
        var byLap = laps.OrderBy(l => l.Lap).ToList();
        var result = new SortedDictionary<int, long>();
        for (var i = 0; i < byLap.Count; i++)
        {
            var l = byLap[i];
            var next = i + 1 < byLap.Count && byLap[i + 1].Lap == l.Lap + 1 ? byLap[i + 1].StartMs : null;
            long? end = next ?? (l.StartMs is { } s && l.DurationMs is { } d ? s + d : null);
            if (end is { } e) result[l.Lap] = e;
        }
        return result;
    }

    /// Gap to the leader (seconds) at the end of each lap; index 0 = lap 1. Null when the lap wasn't completed.
    public static Dictionary<int, double?[]> GapsToLeader(IReadOnlyDictionary<int, SortedDictionary<int, long>> crossings, int totalLaps)
    {
        var leaderTimes = new long?[totalLaps];
        for (var lap = 1; lap <= totalLaps; lap++)
        {
            foreach (var c in crossings.Values)
            {
                if (c.TryGetValue(lap, out var t) && (leaderTimes[lap - 1] is null || t < leaderTimes[lap - 1]))
                    leaderTimes[lap - 1] = t;
            }
        }

        return crossings.ToDictionary(kv => kv.Key, kv =>
        {
            var gaps = new double?[totalLaps];
            for (var lap = 1; lap <= totalLaps; lap++)
            {
                if (kv.Value.TryGetValue(lap, out var t) && leaderTimes[lap - 1] is { } lt)
                    gaps[lap - 1] = Math.Round((t - lt) / 1000.0, 3);
            }
            return gaps;
        });
    }

    /// Safety car / VSC / red flag periods from race control messages (ms relative to race start).
    public static List<TrackPeriod> TrackPeriods(IEnumerable<(long T, string Category, string? Flag, string? Scope, string Message)> msgs, long raceEndMs)
    {
        var periods = new List<TrackPeriod>();
        string? open = null;
        long openAt = 0;

        void Close(long t)
        {
            if (open is null) return;
            periods.Add(new TrackPeriod(open, openAt, Math.Max(t, openAt)));
            open = null;
        }

        foreach (var m in msgs.OrderBy(m => m.T))
        {
            var msg = m.Message.ToUpperInvariant();
            string? starts = null;
            if (m.Flag == "RED") starts = "red";
            else if (m.Category == "SafetyCar" && msg.Contains("VIRTUAL SAFETY CAR DEPLOYED")) starts = "vsc";
            else if (m.Category == "SafetyCar" && msg.Contains("SAFETY CAR DEPLOYED")) starts = "sc";

            if (starts is not null)
            {
                if (open != starts) { Close(m.T); open = starts; openAt = m.T; }
                continue;
            }

            var trackClear = m.Flag is "GREEN" or "CLEAR" && m.Scope == "Track";
            var vscEnding = open == "vsc" && msg.Contains("VIRTUAL SAFETY CAR ENDING");
            if (trackClear || vscEnding) Close(m.T);
        }
        Close(raceEndMs);
        return periods;
    }

    /// Cumulative distance (m) from speed samples (km/h) via trapezoidal integration.
    public static double[] Distance(IReadOnlyList<(long T, int SpeedKph)> samples)
    {
        var d = new double[samples.Count];
        for (var i = 1; i < samples.Count; i++)
        {
            var dt = (samples[i].T - samples[i - 1].T) / 1000.0;
            var v = (samples[i].SpeedKph + samples[i - 1].SpeedKph) / 2.0 / 3.6;
            d[i] = d[i - 1] + v * dt;
        }
        return d;
    }

    /// Location at an arbitrary time by linear interpolation of the nearest points.
    public static (int X, int Y)? LocationAt(IReadOnlyList<TimedPoint> pts, long t)
    {
        if (pts.Count == 0) return null;
        int lo = 0, hi = pts.Count - 1;
        if (t <= pts[0].T) return (pts[0].X, pts[0].Y);
        if (t >= pts[hi].T) return (pts[hi].X, pts[hi].Y);
        while (hi - lo > 1)
        {
            var mid = (lo + hi) / 2;
            if (pts[mid].T <= t) lo = mid; else hi = mid;
        }
        var a = pts[lo]; var b = pts[hi];
        var f = b.T == a.T ? 0 : (double)(t - a.T) / (b.T - a.T);
        return ((int)Math.Round(a.X + (b.X - a.X) * f), (int)Math.Round(a.Y + (b.Y - a.Y) * f));
    }
}
