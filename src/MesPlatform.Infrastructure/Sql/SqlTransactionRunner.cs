using MesPlatform.Application.Abstractions.Persistence;

namespace MesPlatform.Infrastructure.Sql;

public sealed class SqlTransactionRunner(SqlSession session, SqlConnectionFactory factory)
    : ITransactionRunner
{
    public async Task<T> ExecuteAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        await session.BeginAsync(factory, cancellationToken);
        try
        {
            var result = await operation(cancellationToken);
            await session.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await session.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
