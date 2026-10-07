using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace MesPlatform.Api.Tests.Host;

public static class TestSettings
{
    public const string Issuer = "MesPlatform.Tests";
    public const string Audience = "mes-web.tests";
    public const string SigningKey = "test-only-signing-key-0123456789-abcdefghij";

    public static readonly IReadOnlyDictionary<string, string?> Defaults = new Dictionary<string, string?>
    {
        ["Authentication:Jwt:Issuer"] = Issuer,
        ["Authentication:Jwt:Audience"] = Audience,
        ["Authentication:Jwt:SigningKey"] = SigningKey,
        ["Authentication:DevelopmentAuthenticator:Enabled"] = "true",

        ["Authentication:DevelopmentAuthenticator:Users:0:UserId"] = "1001",
        ["Authentication:DevelopmentAuthenticator:Users:0:UserName"] = "alice",
        ["Authentication:DevelopmentAuthenticator:Users:0:Password"] = "alice-pass",
        ["Authentication:DevelopmentAuthenticator:Users:0:DisplayName"] = "Alice Kim",
        ["Authentication:DevelopmentAuthenticator:Users:0:AllowedPlantIds:0"] = "2",
        ["Authentication:DevelopmentAuthenticator:Users:0:AllowedPlantIds:1"] = "1",
        ["Authentication:DevelopmentAuthenticator:Users:0:Permissions:0"] = "System.Info.Read",
        ["Authentication:DevelopmentAuthenticator:Users:0:Permissions:1"] = "Production.WorkOrder.Read",

        ["Authentication:DevelopmentAuthenticator:Users:1:UserId"] = "1002",
        ["Authentication:DevelopmentAuthenticator:Users:1:UserName"] = "bob",
        ["Authentication:DevelopmentAuthenticator:Users:1:Password"] = "bob-pass",
    };
}

/// <summary>실제 발급기를 거치지 않고 임의 조건(만료, 다른 키, 임의 claim)의 token을 만든다.</summary>
public static class TestTokens
{
    private static readonly JsonWebTokenHandler Handler = new();

    public static string Create(
        string[]? permissions = null,
        int[]? plantIds = null,
        TimeSpan? lifetime = null,
        string signingKey = TestSettings.SigningKey,
        IEnumerable<Claim>? extraClaims = null)
    {
        var claims = new List<Claim> { new("sub", "7"), new("unique_name", "tester") };
        claims.AddRange((permissions ?? []).Select(p => new Claim("permission", p)));
        claims.AddRange((plantIds ?? []).Select(p => new Claim("plant_id", p.ToString(), ClaimValueTypes.Integer32)));
        claims.AddRange(extraClaims ?? []);

        var now = DateTime.UtcNow;
        var life = lifetime ?? TimeSpan.FromMinutes(10);
        return Handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = TestSettings.Issuer,
            Audience = TestSettings.Audience,
            // 만료 token은 NotBefore가 Expires보다 늦을 수 없으므로 과거로 함께 옮긴다.
            NotBefore = life < TimeSpan.Zero ? now + life - TimeSpan.FromMinutes(5) : now,
            Expires = now + life,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                SecurityAlgorithms.HmacSha256),
        });
    }
}
