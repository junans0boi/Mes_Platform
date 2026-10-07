using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using MesPlatform.Api.Tests.Host;
using MesPlatform.Server.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authorization;

namespace MesPlatform.Api.Tests.Authorization;

public sealed class PermissionAuthorizationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Read = "Production.WorkOrder.Read";

    private HttpClient Client(string? token = null)
    {
        var client = factory.CreateClient();
        return token is null ? client : client.WithBearer(token);
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var doc = await response.ReadJsonAsync();
        Assert.Equal(code, doc.RootElement.GetProperty("code").GetString());
        Assert.Equal((int)status, doc.RootElement.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrEmpty(doc.RootElement.GetProperty("requestId").GetString()));
    }

    [Fact]
    public async Task No_token_returns_401()
    {
        var response = await Client().GetAsync("/_test/auth/read");

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "AUTHENTICATION_REQUIRED");
    }

    [Fact]
    public async Task Expired_token_returns_401()
    {
        var token = TestTokens.Create(permissions: [Read], lifetime: TimeSpan.FromMinutes(-10));

        var response = await Client(token).GetAsync("/_test/auth/read");

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "TOKEN_EXPIRED");
    }

    [Fact]
    public async Task Token_signed_with_another_key_returns_401()
    {
        var token = TestTokens.Create(permissions: [Read], signingKey: "another-signing-key-0123456789-abcdefghij");

        var response = await Client(token).GetAsync("/_test/auth/read");

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "TOKEN_INVALID");
    }

    [Fact]
    public async Task Unsigned_token_returns_401()
    {
        // header {"alg":"none"}, payload {"sub":"7","permission":"Production.WorkOrder.Read"}
        const string unsigned = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI3IiwicGVybWlzc2lvbiI6IlByb2R1Y3Rpb24uV29ya09yZGVyLlJlYWQifQ.";

        var response = await Client(unsigned).GetAsync("/_test/auth/read");

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "TOKEN_INVALID");
    }

    [Fact]
    public async Task Authenticated_user_without_the_permission_returns_403_with_the_missing_code()
    {
        var token = TestTokens.Create(permissions: ["System.Info.Read"]);

        var response = await Client(token).GetAsync("/_test/auth/read");

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "PERMISSION_DENIED");
        using var doc = await response.ReadJsonAsync();
        Assert.Equal(Read, doc.RootElement.GetProperty("args").GetProperty("permission").GetString());
    }

    [Fact]
    public async Task Authenticated_user_with_the_permission_is_allowed()
    {
        var token = TestTokens.Create(permissions: [Read]);

        var response = await Client(token).GetAsync("/_test/auth/read");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("permission", "/production/work-orders")]
    [InlineData("permission", "production.workorder.read")]
    [InlineData("permission", "Production.WorkOrder.Read ")]
    [InlineData("permission", "Production.WorkOrder.Reader")]
    [InlineData("menu", Read)]
    [InlineData("role", Read)]
    [InlineData("scope", Read)]
    public async Task Menu_paths_and_look_alike_claims_do_not_satisfy_a_Permission_Code(string claimType, string value)
    {
        var token = TestTokens.Create(extraClaims: [new Claim(claimType, value)]);

        var response = await Client(token).GetAsync("/_test/auth/read");

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "PERMISSION_DENIED");
    }

    [Fact]
    public async Task Plant_in_allowedPlantIds_is_allowed()
    {
        var token = TestTokens.Create(permissions: [Read], plantIds: [1, 2]);

        var response = await Client(token).GetAsync("/_test/auth/plant?plantId=2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Plant_outside_allowedPlantIds_returns_403()
    {
        var token = TestTokens.Create(permissions: [Read], plantIds: [1, 2]);

        var response = await Client(token).GetAsync("/_test/auth/plant?plantId=3");

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "PLANT_NOT_ALLOWED");
        using var doc = await response.ReadJsonAsync();
        Assert.Equal("3", doc.RootElement.GetProperty("args").GetProperty("plantId").GetString());
    }

    [Fact]
    public async Task Missing_plantId_returns_400()
    {
        var token = TestTokens.Create(permissions: [Read], plantIds: [1]);

        var response = await Client(token).GetAsync("/_test/auth/plant");

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "PLANT_ID_REQUIRED");
    }

    [Fact]
    public async Task A_header_never_selects_the_Plant()
    {
        var token = TestTokens.Create(permissions: [Read], plantIds: [1]);

        // 헤더가 허용 Plant(1)를 가리켜도 요청에 명시된 plantId(9)가 검증 대상이다.
        using var denied = new HttpRequestMessage(HttpMethod.Get, "/_test/auth/plant?plantId=9");
        denied.Headers.Add("X-Plant-Id", "1");
        var deniedResponse = await Client(token).SendAsync(denied);
        await AssertProblemAsync(deniedResponse, HttpStatusCode.Forbidden, "PLANT_NOT_ALLOWED");

        // 헤더만으로는 Plant를 지정할 수 없다.
        using var missing = new HttpRequestMessage(HttpMethod.Get, "/_test/auth/plant");
        missing.Headers.Add("X-Plant-Id", "1");
        var missingResponse = await Client(token).SendAsync(missing);
        await AssertProblemAsync(missingResponse, HttpStatusCode.BadRequest, "PLANT_ID_REQUIRED");
    }

    [Fact]
    public async Task Command_body_plantId_is_checked_against_allowedPlantIds()
    {
        var token = TestTokens.Create(permissions: [Read], plantIds: [1]);

        var allowed = await Client(token).PutAsJsonAsync("/_test/auth/plant-command", new { plantId = 1, note = "x" });
        Assert.Equal(HttpStatusCode.NoContent, allowed.StatusCode);

        var denied = await Client(token).PutAsJsonAsync("/_test/auth/plant-command", new { plantId = 2, note = "x" });
        await AssertProblemAsync(denied, HttpStatusCode.Forbidden, "PLANT_NOT_ALLOWED");
    }

    [Fact]
    public async Task Plant_scoped_action_without_a_token_returns_401()
    {
        var response = await Client().GetAsync("/_test/auth/plant-only?plantId=1");

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "AUTHENTICATION_REQUIRED");
    }

    [Fact]
    public void RequirePermission_rejects_menu_paths_and_empty_codes()
    {
        Assert.Throws<ArgumentException>(() => new RequirePermissionAttribute("/production/work-orders"));
        Assert.Throws<ArgumentException>(() => new RequirePermissionAttribute(""));
        Assert.Equal("Permission:Production.WorkOrder.Read", new RequirePermissionAttribute(Read).Policy);
    }

    [Theory]
    [InlineData("Permission:")]
    [InlineData("Permission:/production/work-orders")]
    [InlineData("Permission:production")]
    public async Task Policy_provider_does_not_build_a_policy_for_an_invalid_code(string policyName)
    {
        var provider = new PermissionPolicyProvider(Options.Create(new AuthorizationOptions()));

        Assert.Null(await provider.GetPolicyAsync(policyName));
    }

    [Fact]
    public async Task Policy_provider_builds_a_policy_for_a_valid_code_and_delegates_other_names()
    {
        var options = Options.Create(new AuthorizationOptions());
        options.Value.AddPolicy("Other", p => p.RequireAuthenticatedUser());
        var provider = new PermissionPolicyProvider(options);

        var policy = await provider.GetPolicyAsync("Permission:" + Read);
        Assert.Contains(policy!.Requirements, r => r is PermissionRequirement { PermissionCode: Read });
        Assert.NotNull(await provider.GetPolicyAsync("Other"));
        Assert.Null(await provider.GetPolicyAsync("Missing"));
    }
}
