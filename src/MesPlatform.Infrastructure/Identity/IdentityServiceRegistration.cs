using MesPlatform.Application.Abstractions.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace MesPlatform.Infrastructure.Identity;

public static class IdentityServiceRegistration
{
    /// <summary>
    /// <see cref="IUserAuthenticator"/>를 등록한다. <c>Authentication:DevelopmentAuthenticator:Enabled</c>가 true이고
    /// 환경이 Development·Testing일 때만 설정 기반 구현이 쓰이며, 그 외 환경에서 true이면 시작이 거부된다.
    /// </summary>
    public static IServiceCollection AddUserAuthenticator(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<DevelopmentAuthenticatorOptions>()
            .Bind(configuration.GetSection(DevelopmentAuthenticatorOptions.Section))
            .ValidateOnStart();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IValidateOptions<DevelopmentAuthenticatorOptions>, DevelopmentAuthenticatorOptionsValidator>());

        services.AddSingleton<DevelopmentUserAuthenticator>();
        services.AddSingleton<DisabledUserAuthenticator>();
        services.AddSingleton<IUserAuthenticator>(sp =>
            sp.GetRequiredService<IOptions<DevelopmentAuthenticatorOptions>>().Value.Enabled
                ? sp.GetRequiredService<DevelopmentUserAuthenticator>()
                : sp.GetRequiredService<DisabledUserAuthenticator>());

        return services;
    }
}
