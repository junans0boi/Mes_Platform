namespace MesPlatform.Contracts.Common;

// CON-01: 모든 성공 응답은 {data, meta:{requestId,operationId,serverTime}} 형태다.
public sealed record ApiEnvelope<T>(T Data, ApiMeta Meta);
