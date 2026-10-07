namespace MesPlatform.Application.Abstractions.Persistence;

/// <summary>Application의 transaction seam. SQL 구현은 Infrastructure가 제공한다(BE-02).</summary>
public interface ITransactionRunner
{
    Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken);
}
