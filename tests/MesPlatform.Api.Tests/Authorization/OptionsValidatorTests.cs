using MesPlatform.Infrastructure.Identity;
using MesPlatform.Server.Authentication;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace MesPlatform.Api.Tests.Authorization;

/// <summary>시작 거부 사유는 호스트를 띄우지 않고 검증기 자체로 확인한다(호스트 시작 실패의 정리 타이밍에 의존하지 않는다).</summary>
public sealed class OptionsValidatorTests
{
    private sealed class FakeEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;

        public string ApplicationName { get; set; } = "Test";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static DevelopmentAuthenticatorOptionsValidator Dev(string environment) => new(new FakeEnvironment(environment));

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void Development_authenticator_is_refused_outside_Development_and_Testing(string environment)
    {
        var result = Dev(environment).Validate(null, new DevelopmentAuthenticatorOptions { Enabled = true });

        Assert.True(result.Failed);
        Assert.Contains("only allowed in Development or Testing", result.FailureMessage);
        Assert.Contains($"'{environment}'", result.FailureMessage);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    public void Development_authenticator_is_allowed_in_Development_and_Testing(string environment) =>
        Assert.True(Dev(environment).Validate(null, new DevelopmentAuthenticatorOptions { Enabled = true }).Succeeded);

    [Fact]
    public void Disabled_authenticator_is_always_valid() =>
        Assert.True(Dev("Production").Validate(null, new DevelopmentAuthenticatorOptions { Enabled = false }).Succeeded);

    [Fact]
    public void Menu_paths_duplicates_and_blank_credentials_are_rejected()
    {
        var options = new DevelopmentAuthenticatorOptions
        {
            Enabled = true,
            Users =
            [
                new DevelopmentUser { UserName = "a", Password = "x", Permissions = ["/production/work-orders"] },
                new DevelopmentUser { UserName = "A", Password = "y" },
                new DevelopmentUser { UserName = "", Password = "" },
            ],
        };

        var message = Dev("Testing").Validate(null, options).FailureMessage;

        Assert.Contains("invalid Permission Code", message);
        Assert.Contains("must be unique", message);
        Assert.Contains("UserName and a Password", message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("too-short")]
    public void Short_or_missing_signing_key_is_rejected(string key)
    {
        var result = new JwtOptionsValidator().Validate(null, new JwtOptions { SigningKey = key });

        Assert.True(result.Failed);
        Assert.Contains("SigningKey", result.FailureMessage);
    }

    [Fact]
    public void Valid_jwt_options_pass() =>
        Assert.True(new JwtOptionsValidator().Validate(null, new JwtOptions { SigningKey = new string('k', 32) }).Succeeded);

    [Theory]
    [InlineData(0)]
    [InlineData(2000)]
    public void Access_token_lifetime_must_be_in_range(int minutes) =>
        Assert.True(new JwtOptionsValidator().Validate(null, new JwtOptions { SigningKey = new string('k', 32), AccessTokenMinutes = minutes }).Failed);
}
