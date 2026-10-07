using MesPlatform.Server.Authentication;
using Microsoft.AspNetCore.Authorization;

namespace MesPlatform.Server.Authorization;

/// <summary>사용자의 Permission Code claim에 요구 코드가 정확히 있어야 통과한다. 메뉴 경로·role claim은 보지 않는다.</summary>
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (context.User.HasClaim(c => c.Type == MesClaimTypes.Permission
                                       && string.Equals(c.Value, requirement.PermissionCode, StringComparison.Ordinal)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
