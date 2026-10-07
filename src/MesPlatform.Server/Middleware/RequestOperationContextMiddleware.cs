using MesPlatform.Application.Common.Operations;

namespace MesPlatform.Server.Middleware;

public sealed class RequestOperationContextMiddleware(RequestDelegate next)
{
    private const string RequestIdHeader = "X-Request-Id";
    private const string OperationIdHeader = "X-Operation-Id";

    public async Task InvokeAsync(HttpContext context, IOperationContextAccessor accessor)
    {
        var requestId = ParseGuid(context.Request.Headers[RequestIdHeader]) ?? Guid.NewGuid();
        var operationId = Guid.NewGuid();

        accessor.Set(new OperationContext(
            RequestId: requestId,
            OperationId: operationId,
            CorrelationId: Guid.NewGuid(),
            ActorUserId: null,
            PlantId: null,
            Endpoint: $"{context.Request.Method} {context.Request.Path}",
            CommandName: null,
            Reason: null,
            ClientIp: context.Connection.RemoteIpAddress?.ToString()));

        context.Response.Headers[RequestIdHeader] = requestId.ToString();
        context.Response.Headers[OperationIdHeader] = operationId.ToString();

        await next(context);
    }

    private static Guid? ParseGuid(string? value) =>
        Guid.TryParse(value, out var g) ? g : null;
}
