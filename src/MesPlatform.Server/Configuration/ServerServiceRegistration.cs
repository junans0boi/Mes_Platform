using MesPlatform.Infrastructure;
using Serilog;

namespace MesPlatform.Server.Configuration;

public static class ServerServiceRegistration
{
    public static WebApplicationBuilder ConfigureServices(this WebApplicationBuilder builder)
    {
        builder.Host.UseSerilog((ctx, cfg) =>
            cfg.ReadFrom.Configuration(ctx.Configuration));

        builder.Services.AddInfrastructure(builder.Configuration);

        builder.Services.AddControllers()
            .AddJsonOptions(opt =>
            {
                opt.JsonSerializerOptions.PropertyNamingPolicy =
                    System.Text.Json.JsonNamingPolicy.CamelCase;
                opt.JsonSerializerOptions.DefaultIgnoreCondition =
                    System.Text.Json.Serialization.JsonIgnoreCondition.Never;
            });

        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<Errors.MesExceptionHandler>();

        builder.Services.AddHealthChecks(); // Infrastructure의 SqlServer check가 자동 등록됨

        builder.Services.AddOpenApi();

        return builder;
    }

    public static WebApplication ConfigurePipeline(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseSerilogRequestLogging();
        app.UseMiddleware<Middleware.RequestOperationContextMiddleware>();
        app.MapControllers();
        app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
        {
            Predicate = _ => false, // 프로세스 살아있음만 확인; DB 등 체크 없음
        });
        app.MapHealthChecks("/health/ready");
        app.MapOpenApi();
        return app;
    }
}
