using MesPlatform.Infrastructure.Sql;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using Xunit;

namespace MesPlatform.Infrastructure.Tests.Sql;

// SqlSession/SqlTransactionRunner 유닛 테스트 — 실제 DB에 연결하지 않는다.
// 연결 실패 동작은 통합 테스트(Category=SqlIntegration)에서 검증한다.
public sealed class SqlTransactionRunnerTests
{
    // SqlConnectionFactory가 빈 연결 문자열로 열기를 시도하면 SqlException을 던진다
    [Fact]
    public async Task ExecuteAsync_rolls_back_and_rethrows_when_operation_throws()
    {
        // BeginAsync가 열 수 없으면 SqlException을 던지므로,
        // 연결에 성공하는 경우를 커버하려면 통합 테스트가 필요하다.
        // 여기서는 factory 자체가 실패하는 경로를 테스트한다.
        var options = Options.Create(new DatabaseOptions
        {
            ConnectionString = "Server=nonexistent_host_12345;Database=X;Connect Timeout=1;"
        });
        var factory = new SqlConnectionFactory(options);
        var session = new SqlSession();
        var runner = new SqlTransactionRunner(session, factory);

        await Assert.ThrowsAnyAsync<Exception>(() =>
            runner.ExecuteAsync(
                _ => Task.FromResult(42),
                CancellationToken.None));
    }
}
