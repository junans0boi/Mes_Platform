using MesPlatform.Application.Common.Operations;

namespace MesPlatform.Server.Middleware;

/// <summary>
/// 모든 응답에 X-Request-Id, X-Operation-Id를 붙인다. 응답이 시작되는 시점에 쓰므로 예외 핸들러가 헤더를 지운
/// 500 응답과 인증 실패(401) 응답에도 같은 값이 남는다. 운영자가 지원팀에 전달하는 진단 값이다.
/// </summary>
public sealed class ResponseOperationHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context, IOperationContextAccessor accessor)
    {
        context.Response.OnStarting(() =>
        {
            if (accessor.Current is { } operation)
            {
                context.Response.Headers[RequestOperationContextMiddleware.RequestIdHeader] = operation.RequestId.ToString();
                context.Response.Headers[RequestOperationContextMiddleware.OperationIdHeader] = operation.OperationId.ToString();
            }

            return Task.CompletedTask;
        });

        return next(context);
    }
}
