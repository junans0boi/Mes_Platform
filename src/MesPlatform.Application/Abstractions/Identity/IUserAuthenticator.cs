namespace MesPlatform.Application.Abstractions.Identity;

/// <summary>
/// 자격 증명을 확인하고 사용자 스냅샷을 돌려주는 seam. 실제 사용자·권한 저장소는 후속이며,
/// 첫 슬라이스에는 Development 전용 설정 기반 구현만 있다.
/// </summary>
public interface IUserAuthenticator
{
    /// <summary>자격 증명이 맞으면 스냅샷을, 아니면 null을 반환한다. 실패 사유(없는 사용자, 틀린 암호)를 구분해 알리지 않는다.</summary>
    ValueTask<CurrentUserSnapshot?> AuthenticateAsync(string userName, string password, CancellationToken cancellationToken);
}
