using System.Net;
using System.Text.Json;
using MesPlatform.Api.Tests.Host;
using MesPlatform.Application.Common.Errors;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Xunit;

namespace MesPlatform.Api.Tests.Errors;

/// <summary>
/// 예외 핸들러 테스트용 컨트롤러 — 테스트 어셈블리에만 존재
/// </summary>
[ApiController]
[Route("_test")]
public sealed class TestThrowController : ControllerBase
{
    [HttpGet("application-error")]
    public IActionResult ThrowApplicationError()
        => throw new ApplicationLayerException(new ApplicationError("TEST_CODE", "test.key"));

    [HttpGet("unknown-error")]
    public IActionResult ThrowUnknownError()
        => throw new InvalidOperationException("Server=secrethost;Database=secretdb;Password=secret123");
}

public sealed class MesExceptionHandlerTests
{
    // ApplicationLayerException → 422 + code
    [Fact]
    public async Task ApplicationLayerException_maps_to_422_with_code()
    {
        using var factory = new ExceptionTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/_test/application-error");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("TEST_CODE", body);
    }

    // 알 수 없는 예외 → 500, SQL 텍스트 노출 없음
    [Fact]
    public async Task UnknownException_maps_to_500_without_sql_text()
    {
        using var factory = new ExceptionTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/_test/unknown-error");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("UNEXPECTED_ERROR", body);
        Assert.DoesNotContain("secrethost", body);
        Assert.DoesNotContain("secret123", body);
    }

    // Problem Details에 requestId가 포함된다
    [Fact]
    public async Task Problem_details_includes_requestId()
    {
        using var factory = new ExceptionTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/_test/application-error");
        var body = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("requestId", out _));
    }
}

internal sealed class ExceptionTestFactory : ConfiguredApiFactory;
