using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MesPlatform.Contracts.Common;
using MesPlatform.Server.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MesPlatform.Api.Tests.Authorization;

/// <summary>권한·Plant 검증용 테스트 전용 endpoint. 실제 업무 endpoint(BE-07 이후)가 쓸 속성 조합과 같다.</summary>
[ApiController]
[Route("_test/auth")]
public sealed class TestProtectedController : ControllerBase
{
    public sealed record TestCommand(int PlantId, string Note) : IPlantScoped;

    [RequirePermission("Production.WorkOrder.Read")]
    [HttpGet("read")]
    public IActionResult Read() => Ok();

    [RequirePermission("Production.WorkOrder.Read")]
    [PlantScoped]
    [HttpGet("plant")]
    public IActionResult ReadPlant([FromQuery] int plantId) => Ok(new { plantId });

    [RequirePermission("Production.WorkOrder.Read")]
    [PlantScoped]
    [HttpPut("plant-command")]
    public IActionResult Command([FromBody] TestCommand command) => NoContent();

    // 권한 속성 없이 Plant 범위만 표시한 action. 인증되지 않은 요청은 401이어야 한다.
    [PlantScoped]
    [HttpGet("plant-only")]
    public IActionResult PlantOnly([FromQuery] int plantId) => Ok(new { plantId });
}

internal static class HttpTestExtensions
{
    public static HttpClient WithBearer(this HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public static async Task<string> LoginAsync(this HttpClient client, string userName, string password)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { userName, password });
        response.EnsureSuccessStatusCode();
        using var doc = await ReadJsonAsync(response);
        return doc.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!;
    }

    public static async Task<JsonDocument> ReadJsonAsync(this HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync());
}
