using MesPlatform.Infrastructure.Sql;
using MesPlatform.Worker.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace MesPlatform.Worker.Safety;

/// <summary>Job을 등록하기 전에 시작 가능 여부를 판단한다. 설정만 읽으며 DB에 연결하지 않는다.</summary>
public static class WorkerStartup
{
    public static async ValueTask<WorkerStartDecision> EvaluateAsync(IConfiguration configuration, CancellationToken cancellationToken)
    {
        var worker = configuration.GetSection(WorkerOptions.Section).Get<WorkerOptions>() ?? new WorkerOptions();
        var guard = new DatabaseSafetyGuard(Options.Create(worker));
        return await guard.ValidateAsync(DatabaseName(configuration), cancellationToken);
    }

    /// <summary>연결 문자열에서 DB 이름만 읽는다. 해석할 수 없으면 빈 문자열이라 guard가 거부한다.</summary>
    public static string DatabaseName(IConfiguration configuration)
    {
        var connectionString = configuration[$"{DatabaseOptions.Section}:{nameof(DatabaseOptions.ConnectionString)}"];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return string.Empty;
        }

        try
        {
            return new SqlConnectionStringBuilder(connectionString).InitialCatalog;
        }
        catch (ArgumentException)
        {
            return string.Empty;
        }
    }
}
