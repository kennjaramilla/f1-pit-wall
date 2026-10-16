using Microsoft.EntityFrameworkCore;

namespace F1PitWall.Api.Data;

public class PitWallDb(DbContextOptions<PitWallDb> options) : DbContext(options)
{
    public DbSet<RaceSession> Sessions => Set<RaceSession>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Lap> Laps => Set<Lap>();
    public DbSet<Stint> Stints => Set<Stint>();
    public DbSet<PitStop> PitStops => Set<PitStop>();
    public DbSet<RaceControlMessage> RaceControl => Set<RaceControlMessage>();
    public DbSet<PositionChange> Positions => Set<PositionChange>();
    public DbSet<LocationFrame> LocationFrames => Set<LocationFrame>();
    public DbSet<TelemetrySample> Telemetry => Set<TelemetrySample>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<RaceSession>().HasKey(s => s.SessionKey);
        b.Entity<RaceSession>().Property(s => s.SessionKey).ValueGeneratedNever();
        b.Entity<Driver>().HasKey(d => new { d.SessionKey, d.Number });
        b.Entity<Lap>().HasKey(l => new { l.SessionKey, l.DriverNumber, l.LapNumber });
        b.Entity<Stint>().HasKey(s => new { s.SessionKey, s.DriverNumber, s.StintNumber });
        b.Entity<PitStop>().HasIndex(p => p.SessionKey);
        b.Entity<RaceControlMessage>().HasIndex(m => m.SessionKey);
        b.Entity<PositionChange>().HasIndex(p => p.SessionKey);
        b.Entity<LocationFrame>().HasKey(f => new { f.SessionKey, f.DriverNumber, f.Index });
        b.Entity<TelemetrySample>().HasKey(t => new { t.SessionKey, t.DriverNumber, t.Seq });
    }
}

public class RaceSession
{
    public int SessionKey { get; set; }
    public int MeetingKey { get; set; }
    public int Year { get; set; }
    public string Name { get; set; } = "";
    public string Country { get; set; } = "";
    public string Circuit { get; set; } = "";
    public DateTimeOffset RaceStartUtc { get; set; }
    // Replay window, in ms relative to race start.
    public long WindowStartMs { get; set; }
    public long WindowEndMs { get; set; }
    public int FrameStepMs { get; set; }
    public int TotalLaps { get; set; }
    public DateTimeOffset IngestedAt { get; set; }
}

public class Driver
{
    public int SessionKey { get; set; }
    public int Number { get; set; }
    public string Acronym { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Team { get; set; } = "";
    public string Colour { get; set; } = "888888";
    public string? HeadshotUrl { get; set; }
}

public class Lap
{
    public int SessionKey { get; set; }
    public int DriverNumber { get; set; }
    public int LapNumber { get; set; }
    public DateTimeOffset? DateStart { get; set; }
    public double? Duration { get; set; }
    public double? S1 { get; set; }
    public double? S2 { get; set; }
    public double? S3 { get; set; }
    public bool PitOut { get; set; }
}

public class Stint
{
    public int SessionKey { get; set; }
    public int DriverNumber { get; set; }
    public int StintNumber { get; set; }
    public string Compound { get; set; } = "UNKNOWN";
    public int LapStart { get; set; }
    public int LapEnd { get; set; }
    public int TyreAgeAtStart { get; set; }
}

public class PitStop
{
    public int Id { get; set; }
    public int SessionKey { get; set; }
    public int DriverNumber { get; set; }
    public int LapNumber { get; set; }
    public DateTimeOffset Date { get; set; }
    public double? LaneDuration { get; set; }
    public double? StopDuration { get; set; }
}

public class RaceControlMessage
{
    public int Id { get; set; }
    public int SessionKey { get; set; }
    public DateTimeOffset Date { get; set; }
    public int? LapNumber { get; set; }
    public string Category { get; set; } = "";
    public string? Flag { get; set; }
    public string? Scope { get; set; }
    public string Message { get; set; } = "";
    public int? DriverNumber { get; set; }
}

public class PositionChange
{
    public int Id { get; set; }
    public int SessionKey { get; set; }
    public int DriverNumber { get; set; }
    public DateTimeOffset Date { get; set; }
    public int Position { get; set; }
}

// Location resampled onto a fixed time grid: frame Index -> WindowStartMs + Index * FrameStepMs.
public class LocationFrame
{
    public int SessionKey { get; set; }
    public int DriverNumber { get; set; }
    public int Index { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
}

// Car telemetry for each driver's fastest lap only.
public class TelemetrySample
{
    public int SessionKey { get; set; }
    public int DriverNumber { get; set; }
    public int Seq { get; set; }
    public int LapNumber { get; set; }
    public int OffsetMs { get; set; }
    public double DistanceM { get; set; }
    public int Speed { get; set; }
    public int Throttle { get; set; }
    public bool Brake { get; set; }
    public int Gear { get; set; }
    public bool Drs { get; set; }
    public int? X { get; set; }
    public int? Y { get; set; }
}
