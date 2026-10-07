using System.Globalization;

namespace MesPlatform.Application.Abstractions.Identity;

/// <summary>인증이 끝난 사용자의 불변 스냅샷. access token의 claim과 1:1로 대응한다.</summary>
public sealed record CurrentUserSnapshot(
    long UserId,
    string UserName,
    string? DisplayName,
    IReadOnlyCollection<int> AllowedPlantIds,
    IReadOnlyCollection<string> PermissionCodes) : ICurrentUser
{
    string ICurrentUser.UserId => UserId.ToString(CultureInfo.InvariantCulture);
}
