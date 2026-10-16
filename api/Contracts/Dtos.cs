namespace F1PitWall.Api.Contracts;

// All times are milliseconds relative to the race start (lights out).

public record RaceSummaryDto(
    int SessionKey, int Year, string Name, string Country, string Circuit, DateTimeOffset RaceStartUtc,
    int TotalLaps, WinnerDto? Winner, int[][] Outline);

public record WinnerDto(int Number, string Acronym, string FullName, string Team, string Colour);

public record DriverDto(int Number, string Acronym, string FullName, string Team, string Colour, string? HeadshotUrl);

public record LapDto(int Driver, int Lap, long? T, long? DurationMs, double? S1, double? S2, double? S3, bool PitOut);

public record StintDto(int Driver, int Stint, string Compound, int LapStart, int LapEnd, int TyreAgeAtStart);

public record PitDto(int Driver, int Lap, long T, double? LaneDuration, double? StopDuration);

public record PositionDto(int Driver, long T, int Position);

public record EventDto(long T, int? Lap, string Kind, string Message, int? Driver);

public record PeriodDto(string Kind, long StartMs, long EndMs);

public record LapStartDto(int Lap, long T);

public record DriverGapsDto(int Driver, double?[] Gaps);

public record FastestLapDto(int Driver, int Lap, long DurationMs);

public record ClassificationDto(int Position, int Driver, int LapsCompleted, string Status);

public record RaceBundleDto(
    RaceSummaryDto Race,
    long WindowStartMs,
    long WindowEndMs,
    DriverDto[] Drivers,
    LapStartDto[] LapStarts,
    LapDto[] Laps,
    StintDto[] Stints,
    PitDto[] Pits,
    PositionDto[] Positions,
    EventDto[] Events,
    PeriodDto[] Periods,
    DriverGapsDto[] Gaps,
    FastestLapDto[] FastestLaps,
    ClassificationDto[] Classification);

/// Frames on a fixed grid; Xy is interleaved [x0, y0, x1, y1, ...] with nulls where the car has no data.
public record ReplayDto(long StartMs, int StepMs, int FrameCount, int[][] Outline, ReplayDriverDto[] Drivers);

public record ReplayDriverDto(int Driver, int?[] Xy);

public record TelemetryPointDto(double D, int Speed, int Throttle, bool Brake, int Gear, bool Drs, int? X, int? Y);

public record TelemetryDto(int Driver, int Lap, long LapTimeMs, TelemetryPointDto[] Points);
