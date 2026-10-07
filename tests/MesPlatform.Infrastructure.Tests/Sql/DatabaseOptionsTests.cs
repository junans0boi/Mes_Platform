using MesPlatform.Infrastructure.Sql;
using Xunit;

namespace MesPlatform.Infrastructure.Tests.Sql;

public sealed class DatabaseOptionsTests
{
    [Fact]
    public void Validate_throws_when_connection_string_is_empty()
    {
        var options = new DatabaseOptions { ConnectionString = "" };
        Assert.Throws<InvalidOperationException>(options.Validate);
    }

    [Fact]
    public void Validate_throws_when_connection_string_is_whitespace()
    {
        var options = new DatabaseOptions { ConnectionString = "   " };
        Assert.Throws<InvalidOperationException>(options.Validate);
    }

    [Fact]
    public void Default_timeouts_are_30_and_120_seconds()
    {
        var options = new DatabaseOptions();
        Assert.Equal(30, options.DefaultCommandTimeoutSeconds);
        Assert.Equal(120, options.LongCommandTimeoutSeconds);
    }

    [Fact]
    public void Default_application_name_is_MesPlatform()
    {
        var options = new DatabaseOptions();
        Assert.Equal("MesPlatform", options.ApplicationName);
    }

    [Fact]
    public void Validate_succeeds_with_valid_connection_string()
    {
        var options = new DatabaseOptions
        {
            ConnectionString = "Server=localhost;Database=Test;Trusted_Connection=True;"
        };
        options.Validate(); // 예외 없음
    }
}
