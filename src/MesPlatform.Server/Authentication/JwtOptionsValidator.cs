using System.Text;
using Microsoft.Extensions.Options;

namespace MesPlatform.Server.Authentication;

public sealed class JwtOptionsValidator : IValidateOptions<JwtOptions>
{
    public ValidateOptionsResult Validate(string? name, JwtOptions options)
    {
        var failures = new List<string>();

        if (Encoding.UTF8.GetByteCount(options.SigningKey) < JwtOptions.MinSigningKeyBytes)
        {
            failures.Add($"{JwtOptions.Section}:SigningKey must be at least {JwtOptions.MinSigningKeyBytes} bytes. Supply it through environment-specific configuration.");
        }

        if (string.IsNullOrWhiteSpace(options.Issuer) || string.IsNullOrWhiteSpace(options.Audience))
        {
            failures.Add($"{JwtOptions.Section}:Issuer and Audience are required.");
        }

        if (options.AccessTokenMinutes is < 1 or > 24 * 60)
        {
            failures.Add($"{JwtOptions.Section}:AccessTokenMinutes must be between 1 and 1440.");
        }

        if (options.ClockSkewSeconds is < 0 or > 300)
        {
            failures.Add($"{JwtOptions.Section}:ClockSkewSeconds must be between 0 and 300.");
        }

        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }
}
