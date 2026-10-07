using System.Diagnostics;
using MesPlatform.Application.Common.Operations;
using Microsoft.AspNetCore.Http;

namespace MesPlatform.Server.Errors;

/// <summary>Problem Details를 한 형태로 만들고 쓴다. 예외 핸들러와 인증·권한 결과 처리가 같은 형태를 낸다.</summary>
internal static class ProblemWriter
{
    public static MesProblemDetails Create(
        HttpContext context,
        int status,
        string code,
        IReadOnlyDictionary<string, string>? args = null,
        IReadOnlyList<ProblemFieldError>? errors = null)
    {
        var operation = context.RequestServices.GetService<IOperationContextAccessor>()?.Current;
        return new MesProblemDetails
        {
            Status = status,
            Type = TypeFor(code),
            Title = code,
            Code = code,
            Args = args,
            Errors = errors,
            RequestId = operation?.RequestId.ToString(),
            OperationId = operation?.OperationId.ToString(),
            TraceId = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier,
        };
    }

    public static Task WriteAsync(
        HttpContext context,
        int status,
        string code,
        IReadOnlyDictionary<string, string>? args = null,
        IReadOnlyList<ProblemFieldError>? errors = null,
        CancellationToken cancellationToken = default) =>
        WriteAsync(context, Create(context, status, code, args, errors), cancellationToken);

    public static async Task WriteAsync(HttpContext context, MesProblemDetails problem, CancellationToken cancellationToken = default)
    {
        context.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        // WriteAsJsonAsync는 contentType을 주지 않으면 ContentType을 application/json으로 덮어쓴다.
        await context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json", cancellationToken);
    }

    public static string TypeFor(string code) =>
        $"https://mes.internal/errors/{code.ToLowerInvariant().Replace('_', '-')}";
}
