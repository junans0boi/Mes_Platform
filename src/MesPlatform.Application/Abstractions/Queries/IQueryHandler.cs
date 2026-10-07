using MesPlatform.Application.Common.Operations;
using MesPlatform.Application.Common.Results;

namespace MesPlatform.Application.Abstractions.Queries;

/// <summary>데이터를 변경하지 않고 화면이 요구하는 결과 모델을 직접 반환하는 Query 한 종류를 처리한다.</summary>
public interface IQueryHandler<in TQuery, TResult>
{
    Task<Result<TResult>> HandleAsync(TQuery query, OperationContext context, CancellationToken cancellationToken);
}
