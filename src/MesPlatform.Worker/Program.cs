using MesPlatform.Worker.Configuration;
using MesPlatform.Worker.Safety;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// 백그라운드 처리 실행 프로세스(Server와 별도 프로세스).
// Job을 등록하기 전에 안전 판단을 하며, 거부되면 호스트를 만들지 않고 DB에도 연결하지 않는다.
// 어느 디렉터리에서 실행해도 출력 폴더의 appsettings.json을 읽도록 content root를 실행 파일 위치로 둔다.
var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});

var decision = await WorkerStartup.EvaluateAsync(builder.Configuration, CancellationToken.None);
if (!decision.Allowed)
{
    using var loggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
    loggerFactory.CreateLogger("MesPlatform.Worker")
        .LogWarning("Worker not started: {ReasonCode}", decision.ReasonCode);
    return decision.ExitCode;
}

builder.Services.AddWorkerJobs(builder.Configuration);
await builder.Build().RunAsync();
return 0;
