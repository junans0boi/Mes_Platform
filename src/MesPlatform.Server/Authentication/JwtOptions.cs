namespace MesPlatform.Server.Authentication;

/// <summary>Authentication:Jwt. SigningKey는 환경별 설정(user-secrets, 환경 변수)으로 주입하며 저장소에 커밋하지 않는다.</summary>
public sealed class JwtOptions
{
    public const string Section = "Authentication:Jwt";
    public const int MinSigningKeyBytes = 32;

    public string Issuer { get; set; } = "MesPlatform";

    public string Audience { get; set; } = "mes-web";

    public string SigningKey { get; set; } = string.Empty;

    // BE-05 확정값: access token 15분
    public int AccessTokenMinutes { get; set; } = 15;

    public int ClockSkewSeconds { get; set; } = 30;
}
