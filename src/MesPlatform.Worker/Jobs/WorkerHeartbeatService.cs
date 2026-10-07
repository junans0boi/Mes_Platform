using MesPlatform.Worker.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MesPlatform.Worker.Jobs;

/// <summary>
/// 기반 단계의 유일한 Job. Worker가 살아 있음을 구조화 로그로만 알리며 DB를 쓰지 않는다.
/// 비활성이면 아무것도 하지 않는다. 설비 로그·Projection·재고 Job은 각자의 계획에서 추가한다.
/// </summary>
public sealed partial class WorkerHeartbeatService(IOptions<WorkerOptions> options, ILogger<WorkerHeartbeatService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var worker = options.Value;
        if (!worker.Enabled)
        {
            return;
        }

        using var timer = new PeriodicTimer(worker.HeartbeatInterval);
        var sequence = 0L;
        do
        {
            LogHeartbeat(worker.ProcessRole, ++sequence);
        }
        while (await WaitAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken cancellationToken)
    {
        try
        {
            return await timer.WaitForNextTickAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "WorkerHeartbeat {ProcessRole} {Sequence}")]
    private partial void LogHeartbeat(string processRole, long sequence);
}
