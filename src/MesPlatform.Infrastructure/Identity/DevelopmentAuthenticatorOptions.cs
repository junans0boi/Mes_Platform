namespace MesPlatform.Infrastructure.Identity;

/// <summary>
/// Development 전용 설정 기반 사용자(첫 슬라이스). 암호가 평문이므로 운영 환경에서는 활성화할 수 없다.
/// 실제 사용자·권한 저장소가 생기면 <c>IUserAuthenticator</c> 구현을 교체한다.
/// </summary>
public sealed class DevelopmentAuthenticatorOptions
{
    public const string Section = "Authentication:DevelopmentAuthenticator";

    public bool Enabled { get; set; }

    public List<DevelopmentUser> Users { get; set; } = [];
}

public sealed class DevelopmentUser
{
    public long UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    public List<int> AllowedPlantIds { get; set; } = [];

    public List<string> Permissions { get; set; } = [];
}
