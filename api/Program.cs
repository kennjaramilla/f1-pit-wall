using System.Text.Json;
using F1PitWall.Api.Auth;
using F1PitWall.Api.Data;
using F1PitWall.Api.Endpoints;
using F1PitWall.Api.Ingestion;
using F1PitWall.Api.OpenF1;
using F1PitWall.Api.Queries;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var dbPath = builder.Configuration["Database:Path"] ?? Path.Combine(builder.Environment.ContentRootPath, "db", "pitwall.db");
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
OpenF1Client.CacheDir = builder.Configuration["OpenF1:CacheDir"] ?? Path.Combine(Path.GetDirectoryName(dbPath)!, "openf1-cache");
Directory.CreateDirectory(OpenF1Client.CacheDir);

builder.Services.AddDbContext<PitWallDb>(o => o.UseSqlite($"Data Source={dbPath}"));
builder.Services.AddScoped<IngestionService>();
builder.Services.AddScoped<RaceQueries>();
builder.Services.AddTransient<BufferContentHandler>();
var openF1 = builder.Services.AddHttpClient<OpenF1Client>(c => c.BaseAddress = new Uri(builder.Configuration["OpenF1:BaseUrl"] ?? "https://api.openf1.org/v1/"));
openF1.AddStandardResilienceHandler(o =>
    {
        // Location pulls are large and OpenF1 is slow under load; give each attempt room.
        o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(60);
        o.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(2);
        o.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(4);
    });
openF1.AddHttpMessageHandler<BufferContentHandler>(); // inner handler: runs inside each resilient attempt

builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);
builder.Services.AddPitWallAuth(builder.Configuration);
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks().AddDbContextCheck<PitWallDb>();
builder.Services.AddOpenApi();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins((builder.Configuration["Cors:Origins"] ?? "http://localhost:3000,http://localhost:3101").Split(','))
    .WithMethods("GET", "POST")
    .AllowAnyHeader()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<PitWallDb>().Database.EnsureCreated();

// CLI: `ingest <sessionKey...>` caches races; `export <dir>` writes the static snapshot for the web app.
if (args.FirstOrDefault() is "ingest" or "export")
{
    using var scope = app.Services.CreateScope();
    if (args[0] == "ingest")
        foreach (var key in args.Skip(1).Select(int.Parse))
            await scope.ServiceProvider.GetRequiredService<IngestionService>().Ingest(key);
    else
        await SnapshotExporter.Export(scope.ServiceProvider.GetRequiredService<RaceQueries>(), args.ElementAtOrDefault(1) ?? "../web/public/data");
    return;
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapOpenApi();
app.MapScalarApiReference("/docs");
app.MapGet("/", () => Results.Redirect("/docs")).ExcludeFromDescription();
app.MapHealthChecks("/health");
app.MapRaceEndpoints();

app.Run();

public partial class Program;
