namespace MesPlatform.Application.Common.Operations;

/// <summary>
/// 모든 요청과 Worker 작업이 가지는 추적 정보. 값은 정규화하지 않고 받은 그대로 보존한다.
/// 오류 응답의 requestId·operationId와 AuditLog 연결에 쓰인다.
/// </summary>
public sealed record OperationContext(
    Guid RequestId,
    Guid OperationId,
    Guid CorrelationId,
    string? ActorUserId = null,
    long? PlantId = null,
    string? Endpoint = null,
    string? CommandName = null,
    string? Reason = null,
    string? ClientIp = null);
