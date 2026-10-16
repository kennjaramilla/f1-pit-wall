using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.IdentityModel.Tokens;

namespace F1PitWall.Api.Tests;

public class AuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private const string Secret = "test-secret-that-is-at-least-32-characters-long";
    private readonly HttpClient _client;

    public AuthorizationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(b => b
            .UseSetting("Auth:Secret", Secret)
            .UseSetting("Database:Path", Path.Combine(Path.GetTempPath(), $"pitwall-test-{Guid.NewGuid()}.db")))
            .CreateClient();
    }

    private static string Token(string role, string secret = Secret) =>
        new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: "pit-wall", audience: "pit-wall-api",
            claims: [new Claim("sub", "u-test"), new Claim("role", role)],
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256)));

    private Task<HttpResponseMessage> Get(string url, string? token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return _client.SendAsync(request);
    }

    [Fact]
    public async Task Anonymous_requests_are_rejected_with_401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Get("/api/races", null)).StatusCode);
    }

    [Fact]
    public async Task Tokens_signed_with_another_key_are_rejected()
    {
        var response = await Get("/api/races", Token("Admin", "some-other-secret-that-is-32-characters-long"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Viewers_can_list_races_but_not_read_telemetry()
    {
        Assert.Equal(HttpStatusCode.OK, (await Get("/api/races", Token("Viewer"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Get("/api/races/9839/telemetry/1", Token("Viewer"))).StatusCode);
    }

    [Fact]
    public async Task Strategists_pass_the_telemetry_policy()
    {
        // 404 rather than 403: authorised, the race just isn't in this empty test database.
        Assert.Equal(HttpStatusCode.NotFound, (await Get("/api/races/9839/telemetry/1", Token("Strategist"))).StatusCode);
    }
}
