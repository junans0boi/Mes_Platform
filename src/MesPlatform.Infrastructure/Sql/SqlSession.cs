using Microsoft.Data.SqlClient;

namespace MesPlatform.Infrastructure.Sql;

// scoped: 하나의 요청/커맨드 안에서 연결과 트랜잭션을 공유한다.
public sealed class SqlSession : IAsyncDisposable
{
    private SqlConnection? _connection;
    private SqlTransaction? _transaction;

    public SqlConnection Connection =>
        _connection ?? throw new InvalidOperationException("트랜잭션이 시작되지 않았습니다.");

    public SqlTransaction? Transaction => _transaction;

    internal async Task BeginAsync(SqlConnectionFactory factory, CancellationToken cancellationToken)
    {
        _connection = await factory.CreateOpenConnectionAsync(cancellationToken);
        _transaction = (SqlTransaction)await _connection.BeginTransactionAsync(cancellationToken);
    }

    internal Task CommitAsync(CancellationToken cancellationToken) =>
        _transaction!.CommitAsync(cancellationToken);

    internal Task RollbackAsync(CancellationToken cancellationToken) =>
        _transaction!.RollbackAsync(cancellationToken);

    public async ValueTask DisposeAsync()
    {
        if (_transaction is not null) await _transaction.DisposeAsync();
        if (_connection is not null) await _connection.DisposeAsync();
    }
}
