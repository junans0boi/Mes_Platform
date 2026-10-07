using MesPlatform.Worker.Jobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MesPlatform.Worker.Configuration;

public static class WorkerServiceRegistration
{
    /// <summary>시작 판단이 Allowed일 때만 호출한다. 기반 단계에서는 heartbeat만 등록한다.</summary>
    public static IServiceCollection AddWorkerJobs(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<WorkerOptions>().Bind(configuration.GetSection(WorkerOptions.Section));
        services.AddHostedService<WorkerHeartbeatService>();
        return services;
    }
}
