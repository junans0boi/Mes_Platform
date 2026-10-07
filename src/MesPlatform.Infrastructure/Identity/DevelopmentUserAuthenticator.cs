using System.Security.Cryptography;
using System.Text;
using MesPlatform.Application.Abstractions.Identity;
using Microsoft.Extensions.Options;

namespace MesPlatform.Infrastructure.Identity;

public sealed class DevelopmentUserAuthenticator(IOptions<DevelopmentAuthenticatorOptions> options) : IUserAuthenticator
{
    public ValueTask<CurrentUserSnapshot?> AuthenticateAsync(
        string userName,
        string password,
        CancellationToken cancellationToken)
    {
        var user = options.Value.Users.FirstOrDefault(u =>
            string.Equals(u.UserName, userName, StringComparison.OrdinalIgnoreCase));

        // 없는 사용자와 틀린 암호가 같은 시간·같은 결과를 내도록 항상 해시를 비교한다.
        var expected = Hash(user?.Password ?? Guid.NewGuid().ToString("N"));
        var matches = CryptographicOperations.FixedTimeEquals(expected, Hash(password)) && user is not null;

        return ValueTask.FromResult<CurrentUserSnapshot?>(matches
            ? new CurrentUserSnapshot(user!.UserId, user.UserName, user.DisplayName, [.. user.AllowedPlantIds], [.. user.Permissions])
            : null);
    }

    private static byte[] Hash(string value) => SHA256.HashData(Encoding.UTF8.GetBytes(value));
}
