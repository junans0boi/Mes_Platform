using System.Globalization;
using System.Security.Claims;
using System.Text;
using MesPlatform.Application.Abstractions.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace MesPlatform.Server.Authentication;

public sealed record IssuedAccessToken(string Token, int ExpiresInSeconds);

public interface IAccessTokenIssuer
{
    IssuedAccessToken Issue(CurrentUserSnapshot user);
}

public sealed class AccessTokenIssuer(IOptions<JwtOptions> options, TimeProvider clock) : IAccessTokenIssuer
{
    private readonly JsonWebTokenHandler _handler = new();

    public IssuedAccessToken Issue(CurrentUserSnapshot user)
    {
        var jwt = options.Value;
        var now = clock.GetUtcNow().UtcDateTime;
        var lifetime = TimeSpan.FromMinutes(jwt.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(MesClaimTypes.Subject, user.UserId.ToString(CultureInfo.InvariantCulture)),
            new(MesClaimTypes.UserName, user.UserName),
        };
        if (user.DisplayName is not null)
        {
            claims.Add(new Claim(MesClaimTypes.DisplayName, user.DisplayName));
        }

        claims.AddRange(user.AllowedPlantIds.Select(p => new Claim(MesClaimTypes.PlantId, p.ToString(CultureInfo.InvariantCulture), ClaimValueTypes.Integer32)));
        claims.AddRange(user.PermissionCodes.Select(p => new Claim(MesClaimTypes.Permission, p)));

        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = now + lifetime,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                SecurityAlgorithms.HmacSha256),
        });

        return new IssuedAccessToken(token, (int)lifetime.TotalSeconds);
    }
}
