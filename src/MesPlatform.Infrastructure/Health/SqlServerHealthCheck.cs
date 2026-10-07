using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MesPlatform.Infrastructure.Health;

public sealed class SqlServerHealthCheck(Sql.SqlConnectionFactory factory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var conn = await factory.CreateOpenConnectionAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            // 연결 문자열과 자격 증명은 응답에 포함하지 않는다
            return HealthCheckResult.Unhealthy("SQL Server 연결 실패", ex);
        }
    }
}
