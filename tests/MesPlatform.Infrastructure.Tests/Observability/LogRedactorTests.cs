using MesPlatform.Application.Common.Operations;
using MesPlatform.Infrastructure.Observability;

namespace MesPlatform.Infrastructure.Tests.Observability;

public class LogRedactorTests
{
    [Theory]
    [InlineData("Authorization: Bearer abc.def-ghi_123", "abc.def")]
    [InlineData("Server=db;Database=Mes;User Id=sa;Password=Sup3rSecret!;Encrypt=true", "Sup3rSecret")]
    [InlineData("pwd=hunter2&user=bob", "hunter2")]
    [InlineData("{\"password\": \"hunter2\"}", "hunter2")]
    [InlineData("token=abcdef123456", "abcdef123456")]
    [InlineData("signed eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl end", "eyJhbGci")]
    [InlineData("ConnectionString=Server=secrethost;Database=x", "secrethost")]
    public void Secret_values_are_masked(string input, string secret)
    {
        var redacted = LogRedactor.Redact(input);

        Assert.DoesNotContain(secret, redacted);
        Assert.Contains(LogRedactor.Mask, redacted);
    }

    [Fact]
    public void Masking_keeps_the_key_and_the_separator() =>
        Assert.Equal("user=bob&password=[REDACTED]", LogRedactor.Redact("user=bob&password=hunter2"));

    [Theory]
    [InlineData("GET /api/v1/production/work-orders")]
    [InlineData("ChangeWorkOrderStatus")]
    [InlineData("")]
    public void Plain_text_is_unchanged(string input) => Assert.Equal(input, LogRedactor.Redact(input));

    [Fact]
    public void Null_stays_null() => Assert.Null(LogRedactor.Redact(null));

    [Fact]
    public void Operation_properties_use_the_fixed_names_and_redact_free_text()
    {
        var requestId = Guid.NewGuid();
        var operationId = Guid.NewGuid();
        var context = new OperationContext(
            requestId,
            operationId,
            Guid.NewGuid(),
            ActorUserId: "42",
            PlantId: 3,
            Endpoint: "POST /api/v1/auth/login?password=hunter2",
            CommandName: "Login");

        var properties = OperationLogScope.Properties(context, "trace-1").ToDictionary(p => p.Key, p => p.Value);

        Assert.Equal(
            ["ActorUserId", "Endpoint", "OperationId", "PlantId", "RequestId", "TraceId", "UseCase"],
            properties.Keys.Order(StringComparer.Ordinal));
        Assert.Equal("trace-1", properties["TraceId"]);
        Assert.Equal(requestId, properties["RequestId"]);
        Assert.Equal(operationId, properties["OperationId"]);
        Assert.Equal("42", properties["ActorUserId"]);
        Assert.Equal(3L, properties["PlantId"]);
        Assert.DoesNotContain("hunter2", (string)properties["Endpoint"]!);
        Assert.Equal("Login", properties["UseCase"]);
    }

    [Fact]
    public void Properties_without_an_operation_context_are_present_and_null()
    {
        var properties = OperationLogScope.Properties(null, null);

        Assert.Equal(7, properties.Count);
        Assert.All(properties, p => Assert.Null(p.Value));
    }
}
