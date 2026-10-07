using MesPlatform.Application.Common.Operations;
using MesPlatform.Contracts.Common;
using Microsoft.AspNetCore.Mvc;

namespace MesPlatform.Server.Controllers;

public static class ApiControllerExtensions
{
    /// <summary>성공 응답 envelope. requestId·operationId는 요청의 OperationContext에서 가져온다. 조회 전용 응답은 operationId를 null로 둘 수 있다.</summary>
    public static ApiEnvelope<T> Envelope<T>(this ControllerBase controller, T data, bool includeOperationId = false)
    {
        var operation = controller.HttpContext.RequestServices.GetRequiredService<IOperationContextAccessor>().Current;
        var meta = new ApiMeta(
            RequestId: operation?.RequestId ?? Guid.NewGuid(),
            OperationId: includeOperationId ? operation?.OperationId : null,
            ServerTime: DateTimeOffset.UtcNow);
        return new ApiEnvelope<T>(data, meta);
    }
}
