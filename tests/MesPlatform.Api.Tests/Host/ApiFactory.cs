using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MesPlatform.Api.Tests.Host;

/// <summary>
/// 테스트 호스트. 환경과 설정을 바꿔 시작 조건(운영 환경 거부 등)을 검증할 수 있다.
/// JWT 서명 키는 테스트용 임시 값이며 저장소의 appsettings에는 어떤 키도 두지 않는다.
/// </summary>
public class ConfiguredApiFactory(string environment = "Testing", IReadOnlyDictionary<string, string?>? overrides = null)
    : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var settings = new Dictionary<string, string?>(TestSettings.Defaults);
            foreach (var (key, value) in overrides ?? new Dictionary<string, string?>())
            {
                settings[key] = value;
            }

            config.AddInMemoryCollection(settings);
        });
        builder.ConfigureTestServices(services =>
        {
            // 테스트 전용 컨트롤러(권한·예외 검증용)를 서버에 등록한다
            services.AddControllers().AddApplicationPart(typeof(ConfiguredApiFactory).Assembly);

            // DB 없이 /health/ready가 200을 반환하도록 모든 등록을 제거한다
            services.Configure<HealthCheckServiceOptions>(opts => opts.Registrations.Clear());
        });
    }
}

public sealed class ApiFactory : ConfiguredApiFactory;
