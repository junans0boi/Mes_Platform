using MesPlatform.Application.Abstractions.Identity;

namespace MesPlatform.Infrastructure.Identity;

/// <summary>사용자 저장소가 구성되지 않았을 때의 기본값. 모든 로그인을 거부한다.</summary>
public sealed class DisabledUserAuthenticator : IUserAuthenticator
{
    public ValueTask<CurrentUserSnapshot?> AuthenticateAsync(
        string userName,
        string password,
        CancellationToken cancellationToken) => ValueTask.FromResult<CurrentUserSnapshot?>(null);
}
