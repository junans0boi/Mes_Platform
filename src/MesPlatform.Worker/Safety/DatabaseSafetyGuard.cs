using MesPlatform.Worker.Configuration;
using Microsoft.Extensions.Options;

namespace MesPlatform.Worker.Safety;

public sealed class DatabaseSafetyGuard(IOptions<WorkerOptions> options)
{
    private const string ProductionMarker = "prod";

    /// <summary>
    /// 판단 순서: 비활성 → 역할 → DB. DB 이름은 연결하지 않고 연결 문자열에서만 읽으므로
    /// 거부된 Worker는 DB에 연결하지 않는다.
    /// </summary>
    public ValueTask<WorkerStartDecision> ValidateAsync(string databaseName, CancellationToken cancellationToken)
    {
        var worker = options.Value;

        if (!worker.Enabled)
        {
            return Decide(false, WorkerStartDecision.Disabled);
        }

        if (!string.Equals(worker.ProcessRole, WorkerOptions.RequiredProcessRole, StringComparison.Ordinal))
        {
            return Decide(false, WorkerStartDecision.RoleInvalid);
        }

        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return Decide(false, WorkerStartDecision.DatabaseNameMissing);
        }

        var name = databaseName.Trim();
        var blocked = worker.BlockedDatabaseNames.Any(b => string.Equals(b?.Trim(), name, StringComparison.OrdinalIgnoreCase))
                      || name.Contains(ProductionMarker, StringComparison.OrdinalIgnoreCase);
        return blocked
            ? Decide(false, WorkerStartDecision.DatabaseBlocked)
            : Decide(true, WorkerStartDecision.AllowedCode);
    }

    private static ValueTask<WorkerStartDecision> Decide(bool allowed, string reason) =>
        ValueTask.FromResult(new WorkerStartDecision(allowed, reason));
}
