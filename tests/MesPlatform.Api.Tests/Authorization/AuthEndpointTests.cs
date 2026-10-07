using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MesPlatform.Api.Tests.Host;

namespace MesPlatform.Api.Tests.Authorization;

public sealed class AuthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private HttpClient Client() => factory.CreateClient();

    [Fact]
    public async Task Login_returns_an_access_token_envelope_and_no_refresh_token_or_cookie()
    {
        var response = await Client().PostAsJsonAsync("/api/v1/auth/login", new { userName = "alice", password = "alice-pass" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        using var doc = await response.ReadJsonAsync();
        var data = doc.RootElement.GetProperty("data");
        Assert.False(string.IsNullOrEmpty(data.GetProperty("accessToken").GetString()));
        Assert.Equal("Bearer", data.GetProperty("tokenType").GetString());
        Assert.Equal(15 * 60, data.GetProperty("expiresInSeconds").GetInt32());
        Assert.Equal(["accessToken", "expiresInSeconds", "tokenType"], data.EnumerateObject().Select(p => p.Name).Order());
        var meta = doc.RootElement.GetProperty("meta");
        Assert.True(Guid.TryParse(meta.GetProperty("requestId").GetString(), out _));
        Assert.Equal(response.Headers.GetValues("X-Request-Id").Single(), meta.GetProperty("requestId").GetString());
    }

    [Theory]
    [InlineData("alice", "wrong")]
    [InlineData("nobody", "alice-pass")]
    [InlineData("ALICE", "Alice-Pass")]
    public async Task Login_with_bad_credentials_returns_the_same_401(string userName, string password)
    {
        var response = await Client().PostAsJsonAsync("/api/v1/auth/login", new { userName, password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal("INVALID_CREDENTIALS", doc.RootElement.GetProperty("code").GetString());
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Login_with_missing_fields_returns_400_with_field_errors()
    {
        var response = await Client().PostAsJsonAsync("/api/v1/auth/login", new { userName = " " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal("VALIDATION_FAILED", doc.RootElement.GetProperty("code").GetString());
        var fields = doc.RootElement.GetProperty("errors").EnumerateArray().Select(e => e.GetProperty("field").GetString());
        Assert.Equal(["password", "userName"], fields.Order());
    }

    [Fact]
    public async Task Login_with_a_malformed_body_returns_a_Problem_Details_400()
    {
        using var content = new StringContent("{not json", System.Text.Encoding.UTF8, "application/json");

        var response = await Client().PostAsync("/api/v1/auth/login", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal("VALIDATION_FAILED", doc.RootElement.GetProperty("code").GetString());
        Assert.False(string.IsNullOrEmpty(doc.RootElement.GetProperty("requestId").GetString()));
    }

    [Fact]
    public async Task Session_returns_user_allowed_plants_and_capabilities_matching_the_contract()
    {
        var client = Client();
        client.WithBearer(await client.LoginAsync("alice", "alice-pass"));

        var response = await client.GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = await response.ReadJsonAsync();
        var data = doc.RootElement.GetProperty("data");
        Assert.Equal(1001, data.GetProperty("userId").GetInt64());
        Assert.Equal("alice", data.GetProperty("userName").GetString());
        Assert.Equal("Alice Kim", data.GetProperty("displayName").GetString());
        Assert.Equal([1, 2], data.GetProperty("allowedPlantIds").EnumerateArray().Select(e => e.GetInt32()));
        Assert.Equal(
            ["Production.WorkOrder.Read", "System.Info.Read"],
            data.GetProperty("capabilities").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal(
            ["allowedPlantIds", "capabilities", "displayName", "userId", "userName"],
            data.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.True(doc.RootElement.GetProperty("meta").TryGetProperty("operationId", out _));
    }

    [Fact]
    public async Task Session_keeps_nullable_keys_present()
    {
        var client = Client();
        client.WithBearer(await client.LoginAsync("bob", "bob-pass"));

        var response = await client.GetAsync("/api/v1/auth/session");

        using var doc = await response.ReadJsonAsync();
        var data = doc.RootElement.GetProperty("data");
        Assert.Equal(JsonValueKind.Null, data.GetProperty("displayName").ValueKind);
        Assert.Empty(data.GetProperty("allowedPlantIds").EnumerateArray());
        Assert.Empty(data.GetProperty("capabilities").EnumerateArray());
    }

    [Fact]
    public async Task Session_without_a_token_returns_401()
    {
        var response = await Client().GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal("AUTHENTICATION_REQUIRED", doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task System_info_requires_the_System_Info_Read_permission()
    {
        var anonymous = await Client().GetAsync("/api/v1/system/info");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var bob = Client();
        bob.WithBearer(await bob.LoginAsync("bob", "bob-pass"));
        Assert.Equal(HttpStatusCode.Forbidden, (await bob.GetAsync("/api/v1/system/info")).StatusCode);

        var alice = Client();
        alice.WithBearer(await alice.LoginAsync("alice", "alice-pass"));
        Assert.Equal(HttpStatusCode.OK, (await alice.GetAsync("/api/v1/system/info")).StatusCode);
    }

    [Fact]
    public async Task Login_token_is_accepted_by_the_permission_pipeline_end_to_end()
    {
        var client = Client();
        client.WithBearer(await client.LoginAsync("alice", "alice-pass"));

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/_test/auth/plant?plantId=1")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/_test/auth/plant?plantId=3")).StatusCode);
    }
}
