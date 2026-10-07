using System.Text.RegularExpressions;

namespace MesPlatform.Infrastructure.Observability;

/// <summary>
/// 로그에 남기는 문자열에서 token, 암호, 연결 문자열의 비밀 값을 가린다.
/// 로그 속성은 대부분 구조화된 식별자라 비밀이 없어야 하지만, 경로·사유처럼 자유 문자열은 한 번 더 거른다.
/// </summary>
public static partial class LogRedactor
{
    public const string Mask = "[REDACTED]";

    public static string? Redact(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        var redacted = BearerToken().Replace(value, $"Bearer {Mask}");
        redacted = JwtLike().Replace(redacted, Mask);
        return SecretAssignment().Replace(redacted, $"$1$2{Mask}");
    }

    [GeneratedRegex(@"Bearer\s+[A-Za-z0-9\-._~+/]+=*", RegexOptions.IgnoreCase)]
    private static partial Regex BearerToken();

    [GeneratedRegex(@"eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]*")]
    private static partial Regex JwtLike();

    // password=..., Pwd=..., "token": "...", ConnectionString=... 같은 key=value, key: value 형태. 값은 ; & 공백 따옴표 앞까지다.
    [GeneratedRegex(@"(?i)\b(password|pwd|passwd|secret|token|api[_-]?key|signingkey|connectionstring|connection[_-]string)(""?\s*[=:]\s*""?)[^;&\s""]+")]
    private static partial Regex SecretAssignment();
}
