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

    [Fact]
    public void Development_authenticator_enabled_in_Production_refuses_to_start()
    {
        using var factory = new ConfiguredApiFactory("Production", With());

        var error = Assert.Throws<OptionsValidationException>(() => factory.CreateClient());

        Assert.Contains("only allowed in Development or Testing", error.Message);
        Assert.Contains("'Production'", error.Message);
    }

    [Theory]
    [InlineData("Staging")]
    [InlineData("Production")]
    public void Development_authenticator_is_refused_in_every_environment_except_Development_and_Testing(string environment)
    {
        using var factory = new ConfiguredApiFactory(environment, With());

        Assert.Throws<OptionsValidationException>(() => factory.CreateClient());
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

        var error = Assert.Throws<OptionsValidationException>(() => factory.CreateClient());

        Assert.Contains("SigningKey", error.Message);
    }

    [Fact]
    public void Development_users_with_menu_paths_as_permissions_refuse_to_start()
    {
        using var factory = new ConfiguredApiFactory(
            "Testing",
            With(("Authentication:DevelopmentAuthenticator:Users:1:Permissions:0", "/production/work-orders")));

        var error = Assert.Throws<OptionsValidationException>(() => factory.CreateClient());

        Assert.Contains("invalid Permission Code", error.Message);
    }
}
