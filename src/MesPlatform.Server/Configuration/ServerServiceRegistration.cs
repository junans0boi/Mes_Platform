using MesPlatform.Application.Abstractions.Identity;
using MesPlatform.Application.Common.Operations;
using MesPlatform.Infrastructure;
using MesPlatform.Infrastructure.Identity;
using MesPlatform.Infrastructure.Observability;
using MesPlatform.Server.Authentication;
using MesPlatform.Server.Authorization;
using MesPlatform.Server.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Mvc;
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
            .ConfigureApiBehaviorOptions(opt =>
            {
                // 모델 바인딩 오류도 다른 오류와 같은 Problem Details 형태(code, errors[], requestId)로 반환한다.
                opt.InvalidModelStateResponseFactory = context => new ObjectResult(
                    ProblemWriter.Create(
                        context.HttpContext,
                        StatusCodes.Status400BadRequest,
                        ErrorCodes.ValidationFailed,
                        errors: [.. context.ModelState
                            .Where(e => e.Value?.Errors.Count > 0)
                            .Select(e => new ProblemFieldError(e.Key, "INVALID"))]))
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    ContentTypes = { "application/problem+json" },
                };
            })
            .AddJsonOptions(opt =>
            {
                opt.JsonSerializerOptions.PropertyNamingPolicy =
                    System.Text.Json.JsonNamingPolicy.CamelCase;
                opt.JsonSerializerOptions.DefaultIgnoreCondition =
                    System.Text.Json.Serialization.JsonIgnoreCondition.Never;
            });

        builder.Services.AddMesAuthentication(builder.Configuration);
        builder.Services.AddUserAuthenticator(builder.Configuration);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
        builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ProblemAuthorizationResultHandler>();
        builder.Services.AddScoped<CurrentUserAccessor>();
        builder.Services.AddScoped<IPermissionChecker, CurrentUserPermissionChecker>();

        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<MesExceptionHandler>();

        builder.Services.AddHealthChecks(); // Infrastructure의 SqlServer check가 자동 등록됨

        builder.Services.AddOpenApi();

        return builder;
    }

    public static WebApplication ConfigurePipeline(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseSerilogRequestLogging(options =>
            options.EnrichDiagnosticContext = (diagnostics, http) =>
            {
                // 요청 요약 로그에도 같은 진단 속성을 붙인다. 이 시점에는 인증·Plant 검증이 끝나 있다.
                var operation = http.RequestServices.GetService<IOperationContextAccessor>()?.Current;
                var traceId = System.Diagnostics.Activity.Current?.TraceId.ToString() ?? http.TraceIdentifier;
                foreach (var (name, value) in OperationLogScope.Properties(operation, traceId))
                {
                    diagnostics.Set(name, value);
                }
            });
        app.UseMiddleware<Middleware.RequestOperationContextMiddleware>();
        app.UseMiddleware<Middleware.ResponseOperationHeadersMiddleware>();
        app.UseAuthentication();
        app.UseMiddleware<Middleware.OperationLogScopeMiddleware>();
        app.UseAuthorization();
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
