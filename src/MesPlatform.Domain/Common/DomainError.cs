namespace MesPlatform.Domain.Common;

/// <summary>업무 규칙 위반을 나타내는 안정적인 오류. <see cref="Code"/>는 한 번 공개하면 의미를 바꾸지 않는다.</summary>
public sealed record DomainError(string Code, string MessageKey);
