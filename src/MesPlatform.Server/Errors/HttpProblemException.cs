namespace MesPlatform.Server.Errors;

/// <summary>
/// HTTP 경계에서 던지는 오류(인증·권한·요청 형식). <see cref="MesExceptionHandler"/>가 Problem Details로 바꾼다.
/// 업무 규칙 위반은 이 예외가 아니라 Application의 Result를 쓴다.
/// </summary>
public sealed class HttpProblemException(
    int status,
    string code,
    IReadOnlyDictionary<string, string>? args = null,
    IReadOnlyList<ProblemFieldError>? errors = null) : Exception(code)
{
    public int Status { get; } = status;

    public string Code { get; } = code;

    public IReadOnlyDictionary<string, string>? Args { get; } = args;

    public IReadOnlyList<ProblemFieldError>? Errors { get; } = errors;

    public static HttpProblemException Unauthorized(string code = ErrorCodes.AuthenticationRequired) => new(401, code);

    public static HttpProblemException Forbidden(string code, IReadOnlyDictionary<string, string>? args = null) => new(403, code, args);

    public static HttpProblemException BadRequest(string code, IReadOnlyList<ProblemFieldError>? errors = null) =>
        new(400, code, errors: errors);
}
