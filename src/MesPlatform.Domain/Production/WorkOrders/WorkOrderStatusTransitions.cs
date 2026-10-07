using MesPlatform.Domain.Common;

namespace MesPlatform.Domain.Production.WorkOrders;

// 임시(provisional) 규칙: Domain 테스트 seam 확인용이며 승인된 상태 전이표가 아니다(BE-06 확정 후 이 규칙과 테스트를 교체한다).
public static class WorkOrderStatusTransitions
{
    private static readonly DomainError Invalid = new("WORK_ORDER_STATUS_INVALID", "workOrder.status.invalid");
    private static readonly DomainError Unchanged = new("WORK_ORDER_STATUS_UNCHANGED", "workOrder.status.unchanged");

    public static bool CanTransition(WorkOrderStatus from, WorkOrderStatus to, out DomainError? error)
    {
        if (from == to)
        {
            error = Unchanged;
            return false;
        }

        var allowed = (from, to) switch
        {
            (WorkOrderStatus.Planned, WorkOrderStatus.Ready) => true,
            (WorkOrderStatus.Ready, WorkOrderStatus.InProgress) => true,
            (WorkOrderStatus.InProgress, WorkOrderStatus.Completed) => true,
            (WorkOrderStatus.Planned, WorkOrderStatus.Cancelled) => true,
            (WorkOrderStatus.Ready, WorkOrderStatus.Cancelled) => true,
            // InProgress → Cancelled는 이후 취소 정책이 명시적으로 허용할 때까지 거절한다.
            _ => false,
        };

        error = allowed ? null : Invalid;
        return allowed;
    }
}
