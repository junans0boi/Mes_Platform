using MesPlatform.Application.Common.Errors;
using MesPlatform.Application.Common.Results;

namespace MesPlatform.Application.Abstractions.Auditing;

public sealed record AuditEntry
{
    private AuditEntry(
        Guid operationId,
        Guid requestId,
        string? actorUserId,
        string commandName,
        string entityType,
        long? entityId,
        string actionCode,
        string? reason,
        bool isSystemGenerated,
        DateTimeOffset createdAt)
    {
        OperationId = operationId;
        RequestId = requestId;
        ActorUserId = actorUserId;
        CommandName = commandName;
        EntityType = entityType;
        EntityId = entityId;
        ActionCode = actionCode;
        Reason = reason;
        IsSystemGenerated = isSystemGenerated;
        CreatedAt = createdAt;
    }

    public Guid OperationId { get; }

    public Guid RequestId { get; }

    public string? ActorUserId { get; }

    public string CommandName { get; }

    public string EntityType { get; }

    public long? EntityId { get; }

    public string ActionCode { get; }

    public string? Reason { get; }

    public bool IsSystemGenerated { get; }

    public DateTimeOffset CreatedAt { get; }

    /// <summary>사람이 한 수정·취소·폐기·재처리에는 사유가 필요하다. 시스템이 만든 항목만 사유 없이 만들 수 있다.</summary>
    public static Result<AuditEntry> Create(
        Guid operationId,
        Guid requestId,
        string? actorUserId,
        string commandName,
        string entityType,
        long? entityId,
        string actionCode,
        string? reason,
        bool isSystemGenerated,
        DateTimeOffset createdAt)
    {
        if (!isSystemGenerated && string.IsNullOrWhiteSpace(reason))
        {
            return Result<AuditEntry>.Failure(new ApplicationError("AUDIT_REASON_REQUIRED", "audit.reason.required"));
        }

        return Result<AuditEntry>.Success(new AuditEntry(
            operationId, requestId, actorUserId, commandName, entityType, entityId, actionCode, reason, isSystemGenerated, createdAt));
    }
}
