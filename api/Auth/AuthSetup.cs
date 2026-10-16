using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace F1PitWall.Api.Auth;

/// Validates the HS256 session token issued by the web app (same secret, issuer and audience).
public static class AuthSetup
{
    public const string Viewer = nameof(Viewer);
    public const string Strategist = nameof(Strategist);
    public const string Admin = nameof(Admin);

    public static IServiceCollection AddPitWallAuth(this IServiceCollection services, IConfiguration config)
    {
        var secret = config["Auth:Secret"];
        if (string.IsNullOrEmpty(secret) || secret.Length < 32)
            throw new InvalidOperationException("Auth:Secret must be configured (32+ characters).");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.MapInboundClaims = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = config["Auth:Issuer"] ?? "pit-wall",
                    ValidAudience = config["Auth:Audience"] ?? "pit-wall-api",
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    RoleClaimType = "role",
                    NameClaimType = "name",
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        // Roles are hierarchical: each policy also admits the roles above it.
        services.AddAuthorizationBuilder()
            .AddPolicy(Viewer, p => p.RequireRole(Viewer, Strategist, Admin))
            .AddPolicy(Strategist, p => p.RequireRole(Strategist, Admin))
            .AddPolicy(Admin, p => p.RequireRole(Admin));
        return services;
    }
}
