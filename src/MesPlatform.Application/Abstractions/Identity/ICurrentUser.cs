namespace MesPlatform.Application.Abstractions.Identity;

/// <summary>인증된 현재 사용자. Plant 범위(<see cref="AllowedPlantIds"/>)와 Permission Code로 권한을 판단한다.</summary>
public interface ICurrentUser
{
    string UserId { get; }

    IReadOnlyCollection<int> AllowedPlantIds { get; }

    IReadOnlyCollection<string> PermissionCodes { get; }
}
