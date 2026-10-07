using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MesPlatform.Api.Tests.Host;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            // DB 없이 /health/ready가 200을 반환하도록 모든 등록을 제거한다
            services.Configure<HealthCheckServiceOptions>(opts => opts.Registrations.Clear());
        });
    }
}
