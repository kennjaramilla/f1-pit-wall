using System.Diagnostics;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace F1PitWall.Api.OpenF1;

public class OpenF1Client(HttpClient http, ILogger<OpenF1Client> log)
{
    public static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };

    // OpenF1 throttles bursts; cap concurrent requests across all client instances.
    private static readonly SemaphoreSlim Gate = new(3);

    /// Raw responses are cached here so re-ingesting a race never re-downloads it.
    public static string? CacheDir { get; set; }

    public Task<List<OfSession>> Sessions(int sessionKey) => Get<OfSession>($"sessions?session_key={sessionKey}");
    public Task<List<OfMeeting>> Meetings(int meetingKey) => Get<OfMeeting>($"meetings?meeting_key={meetingKey}");
    public Task<List<OfDriver>> Drivers(int s) => Get<OfDriver>($"drivers?session_key={s}");
    public Task<List<OfLap>> Laps(int s) => Get<OfLap>($"laps?session_key={s}");
    public Task<List<OfStint>> Stints(int s) => Get<OfStint>($"stints?session_key={s}");
    public Task<List<OfPit>> Pits(int s) => Get<OfPit>($"pit?session_key={s}");
    public Task<List<OfRaceControl>> RaceControl(int s) => Get<OfRaceControl>($"race_control?session_key={s}");
    public Task<List<OfPosition>> Positions(int s) => Get<OfPosition>($"position?session_key={s}");

    public Task<List<OfLocation>> Location(int s, int driver, DateTimeOffset from, DateTimeOffset to) =>
        Get<OfLocation>($"location?session_key={s}&driver_number={driver}{Range(from, to)}");

    public Task<List<OfCarData>> CarData(int s, int driver, DateTimeOffset from, DateTimeOffset to) =>
        Get<OfCarData>($"car_data?session_key={s}&driver_number={driver}{Range(from, to)}");

    private static string Range(DateTimeOffset from, DateTimeOffset to) =>
        $"&date%3E={Iso(from)}&date%3C={Iso(to)}";

    private static string Iso(DateTimeOffset d) =>
        d.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff", CultureInfo.InvariantCulture);

    private async Task<List<T>> Get<T>(string path)
    {
        var cacheFile = CacheDir is null ? null
            : Path.Combine(CacheDir, Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(path))) + ".json");
        if (cacheFile is not null && File.Exists(cacheFile))
            return JsonSerializer.Deserialize<List<T>>(await File.ReadAllBytesAsync(cacheFile), Json) ?? [];

        await Gate.WaitAsync();
        try
        {
            var sw = Stopwatch.StartNew();
            var bytes = await http.GetByteArrayAsync(path);
            if (cacheFile is not null) await File.WriteAllBytesAsync(cacheFile, bytes);
            var rows = JsonSerializer.Deserialize<List<T>>(bytes, Json) ?? [];
            log.LogInformation("GET {Path} -> {Count} rows in {Ms} ms", path, rows.Count, sw.ElapsedMilliseconds);
            return rows;
        }
        finally
        {
            Gate.Release();
        }
    }
}
