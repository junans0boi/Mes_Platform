using System.Globalization;
using MesPlatform.Application.Abstractions.Identity;
using MesPlatform.Server.Authentication;
using MesPlatform.Server.Errors;

namespace MesPlatform.Server.Authorization;

/// <summary>현재 요청의 access token claim에서 사용자 스냅샷을 만든다. 요청마다 한 번만 만든다.</summary>
public sealed class CurrentUserAccessor(IHttpContextAccessor httpContext)
{
    private CurrentUserSnapshot? _snapshot;

    public CurrentUserSnapshot GetRequired() => _snapshot ??= Build();

    private CurrentUserSnapshot Build()
    {
        var principal = httpContext.HttpContext?.User;
        if (principal?.Identity?.IsAuthenticated != true)
        {
            throw HttpProblemException.Unauthorized();
        }

        var userId = principal.FindFirst(MesClaimTypes.Subject)?.Value;
        var userName = principal.FindFirst(MesClaimTypes.UserName)?.Value;
        if (!long.TryParse(userId, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || string.IsNullOrEmpty(userName))
        {
            throw HttpProblemException.Unauthorized(ErrorCodes.TokenInvalid);
        }

        var plants = principal.FindAll(MesClaimTypes.PlantId)
            .Select(c => int.TryParse(c.Value, NumberStyles.None, CultureInfo.InvariantCulture, out var p) ? p : (int?)null)
            .Where(p => p.HasValue)
            .Select(p => p!.Value)
            .Distinct()
            .ToArray();
        var permissions = principal.FindAll(MesClaimTypes.Permission)
            .Select(c => c.Value)
            .Where(PermissionCode.IsValid)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return new CurrentUserSnapshot(id, userName, principal.FindFirst(MesClaimTypes.DisplayName)?.Value, plants, permissions);
    }
}

/// <summary>Application의 <see cref="IPermissionChecker"/>를 현재 사용자 스냅샷으로 구현한다.</summary>
public sealed class CurrentUserPermissionChecker(CurrentUserAccessor accessor) : IPermissionChecker
{
    public bool Has(string permissionCode) =>
        accessor.GetRequired().PermissionCodes.Contains(permissionCode, StringComparer.Ordinal);

    public bool CanAccessPlant(int plantId) => accessor.GetRequired().AllowedPlantIds.Contains(plantId);
}
