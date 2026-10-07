namespace MesPlatform.Application.Common.Errors;

/// <summary>
/// Application 계층의 실패 사유. <see cref="Code"/>는 안정적인 식별자이고 <see cref="MessageKey"/>와 <see cref="Parameters"/>는
/// 클라이언트가 문구를 번역하는 데 쓴다(API의 code, args에 대응한다).
/// </summary>
public sealed record ApplicationError
{
    private static readonly IReadOnlyDictionary<string, string> NoParameters = new Dictionary<string, string>();

    public ApplicationError(string code, string messageKey, IReadOnlyDictionary<string, string>? parameters = null)
    {
        Code = code;
        MessageKey = messageKey;
        Parameters = parameters ?? NoParameters;
    }

    /// <summary>실패가 아님을 나타내는 값.</summary>
    public static ApplicationError None { get; } = new(string.Empty, string.Empty);

    public string Code { get; }

    public string MessageKey { get; }

    public IReadOnlyDictionary<string, string> Parameters { get; }
}
