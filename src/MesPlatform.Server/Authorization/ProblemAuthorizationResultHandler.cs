using MesPlatform.Server.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace MesPlatform.Server.Authorization;

/// <summary>권한 부족(403)을 Problem Details로 쓴다. 인증 실패(401)는 JwtBearer의 challenge가 같은 형태로 쓴다.</summary>
public sealed class ProblemAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden)
        {
            var missing = authorizeResult.AuthorizationFailure?.FailedRequirements
                .OfType<PermissionRequirement>()
                .Select(r => r.PermissionCode)
                .FirstOrDefault();
            await ProblemWriter.WriteAsync(
                context,
                StatusCodes.Status403Forbidden,
                ErrorCodes.PermissionDenied,
                missing is null ? null : new Dictionary<string, string> { ["permission"] = missing });
            return;
        }

        await _default.HandleAsync(next, context, policy, authorizeResult);
    }
}
