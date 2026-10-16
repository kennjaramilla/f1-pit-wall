namespace F1PitWall.Api.OpenF1;

// Raw OpenF1 rows. Property names map via snake_case naming policy.

public record OfSession(
    int SessionKey, int MeetingKey, int Year, string SessionName, string? CountryName,
    string? CircuitShortName, string? Location, DateTimeOffset DateStart, DateTimeOffset? DateEnd);

public record OfMeeting(int MeetingKey, string MeetingName, string? CountryName, string? CircuitShortName);

public record OfDriver(
    int DriverNumber, string? NameAcronym, string? FullName, string? FirstName, string? LastName,
    string? TeamName, string? TeamColour, string? HeadshotUrl);

public record OfLap(
    int DriverNumber, int LapNumber, DateTimeOffset? DateStart, double? LapDuration,
    double? DurationSector1, double? DurationSector2, double? DurationSector3, bool? IsPitOutLap);

public record OfStint(int DriverNumber, int StintNumber, string? Compound, int? LapStart, int? LapEnd, int? TyreAgeAtStart);

public record OfPit(int DriverNumber, int? LapNumber, DateTimeOffset Date, double? LaneDuration, double? StopDuration, double? PitDuration);

public record OfRaceControl(
    DateTimeOffset Date, int? LapNumber, string? Category, string? Flag, string? Scope, string? Message, int? DriverNumber);

public record OfPosition(int DriverNumber, DateTimeOffset Date, int Position);

public record OfLocation(DateTimeOffset Date, int DriverNumber, int X, int Y, int Z);

public record OfCarData(DateTimeOffset Date, int DriverNumber, int Speed, int Throttle, int Brake, int NGear, int Drs);
