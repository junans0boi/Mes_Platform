using MesPlatform.Application.Abstractions.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace MesPlatform.Server.Authorization;

/// <summary><c>Permission:&lt;code&gt;</c> 정책을 요청 시점에 만든다. 그 밖의 정책 이름은 기본 provider에 맡긴다.</summary>
public sealed class PermissionPolicyProvider(IOptions<AuthorizationOptions> options) : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback = new(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(RequirePermissionAttribute.PolicyPrefix, StringComparison.Ordinal))
        {
            return _fallback.GetPolicyAsync(policyName);
        }

        var code = policyName[RequirePermissionAttribute.PolicyPrefix.Length..];
        if (!PermissionCode.IsValid(code))
        {
            // 빈 코드나 형식 오류는 정책을 만들지 않는다. 정책이 없으면 요청은 실패한다(fail closed).
            return Task.FromResult<AuthorizationPolicy?>(null);
        }

        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(code))
            .Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}
