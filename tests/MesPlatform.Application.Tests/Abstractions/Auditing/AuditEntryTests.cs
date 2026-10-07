using MesPlatform.Application.Abstractions.Auditing;

namespace MesPlatform.Application.Tests.Abstractions.Auditing;

public class AuditEntryTests
{
    private static Application.Common.Results.Result<AuditEntry> Create(string? reason, bool isSystemGenerated) =>
        AuditEntry.Create(
            operationId: Guid.NewGuid(),
            requestId: Guid.NewGuid(),
            actorUserId: "u1",
            commandName: "ChangeWorkOrderStatus",
            entityType: "WorkOrder",
            entityId: 1001,
            actionCode: "STATUS_CHANGED",
            reason: reason,
            isSystemGenerated: isSystemGenerated,
            createdAt: DateTimeOffset.UtcNow);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Manual_entry_without_reason_is_rejected(string? reason)
    {
        var result = Create(reason, isSystemGenerated: false);

        Assert.False(result.IsSuccess);
        Assert.Equal("AUDIT_REASON_REQUIRED", result.Error.Code);
    }

    [Fact]
    public void Manual_entry_with_reason_is_created()
    {
        var result = Create("설비 점검", isSystemGenerated: false);

        Assert.True(result.IsSuccess);
        Assert.Equal("설비 점검", result.Value.Reason);
    }

    [Fact]
    public void System_generated_entry_does_not_need_a_reason()
    {
        var result = Create(null, isSystemGenerated: true);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.Reason);
    }
}
