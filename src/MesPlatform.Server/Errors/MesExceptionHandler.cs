using MesPlatform.Application.Common.Errors;
using MesPlatform.Domain.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace MesPlatform.Server.Errors;

public sealed class MesExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // AddExceptionHandler<T>()는 싱글턴으로 등록되므로 scoped 서비스(OperationContext)는 ProblemWriter가
        // request scope에서 직접 꺼낸다.
        var problem = exception switch
        {
            HttpProblemException hpe => ProblemWriter.Create(context, hpe.Status, hpe.Code, hpe.Args, hpe.Errors),
            ApplicationLayerException ale => ProblemWriter.Create(context, 422, ale.Error.Code, ale.Error.Parameters),
            DomainException de => ProblemWriter.Create(context, 422, de.Error.Code),
            // SQL 텍스트·스택 트레이스 노출 금지
            _ => ProblemWriter.Create(context, 500, "UNEXPECTED_ERROR"),
        };

        await ProblemWriter.WriteAsync(context, problem, cancellationToken);
        return true;
    }
}
