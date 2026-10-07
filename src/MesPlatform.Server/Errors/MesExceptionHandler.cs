using MesPlatform.Application.Common.Errors;
using MesPlatform.Application.Common.Operations;
using MesPlatform.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;

namespace MesPlatform.Server.Errors;

public sealed class MesExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // AddExceptionHandler<T>()는 싱글턴으로 등록되므로,
        // scoped 서비스는 request scope에서 직접 꺼낸다.
        var accessor = context.RequestServices.GetService<IOperationContextAccessor>();
        var ctx = accessor?.Current;
        MesProblemDetails problem;

        switch (exception)
        {
            case ApplicationLayerException ale:
                problem = new MesProblemDetails
                {
                    Status     = 422,
                    Type       = ProblemType(ale.Error.Code),
                    Title      = ale.Error.Code,
                    Code       = ale.Error.Code,
                    Args       = ale.Error.Parameters,
                    RequestId  = ctx?.RequestId.ToString(),
                    OperationId = ctx?.OperationId.ToString(),
                };
                break;

            case DomainException de:
                problem = new MesProblemDetails
                {
                    Status     = 422,
                    Type       = ProblemType(de.Error.Code),
                    Title      = de.Error.Code,
                    Code       = de.Error.Code,
                    RequestId  = ctx?.RequestId.ToString(),
                    OperationId = ctx?.OperationId.ToString(),
                };
                break;

            default:
                problem = new MesProblemDetails
                {
                    Status     = 500,
                    Type       = ProblemType("UNEXPECTED_ERROR"),
                    Title      = "UNEXPECTED_ERROR",
                    Code       = "UNEXPECTED_ERROR",
                    // SQL 텍스트·스택 트레이스 노출 금지
                    RequestId  = ctx?.RequestId.ToString(),
                    OperationId = ctx?.OperationId.ToString(),
                };
                break;
        }

        context.Response.StatusCode  = problem.Status ?? 500;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }

    private static string ProblemType(string code) =>
        $"https://mes.internal/errors/{code.ToLowerInvariant().Replace('_', '-')}";
}

// CON-01 Problem Details 형태: {type, title, status, code, args, errors, requestId, operationId, traceId}
file sealed class MesProblemDetails : ProblemDetails
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("args")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyDictionary<string, string>? Args { get; set; }

    [JsonPropertyName("errors")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<FieldError>? Errors { get; set; }

    [JsonPropertyName("requestId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RequestId { get; set; }

    [JsonPropertyName("operationId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? OperationId { get; set; }
}

file sealed record FieldError(string Field, string Code);
