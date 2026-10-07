using MesPlatform.Domain.Production.WorkOrders;

namespace MesPlatform.Domain.Tests.Production.WorkOrders;

// 임시(provisional) 규칙 검증: Domain 테스트 seam을 확인하기 위한 것이며 승인된 상태 전이표가 아니다(BE-06 확정 후 교체).
public class WorkOrderStatusTransitionsTests
{
    [Fact]
    public void Planned_can_move_to_ready()
    {
        var allowed = WorkOrderStatusTransitions.CanTransition(WorkOrderStatus.Planned, WorkOrderStatus.Ready, out var error);

        Assert.True(allowed);
        Assert.Null(error);
    }

    [Fact]
    public void Completed_cannot_move_back_to_in_progress()
    {
        var allowed = WorkOrderStatusTransitions.CanTransition(WorkOrderStatus.Completed, WorkOrderStatus.InProgress, out var error);

        Assert.False(allowed);
        Assert.Equal("WORK_ORDER_STATUS_INVALID", error!.Code);
    }

    [Fact]
    public void Same_status_is_rejected()
    {
        var allowed = WorkOrderStatusTransitions.CanTransition(WorkOrderStatus.Ready, WorkOrderStatus.Ready, out var error);

        Assert.False(allowed);
        Assert.Equal("WORK_ORDER_STATUS_UNCHANGED", error!.Code);
    }

    [Theory]
    [InlineData(WorkOrderStatus.InProgress, WorkOrderStatus.Cancelled)]
    [InlineData(WorkOrderStatus.Planned, WorkOrderStatus.Completed)]
    [InlineData(WorkOrderStatus.Cancelled, WorkOrderStatus.Planned)]
    [InlineData(WorkOrderStatus.Ready, WorkOrderStatus.Planned)]
    public void Unknown_transition_returns_stable_error_code(WorkOrderStatus from, WorkOrderStatus to)
    {
        var allowed = WorkOrderStatusTransitions.CanTransition(from, to, out var error);

        Assert.False(allowed);
        Assert.Equal("WORK_ORDER_STATUS_INVALID", error!.Code);
    }

    [Theory]
    [InlineData(WorkOrderStatus.Planned, WorkOrderStatus.Ready)]
    [InlineData(WorkOrderStatus.Ready, WorkOrderStatus.InProgress)]
    [InlineData(WorkOrderStatus.InProgress, WorkOrderStatus.Completed)]
    [InlineData(WorkOrderStatus.Planned, WorkOrderStatus.Cancelled)]
    [InlineData(WorkOrderStatus.Ready, WorkOrderStatus.Cancelled)]
    public void Provisional_rule_allows_listed_transitions(WorkOrderStatus from, WorkOrderStatus to)
    {
        Assert.True(WorkOrderStatusTransitions.CanTransition(from, to, out var error));
        Assert.Null(error);
    }
}
