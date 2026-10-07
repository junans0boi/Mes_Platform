using System.Net;
using System.Security.Claims;
using MesPlatform.Api.Tests.Authorization;
using MesPlatform.Api.Tests.Host;
using MesPlatform.Application.Common.Operations;
using MesPlatform.Infrastructure;
using MesPlatform.Infrastructure.Observability;
using MesPlatform.Server.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace MesPlatform.Api.Tests.Observability;

public sealed class OperationHeaderTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static void AssertHeaders(HttpResponseMessage response, out string requestId, out string operationId)
    {
        requestId = Assert.Single(response.Headers.GetValues("X-Request-Id"));
        operationId = Assert.Single(response.Headers.GetValues("X-Operation-Id"));
        Assert.True(Guid.TryParse(requestId, out _));
        Assert.True(Guid.TryParse(operationId, out _));
    }

    [Fact]
    public async Task Successful_response_has_request_and_operation_ids()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertHeaders(response, out _, out _);
    }

    [Fact]
    public async Task A_valid_incoming_request_id_is_echoed_and_an_invalid_one_is_replaced()
    {
        using var client = factory.CreateClient();
        var sent = Guid.NewGuid().ToString();

        using var valid = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        valid.Headers.Add("X-Request-Id", sent);
        AssertHeaders(await client.SendAsync(valid), out var echoed, out _);
        Assert.Equal(sent, echoed);

        using var invalid = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        invalid.Headers.Add("X-Request-Id", "not-a-guid");
        AssertHeaders(await client.SendAsync(invalid), out var replaced, out _);
        Assert.NotEqual("not-a-guid", replaced);
    }

    [Theory]
    [InlineData("/_test/auth/read", null, HttpStatusCode.Unauthorized)]
    [InlineData("/_test/auth/read", "no-permission", HttpStatusCode.Forbidden)]
    [InlineData("/_test/auth/plant", "no-plant", HttpStatusCode.BadRequest)]
    [InlineData("/api/v1/auth/session", "garbage", HttpStatusCode.Unauthorized)]
    [InlineData("/_test/does-not-exist", null, HttpStatusCode.NotFound)]
    public async Task Failed_requests_keep_the_request_and_operation_ids(string path, string? tokenKind, HttpStatusCode expected)
    {
        using var client = factory.CreateClient();
        if (tokenKind == "garbage")
        {
            client.WithBearer("garbage");
        }
        else if (tokenKind is not null)
        {
            client.WithBearer(TestTokens.Create(
                permissions: tokenKind == "no-plant" ? ["Production.WorkOrder.Read"] : ["System.Info.Read"],
                plantIds: [1]));
        }

        var response = await client.GetAsync(path);

        Assert.Equal(expected, response.StatusCode);
        AssertHeaders(response, out _, out _);
    }

    [Fact]
    public async Task Unexpected_error_keeps_the_ids_and_the_body_matches_the_headers()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/_test/unknown-error");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        AssertHeaders(response, out var requestId, out var operationId);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal(requestId, doc.RootElement.GetProperty("requestId").GetString());
        Assert.Equal(operationId, doc.RootElement.GetProperty("operationId").GetString());
    }

    [Fact]
    public async Task Problem_body_ids_match_the_response_headers_for_authorization_failures()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/_test/auth/read");

        AssertHeaders(response, out var requestId, out var operationId);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal(requestId, doc.RootElement.GetProperty("requestId").GetString());
        Assert.Equal(operationId, doc.RootElement.GetProperty("operationId").GetString());
    }
}

public sealed class OperationLogScopeMiddlewareTests
{
    private sealed class RecordingLogger : ILogger<OperationLogScopeMiddleware>
    {
        public List<IEnumerable<KeyValuePair<string, object?>>> Scopes { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull
        {
            Scopes.Add((IEnumerable<KeyValuePair<string, object?>>)state);
            return NullScope.Instance;
        }

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();

            public void Dispose()
            {
            }
        }
    }

    [Fact]
    public async Task Scope_carries_the_fixed_properties_and_reflects_later_context_updates()
    {
        var accessor = new OperationContextAccessor();
        var requestId = Guid.NewGuid();
        accessor.Set(new OperationContext(requestId, Guid.NewGuid(), Guid.NewGuid(), Endpoint: "GET /api/v1/x"));
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", "77")], "test")),
        };
        var logger = new RecordingLogger();
        Dictionary<string, object?>? during = null;
        Dictionary<string, object?>? afterPlant = null;
        var middleware = new OperationLogScopeMiddleware(
            _ =>
            {
                during = logger.Scopes.Single().ToDictionary(p => p.Key, p => p.Value);
                accessor.Set(accessor.Current! with { PlantId = 5 });
                afterPlant = logger.Scopes.Single().ToDictionary(p => p.Key, p => p.Value);
                return Task.CompletedTask;
            },
            logger);

        await middleware.InvokeAsync(http, accessor);

        Assert.Equal(
            ["ActorUserId", "Endpoint", "OperationId", "PlantId", "RequestId", "TraceId", "UseCase"],
            during!.Keys.Order(StringComparer.Ordinal));
        Assert.Equal("77", during["ActorUserId"]);
        Assert.Equal(requestId, during["RequestId"]);
        Assert.Null(during["PlantId"]);
        Assert.Equal(5L, afterPlant!["PlantId"]);
    }

    [Fact]
    public async Task Anonymous_requests_have_no_actor()
    {
        var accessor = new OperationContextAccessor();
        accessor.Set(new OperationContext(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()));
        var logger = new RecordingLogger();
        var middleware = new OperationLogScopeMiddleware(_ => Task.CompletedTask, logger);

        await middleware.InvokeAsync(new DefaultHttpContext(), accessor);

        Assert.Null(accessor.Current!.ActorUserId);
    }
}
