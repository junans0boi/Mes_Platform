using MesPlatform.Application.Abstractions.Identity;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace MesPlatform.Infrastructure.Identity;

/// <summary>
/// 개발용 authenticator가 Development·Testing 밖에서 켜지면 시작을 거부한다.
/// 설정 오류로 평문 암호 사용자가 운영에 노출되는 일을 막는 마지막 방어선이다.
/// </summary>
public sealed class DevelopmentAuthenticatorOptionsValidator(IHostEnvironment environment)
    : IValidateOptions<DevelopmentAuthenticatorOptions>
{
    public ValidateOptionsResult Validate(string? name, DevelopmentAuthenticatorOptions options)
    {
        if (!options.Enabled)
        {
            return ValidateOptionsResult.Success;
        }

        if (!environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
        {
            return ValidateOptionsResult.Fail(
                $"{DevelopmentAuthenticatorOptions.Section}:Enabled is only allowed in Development or Testing; "
                + $"the current environment is '{environment.EnvironmentName}'.");
        }

        var failures = new List<string>();
        foreach (var user in options.Users)
        {
            if (string.IsNullOrWhiteSpace(user.UserName) || string.IsNullOrEmpty(user.Password))
            {
                failures.Add("Every development user needs a UserName and a Password.");
            }

            failures.AddRange(user.Permissions.Where(p => !PermissionCode.IsValid(p))
                .Select(p => $"Development user '{user.UserName}' has an invalid Permission Code '{p}'."));
        }

        if (options.Users.GroupBy(u => u.UserName, StringComparer.OrdinalIgnoreCase).Any(g => g.Count() > 1))
        {
            failures.Add("Development user names must be unique.");
        }

        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }
}
