using F1PitWall.Api.Auth;
using F1PitWall.Api.Ingestion;
using F1PitWall.Api.Queries;

namespace F1PitWall.Api.Endpoints;

public static class RaceEndpoints
{
    public static IEndpointRouteBuilder MapRaceEndpoints(this IEndpointRouteBuilder app)
    {
        var races = app.MapGroup("/api/races").WithTags("Races").RequireAuthorization(AuthSetup.Viewer);

        races.MapGet("/", (RaceQueries q, CancellationToken ct) => q.ListRaces(ct))
            .WithSummary("Cached races with summary and track outline");

        races.MapGet("/{key:int}", async (int key, RaceQueries q, CancellationToken ct) =>
                await q.Bundle(key, ct) is { } bundle ? Results.Ok(bundle) : Results.NotFound())
            .WithSummary("Everything the race page needs except car positions");

        races.MapGet("/{key:int}/replay", async (int key, RaceQueries q, CancellationToken ct) =>
                await q.Replay(key, ct) is { } replay ? Results.Ok(replay) : Results.NotFound())
            .WithSummary("Car positions on a fixed time grid");

        races.MapGet("/{key:int}/telemetry", (int key, RaceQueries q, CancellationToken ct) => q.TelemetryDrivers(key, ct))
            .WithSummary("Drivers with fastest-lap telemetry")
            .RequireAuthorization(AuthSetup.Strategist);

        races.MapGet("/{key:int}/telemetry/{driver:int}", async (int key, int driver, RaceQueries q, CancellationToken ct) =>
                await q.Telemetry(key, driver, ct) is { } telemetry ? Results.Ok(telemetry) : Results.NotFound())
            .WithSummary("Fastest-lap telemetry by distance")
            .RequireAuthorization(AuthSetup.Strategist);

        races.MapPost("/{key:int}/ingest", async (int key, IngestionService ingest, CancellationToken ct) =>
            {
                await ingest.Ingest(key, ct);
                return Results.NoContent();
            })
            .WithSummary("Fetch a race from OpenF1 into the cache (takes minutes)")
            .RequireAuthorization(AuthSetup.Admin);

        return app;
    }
}
