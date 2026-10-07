using System.Net;
using System.Net.Http.Json;
using MesPlatform.Api.Tests.Host;
using Microsoft.Extensions.Options;

namespace MesPlatform.Api.Tests.Authorization;

public sealed class StartupGuardTests
{
    private static readonly Dictionary<string, string?> ProductionDatabase = new()
    {
        ["Database:ConnectionString"] = "Server=db.example;Database=MesPlatform;Integrated Security=true;",
    };

    private static Dictionary<string, string?> With(params (string Key, string? Value)[] extra)
    {
        var settings = new Dictionary<string, string?>(ProductionDatabase);
        foreach (var (key, value) in extra)
        {
            settings[key] = value;
        }

        return settings;
    }

    /// <summary>
    /// 호스트가 시작되지 않아야 한다. 시작 실패 직후 WebApplicationFactory가 이미 정리된 서비스 공급자를 읽는 경우가 있어
    /// OptionsValidationException 대신 ObjectDisposedException이 올 수 있으므로 둘 다 "시작 거부"로 본다.
    /// 거부 사유(메시지)는 OptionsValidatorTests가 결정적으로 검증한다.
    /// </summary>
    private static void AssertRefusesToStart(ConfiguredApiFactory factory)
    {
        var error = Record.Exception(() => factory.CreateClient());

        Assert.True(
            error is OptionsValidationException or ObjectDisposedException,
            $"호스트가 시작을 거부해야 합니다. 실제: {error?.GetType().Name ?? "시작됨"}");
    }

    [Fact]
    public void Development_authenticator_enabled_in_Production_refuses_to_start()
    {
        using var factory = new ConfiguredApiFactory("Production", With());

        AssertRefusesToStart(factory);
    }

    [Theory]
    [InlineData("Staging")]
    [InlineData("Production")]
    public void Development_authenticator_is_refused_in_every_environment_except_Development_and_Testing(string environment)
    {
        using var factory = new ConfiguredApiFactory(environment, With());

        AssertRefusesToStart(factory);
    }

    [Fact]
    public async Task Production_without_a_user_store_starts_but_rejects_every_login()
    {
        using var factory = new ConfiguredApiFactory(
            "Production",
            With(("Authentication:DevelopmentAuthenticator:Enabled", "false")));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { userName = "alice", password = "alice-pass" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public void Missing_or_short_signing_key_refuses_to_start()
    {
        using var factory = new ConfiguredApiFactory("Testing", With(("Authentication:Jwt:SigningKey", "too-short")));

        AssertRefusesToStart(factory);
    }

    [Fact]
    public void Development_users_with_menu_paths_as_permissions_refuse_to_start()
    {
        using var factory = new ConfiguredApiFactory(
            "Testing",
            With(("Authentication:DevelopmentAuthenticator:Users:1:Permissions:0", "/production/work-orders")));

        AssertRefusesToStart(factory);
    }
}
