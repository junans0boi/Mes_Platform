using System.Text.Json;
using MesPlatform.Api.Tests.Authorization;
using MesPlatform.Contracts.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace MesPlatform.Api.Tests.Host;

public sealed class ContractShapeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task OpenApi_document_is_generated_and_lists_the_implemented_endpoints()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.True(response.IsSuccessStatusCode);
        using var doc = await response.ReadJsonAsync();
        var paths = doc.RootElement.GetProperty("paths").EnumerateObject().Select(p => p.Name).ToList();
        Assert.Contains("/api/v1/auth/login", paths);
        Assert.Contains("/api/v1/auth/session", paths);
    }

    [Fact]
    public void List_envelope_serializes_as_data_items_nextCursor_hasMore_asOf_with_meta()
    {
        var options = factory.Services.GetRequiredService<IOptions<Microsoft.AspNetCore.Mvc.JsonOptions>>().Value.JsonSerializerOptions;
        var page = new PageResponse<int>([1, 2], null, false, DateTimeOffset.Parse("2026-10-07T10:00:00Z"));
        var envelope = new ApiEnvelope<PageResponse<int>>(page, new ApiMeta(Guid.NewGuid(), null, DateTimeOffset.UtcNow));

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(envelope, options));

        var data = doc.RootElement.GetProperty("data");
        Assert.Equal(["asOf", "hasMore", "items", "nextCursor"], data.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(JsonValueKind.Null, data.GetProperty("nextCursor").ValueKind);
        var meta = doc.RootElement.GetProperty("meta");
        Assert.True(meta.TryGetProperty("requestId", out _));
        Assert.Equal(JsonValueKind.Null, meta.GetProperty("operationId").ValueKind);
    }
}
