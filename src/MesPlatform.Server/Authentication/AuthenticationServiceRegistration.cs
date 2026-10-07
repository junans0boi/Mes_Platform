using System.Text;
using MesPlatform.Server.Errors;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace MesPlatform.Server.Authentication;

public static class AuthenticationServiceRegistration
{
    public static IServiceCollection AddMesAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.Section))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<JwtOptions>, JwtOptionsValidator>();
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IAccessTokenIssuer, AccessTokenIssuer>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

        // 설정은 옵션 해석 시점에 읽는다. 시작 시 서명 키를 직접 읽지 않으므로 환경별 설정 계층이 모두 반영된다.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;
                bearer.MapInboundClaims = false; // claim 이름을 token에 쓴 그대로 유지한다.
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true,
                    RequireExpirationTime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ClockSkew = TimeSpan.FromSeconds(jwt.ClockSkewSeconds),
                    NameClaimType = MesClaimTypes.UserName,
                };
                bearer.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        var code = context.AuthenticateFailure switch
                        {
                            null => ErrorCodes.AuthenticationRequired,
                            SecurityTokenExpiredException => ErrorCodes.TokenExpired,
                            _ => ErrorCodes.TokenInvalid,
                        };
                        context.Response.Headers.Append("WWW-Authenticate", "Bearer");
                        await ProblemWriter.WriteAsync(context.HttpContext, StatusCodes.Status401Unauthorized, code);
                    },
                };
            });

        return services;
    }
}
