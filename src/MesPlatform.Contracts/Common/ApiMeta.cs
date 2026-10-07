namespace MesPlatform.Contracts.Common;

public sealed record ApiMeta(
    Guid RequestId,
    Guid? OperationId,
    DateTimeOffset ServerTime);
