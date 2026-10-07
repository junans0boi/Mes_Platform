using MesPlatform.Worker.Configuration;
using MesPlatform.Worker.Safety;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace MesPlatform.Worker.Tests.Worker;

public class DatabaseSafetyGuardTests
{
    private static DatabaseSafetyGuard Guard(bool enabled = true, string role = "Worker", params string[] blocked) =>
        new(Options.Create(new WorkerOptions { Enabled = enabled, ProcessRole = role, BlockedDatabaseNames = [.. blocked] }));

    [Fact]
    public async Task Disabled_worker_is_refused_even_when_everything_else_is_fine()
    {
        var decision = await Guard(enabled: false).ValidateAsync("MesPlatform_Test", default);

        Assert.False(decision.Allowed);
        Assert.Equal("WORKER_DISABLED", decision.ReasonCode);
        Assert.Equal(0, decision.ExitCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Api")]
    [InlineData("worker")]
    public async Task Wrong_or_missing_process_role_is_refused(string role)
    {
        var decision = await Guard(role: role).ValidateAsync("MesPlatform_Test", default);

        Assert.False(decision.Allowed);
        Assert.Equal("WORKER_ROLE_INVALID", decision.ReasonCode);
        Assert.Equal(2, decision.ExitCode);
    }

    [Theory]
    [InlineData("KditLive")]
    [InlineData("kditlive")]
    [InlineData("KDITLIVE")]
    [InlineData("  KditLive  ")]
    public async Task Blocked_database_is_refused_regardless_of_casing(string databaseName)
    {
        var decision = await Guard(blocked: "KditLive").ValidateAsync(databaseName, default);

        Assert.False(decision.Allowed);
        Assert.Equal("DATABASE_BLOCKED", decision.ReasonCode);
        Assert.Equal(2, decision.ExitCode);
    }

    [Theory]
    [InlineData("MesPlatform_Prod")]
    [InlineData("mesplatform_PRODUCTION")]
    [InlineData("Production")]
    public async Task Names_that_look_like_production_are_refused_without_being_listed(string databaseName)
    {
        var decision = await Guard().ValidateAsync(databaseName, default);

        Assert.Equal("DATABASE_BLOCKED", decision.ReasonCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Unknown_database_name_is_refused(string databaseName)
    {
        var decision = await Guard().ValidateAsync(databaseName, default);

        Assert.False(decision.Allowed);
        Assert.Equal("DATABASE_NAME_MISSING", decision.ReasonCode);
    }

    [Fact]
    public async Task Enabled_worker_with_the_right_role_and_an_unblocked_database_is_allowed()
    {
        var decision = await Guard(blocked: "KditLive").ValidateAsync("MesPlatform_Test", default);

        Assert.True(decision.Allowed);
        Assert.Equal("WORKER_ALLOWED", decision.ReasonCode);
        Assert.Equal(0, decision.ExitCode);
    }

    [Fact]
    public void Options_default_to_doing_nothing()
    {
        var options = new WorkerOptions();

        Assert.False(options.Enabled);
        Assert.Equal(string.Empty, options.ProcessRole);
        Assert.Empty(options.BlockedDatabaseNames);
    }
}

public class WorkerStartupTests
{
    private static IConfiguration Config(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values.ToDictionary(v => v.Key, v => v.Value)).Build();

    [Fact]
    public async Task Defaults_do_not_start_and_do_not_need_a_connection_string()
    {
        var decision = await WorkerStartup.EvaluateAsync(Config(), default);

        Assert.Equal("WORKER_DISABLED", decision.ReasonCode);
    }

    [Fact]
    public async Task Database_name_is_read_from_the_connection_string_without_connecting()
    {
        var config = Config(
            ("Worker:Enabled", "true"),
            ("Worker:ProcessRole", "Worker"),
            ("Worker:BlockedDatabaseNames:0", "mesplatform_test"),
            // 도달할 수 없는 서버. 연결을 시도하면 이 테스트는 오래 걸리거나 실패한다.
            ("Database:ConnectionString", "Server=203.0.113.1;Database=MesPlatform_Test;Connect Timeout=1"));

        var decision = await WorkerStartup.EvaluateAsync(config, default);

        Assert.Equal("DATABASE_BLOCKED", decision.ReasonCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("this is not a connection string")]
    public void Unreadable_connection_string_yields_no_database_name(string? connectionString) =>
        Assert.Equal(string.Empty, WorkerStartup.DatabaseName(Config(("Database:ConnectionString", connectionString))));
}
