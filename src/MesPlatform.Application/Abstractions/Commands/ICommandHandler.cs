using MesPlatform.Application.Common.Operations;
using MesPlatform.Application.Common.Results;

namespace MesPlatform.Application.Abstractions.Commands;

/// <summary>데이터를 변경하는 Command 한 종류를 처리한다. 업무 규칙은 Handler가 소유하며 공통 Base Handler를 두지 않는다.</summary>
public interface ICommandHandler<in TCommand, TResult>
{
    Task<Result<TResult>> HandleAsync(TCommand command, OperationContext context, CancellationToken cancellationToken);
}
