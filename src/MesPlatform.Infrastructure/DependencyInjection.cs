using MesPlatform.Application.Abstractions.Persistence;
using MesPlatform.Application.Common.Operations;
using MesPlatform.Infrastructure.Health;
using MesPlatform.Infrastructure.Sql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MesPlatform.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.Section))
            .ValidateOnStart();

        services.AddSingleton<SqlConnectionFactory>();
        services.AddScoped<SqlSession>();
        services.AddScoped<ITransactionRunner, SqlTransactionRunner>();
        services.AddScoped<IOperationContextAccessor, OperationContextAccessor>();

        services.AddHealthChecks()
            .AddCheck<SqlServerHealthCheck>("sql-server");

        return services;
    }
}
