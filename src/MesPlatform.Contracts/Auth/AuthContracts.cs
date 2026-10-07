namespace MesPlatform.Contracts.Auth;

// CON-01 provisional 인증 계약(contracts/openapi.yaml). 필드 변경은 CON-02를 거친다.
public sealed record LoginRequest(string? UserName, string? Password);

public sealed record LoginData(string AccessToken, string TokenType, int ExpiresInSeconds);

public sealed record SessionData(
    long UserId,
    string UserName,
    string? DisplayName,
    IReadOnlyList<int> AllowedPlantIds,
    IReadOnlyList<string> Capabilities);
