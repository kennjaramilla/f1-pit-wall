using System.Security.Claims;
using F1PitWall.Api.Auth;
using F1PitWall.Api.Contracts;
using F1PitWall.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace F1PitWall.Api.Endpoints;

/// Private race notes. Every lookup is scoped to the caller, so another user's note is a 404:
/// the API never confirms that someone else's note exists.
public static class NoteEndpoints
{
    public static IEndpointRouteBuilder MapNoteEndpoints(this IEndpointRouteBuilder app)
    {
        var race = app.MapGroup("/api/races/{key:int}/notes").WithTags("Race notes");
        race.MapGet("/", List).RequireAuthorization(AuthSetup.Viewer)
            .WithSummary("My live notes for a race, in lap order");
        race.MapPost("/", Create).RequireAuthorization(AuthSetup.Strategist)
            .WithSummary("Add a note to a race");

        var notes = app.MapGroup("/api/notes").WithTags("Race notes");
        notes.MapGet("/{id:guid}", Get).RequireAuthorization(AuthSetup.Viewer)
            .WithSummary("One of my notes");
        notes.MapPatch("/{id:guid}", Update).RequireAuthorization(AuthSetup.Strategist)
            .WithSummary("Change the fields sent");
        notes.MapDelete("/{id:guid}", Delete).RequireAuthorization(AuthSetup.Strategist)
            .WithSummary("Soft-delete one of my notes");

        var me = app.MapGroup("/api/me").WithTags("My data").RequireAuthorization(AuthSetup.Viewer);
        me.MapGet("/export", Export).WithSummary("Download everything stored about me, deleted notes included");
        me.MapDelete("/notes", Erase).WithSummary("Permanently erase all my notes");

        app.MapGet("/api/admin/notes/stats", Stats).WithTags("Admin").RequireAuthorization(AuthSetup.Admin)
            .WithSummary("Note volumes, never content or authors");
        return app;
    }

    private static string Owner(ClaimsPrincipal user) =>
        user.FindFirstValue("sub") ?? throw new InvalidOperationException("Validated tokens always carry sub.");

    private static IQueryable<RaceNote> Mine(NotesDb db, ClaimsPrincipal user, bool includeDeleted = false)
    {
        var owner = Owner(user);
        var notes = db.Notes.Where(n => n.OwnerId == owner);
        return includeDeleted ? notes : notes.Where(n => n.DeletedAt == null);
    }

    private static NoteDto ToDto(RaceNote n) =>
        new(n.Id, n.RaceKey, n.Title, n.Body, n.Category, n.Lap, n.CreatedAt, n.UpdatedAt);

    // SQLite can't ORDER BY DateTimeOffset, and a user's notes are few, so sort in memory.
    private static IEnumerable<RaceNote> Ordered(IEnumerable<RaceNote> notes) =>
        notes.OrderBy(n => n.RaceKey).ThenBy(n => n.Lap).ThenBy(n => n.CreatedAt);

    private static async Task<IResult> List(int key, ClaimsPrincipal user, NotesDb db, CancellationToken ct)
    {
        var notes = await Mine(db, user).Where(n => n.RaceKey == key).ToListAsync(ct);
        return Results.Ok(Ordered(notes).Select(ToDto));
    }

    private static async Task<IResult> Get(Guid id, ClaimsPrincipal user, NotesDb db, CancellationToken ct) =>
        await Mine(db, user).FirstOrDefaultAsync(n => n.Id == id, ct) is { } note
            ? Results.Ok(ToDto(note))
            : Results.NotFound();

    private static async Task<IResult> Create(
        int key, NoteInput input, ClaimsPrincipal user, NotesDb db, PitWallDb races, TimeProvider clock, CancellationToken ct)
    {
        if (await races.Sessions.FindAsync([key], ct) is not { } race) return Results.NotFound();
        var errors = Validate(input with { Body = input.Body ?? "" }, race.TotalLaps, partial: false);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var now = clock.GetUtcNow();
        var note = new RaceNote
        {
            Id = Guid.CreateVersion7(),
            OwnerId = Owner(user),
            RaceKey = key,
            Title = input.Title!.Trim(),
            Body = input.Body ?? "",
            Category = input.Category!,
            Lap = input.Lap!.Value,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Notes.Add(note);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/notes/{note.Id}", ToDto(note));
    }

    private static async Task<IResult> Update(
        Guid id, NoteInput input, ClaimsPrincipal user, NotesDb db, PitWallDb races, TimeProvider clock, CancellationToken ct)
    {
        if (await Mine(db, user).FirstOrDefaultAsync(n => n.Id == id, ct) is not { } note) return Results.NotFound();
        // If the race left the cache, any positive lap is accepted rather than blocking edits.
        var totalLaps = (await races.Sessions.FindAsync([note.RaceKey], ct))?.TotalLaps ?? int.MaxValue;
        var errors = Validate(input, totalLaps, partial: true);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        if (input.Title is not null) note.Title = input.Title.Trim();
        if (input.Body is not null) note.Body = input.Body;
        if (input.Category is not null) note.Category = input.Category;
        if (input.Lap is not null) note.Lap = input.Lap.Value;
        note.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.Ok(ToDto(note));
    }

    private static async Task<IResult> Delete(Guid id, ClaimsPrincipal user, NotesDb db, TimeProvider clock, CancellationToken ct)
    {
        if (await Mine(db, user).FirstOrDefaultAsync(n => n.Id == id, ct) is not { } note) return Results.NotFound();
        note.DeletedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Export(ClaimsPrincipal user, NotesDb db, TimeProvider clock, CancellationToken ct)
    {
        var notes = await Mine(db, user, includeDeleted: true).ToListAsync(ct);
        var rows = Ordered(notes)
            .Select(n => new NoteExportDto(n.Id, n.RaceKey, n.Title, n.Body, n.Category, n.Lap, n.CreatedAt, n.UpdatedAt, n.DeletedAt))
            .ToList();
        return Results.Ok(new NotesExportDto(Owner(user), clock.GetUtcNow(), rows));
    }

    private static async Task<IResult> Erase(ClaimsPrincipal user, NotesDb db, CancellationToken ct)
    {
        var deleted = await Mine(db, user, includeDeleted: true).ExecuteDeleteAsync(ct);
        return Results.Ok(new { deleted });
    }

    private static async Task<IResult> Stats(NotesDb db, CancellationToken ct) =>
        Results.Ok(new NoteStatsDto(
            await db.Notes.Select(n => n.OwnerId).Distinct().CountAsync(ct),
            await db.Notes.CountAsync(n => n.DeletedAt == null, ct),
            await db.Notes.CountAsync(n => n.DeletedAt != null, ct)));

    /// Same rules as the web form (web/src/lib/notes.ts). `partial` skips fields that weren't sent.
    internal static Dictionary<string, string[]> Validate(NoteInput input, int totalLaps, bool partial)
    {
        var errors = new Dictionary<string, string[]>();
        if (!partial || input.Title is not null)
        {
            var title = input.Title?.Trim() ?? "";
            if (title.Length == 0) errors["title"] = ["Title is required."];
            else if (title.Length > RaceNote.TitleMax) errors["title"] = [$"Title must be {RaceNote.TitleMax} characters or fewer."];
        }
        if (input.Body is { Length: > RaceNote.BodyMax })
            errors["body"] = [$"Note must be {RaceNote.BodyMax} characters or fewer."];
        if ((!partial || input.Category is not null) && !RaceNote.Categories.Contains(input.Category))
            errors["category"] = ["Choose a category."];
        if ((!partial || input.Lap is not null) && (input.Lap is not { } lap || lap < 1 || lap > totalLaps))
            errors["lap"] = [totalLaps == int.MaxValue ? "Lap must be 1 or more." : $"Lap must be between 1 and {totalLaps}."];
        return errors;
    }
}
