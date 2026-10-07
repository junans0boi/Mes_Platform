namespace MesPlatform.Domain.Production.WorkOrders;

// 임시(provisional): Domain 테스트 seam을 확인하기 위한 값이다. 승인된 WorkOrder 상태 목록은 BE-06이 확정한다.
// API, OpenAPI 계약, 프론트엔드 UI는 이 열거형에 의존하면 안 된다.
public enum WorkOrderStatus
{
    Planned,
    Ready,
    InProgress,
    Completed,
    Cancelled,
}
