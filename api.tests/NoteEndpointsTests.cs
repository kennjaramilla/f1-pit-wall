using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using F1PitWall.Api.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace F1PitWall.Api.Tests;

public class NoteEndpointsTests : IDisposable
{
    private const string Secret = "test-secret-that-is-at-least-32-characters-long";
    private const int Race = 9839;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public NoteEndpointsTests()
    {
        var dir = Path.Combine(Path.GetTempPath(), $"pitwall-notes-{Guid.NewGuid()}");
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b
            .UseSetting("Auth:Secret", Secret)
            .UseSetting("Database:Path", Path.Combine(dir, "pitwall.db"))
            .UseSetting("Database:NotesPath", Path.Combine(dir, "notes.db")));
        _client = _factory.CreateClient();
        using var scope = _factory.Services.CreateScope();
        var races = scope.ServiceProvider.GetRequiredService<PitWallDb>();
        races.Sessions.Add(new RaceSession { SessionKey = Race, Name = "Test GP", TotalLaps = 57 });
        races.SaveChanges();
    }

    public void Dispose() => _factory.Dispose();

    private static string Token(string role, string sub) =>
        new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: "pit-wall", audience: "pit-wall-api",
            claims: [new Claim("sub", sub), new Claim("role", role)],
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)), SecurityAlgorithms.HmacSha256)));

    private Task<HttpResponseMessage> Send(HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null) request.Content = JsonContent.Create(body);
        return _client.SendAsync(request);
    }

    private static readonly string Ana = Token("Strategist", "u-ana");
    private static readonly string Ben = Token("Strategist", "u-ben");
    private static readonly string Viewer = Token("Viewer", "u-vic");
    private static readonly string Admin = Token("Admin", "u-admin");

    private static object Note(string title = "Undercut window", int lap = 18) =>
        new { title, body = "Box this lap if the gap holds.", category = "Strategy", lap };

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<string> CreateAs(string token, object? note = null)
    {
        var response = await Send(HttpMethod.Post, $"/api/races/{Race}/notes", token, note ?? Note());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetString()!;
    }

    [Fact]
    public async Task A_strategist_adds_notes_and_lists_them_in_lap_order()
    {
        await CreateAs(Ana, Note("Safety car", 40));
        var id = await CreateAs(Ana, Note("Undercut window", 18));

        var list = await Json(await Send(HttpMethod.Get, $"/api/races/{Race}/notes", Ana));
        Assert.Equal(["Undercut window", "Safety car"], list.EnumerateArray().Select(n => n.GetProperty("title").GetString()));

        var one = await Send(HttpMethod.Get, $"/api/notes/{id}", Ana);
        Assert.Equal(HttpStatusCode.OK, one.StatusCode);
        Assert.Equal(18, (await Json(one)).GetProperty("lap").GetInt32());
    }

    [Fact]
    public async Task Other_users_notes_are_404_never_403()
    {
        var id = await CreateAs(Ana);

        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Get, $"/api/notes/{id}", Ben)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Patch, $"/api/notes/{id}", Ben, new { title = "Mine now" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Delete, $"/api/notes/{id}", Ben)).StatusCode);
        Assert.Empty((await Json(await Send(HttpMethod.Get, $"/api/races/{Race}/notes", Ben))).EnumerateArray());
        Assert.Equal("Undercut window", (await Json(await Send(HttpMethod.Get, $"/api/notes/{id}", Ana))).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Viewers_can_read_their_own_list_but_not_write()
    {
        Assert.Equal(HttpStatusCode.OK, (await Send(HttpMethod.Get, $"/api/races/{Race}/notes", Viewer)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(HttpMethod.Post, $"/api/races/{Race}/notes", Viewer, Note())).StatusCode);
    }

    [Fact]
    public async Task Invalid_notes_get_field_errors_and_unknown_races_404()
    {
        var response = await Send(HttpMethod.Post, $"/api/races/{Race}/notes", Ana,
            new { title = " ", body = new string('x', 501), category = "Weather", lap = 58 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal(["body", "category", "lap", "title"], errors.EnumerateObject().Select(e => e.Name).Order());
        Assert.Equal("Lap must be between 1 and 57.", errors.GetProperty("lap")[0].GetString());

        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Post, "/api/races/1/notes", Ana, Note())).StatusCode);
    }

    [Fact]
    public async Task Patch_changes_only_the_fields_sent()
    {
        var id = await CreateAs(Ana);
        var response = await Send(HttpMethod.Patch, $"/api/notes/{id}", Ana, new { lap = 20 });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var note = await Json(response);
        Assert.Equal(20, note.GetProperty("lap").GetInt32());
        Assert.Equal("Undercut window", note.GetProperty("title").GetString());

        Assert.Equal(HttpStatusCode.BadRequest, (await Send(HttpMethod.Patch, $"/api/notes/{id}", Ana, new { title = "" })).StatusCode);
    }

    [Fact]
    public async Task Deleted_notes_leave_lists_but_stay_in_the_export_until_erased()
    {
        var id = await CreateAs(Ana);
        await CreateAs(Ana, Note("Tyre cliff", 30));
        await CreateAs(Ben);
        Assert.Equal(HttpStatusCode.NoContent, (await Send(HttpMethod.Delete, $"/api/notes/{id}", Ana)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(HttpMethod.Get, $"/api/notes/{id}", Ana)).StatusCode);
        Assert.Single((await Json(await Send(HttpMethod.Get, $"/api/races/{Race}/notes", Ana))).EnumerateArray());

        var export = await Json(await Send(HttpMethod.Get, "/api/me/export", Ana));
        Assert.Equal("u-ana", export.GetProperty("userId").GetString());
        var notes = export.GetProperty("notes").EnumerateArray().ToList();
        Assert.Equal(2, notes.Count);
        Assert.Single(notes, n => n.GetProperty("deletedAt").ValueKind != JsonValueKind.Null);

        var stats = await Json(await Send(HttpMethod.Get, "/api/admin/notes/stats", Admin));
        Assert.Equal((2, 2, 1), (stats.GetProperty("authors").GetInt32(), stats.GetProperty("liveNotes").GetInt32(), stats.GetProperty("deletedNotes").GetInt32()));

        var erased = await Json(await Send(HttpMethod.Delete, "/api/me/notes", Ana));
        Assert.Equal(2, erased.GetProperty("deleted").GetInt32());
        Assert.Empty((await Json(await Send(HttpMethod.Get, "/api/me/export", Ana))).GetProperty("notes").EnumerateArray());
        Assert.Single((await Json(await Send(HttpMethod.Get, $"/api/races/{Race}/notes", Ben))).EnumerateArray());
    }

    [Fact]
    public async Task Only_admins_see_note_volumes_and_never_content()
    {
        await CreateAs(Ana);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(HttpMethod.Get, "/api/admin/notes/stats", Ana)).StatusCode);
        var body = await (await Send(HttpMethod.Get, "/api/admin/notes/stats", Admin)).Content.ReadAsStringAsync();
        Assert.DoesNotContain("Undercut", body);
        Assert.DoesNotContain("u-ana", body);
    }
}
