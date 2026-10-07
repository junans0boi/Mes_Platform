using System.Diagnostics;
using MesPlatform.Application.Common.Operations;
using MesPlatform.Infrastructure.Observability;
using MesPlatform.Server.Authentication;

namespace MesPlatform.Server.Middleware;

/// <summary>
/// 인증 뒤에 실행한다. 인증된 사용자를 OperationContext의 ActorUserId에 기록하고, 이후 이 요청의 모든 로그에
/// TraceId, RequestId, OperationId, ActorUserId, PlantId, Endpoint, UseCase 속성을 붙인다.
/// </summary>
public sealed class OperationLogScopeMiddleware(RequestDelegate next, ILogger<OperationLogScopeMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, IOperationContextAccessor accessor)
    {
        if (accessor.Current is { } operation && context.User.Identity?.IsAuthenticated == true)
        {
            accessor.Set(operation with { ActorUserId = context.User.FindFirst(MesClaimTypes.Subject)?.Value });
        }

        using (logger.BeginOperationScope(accessor, Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier))
        {
            await next(context);
        }
    }
}
