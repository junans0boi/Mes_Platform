using MesPlatform.Application.Common.Pagination;

namespace MesPlatform.Application.Tests.Common.Pagination;

public class CursorPageRequestTests
{
    [Fact]
    public void Default_limit_is_50_and_cursor_is_empty()
    {
        var result = CursorPageRequest.Create(null, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(50, result.Value.Limit);
        Assert.Null(result.Value.Cursor);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    [InlineData(200)]
    public void Limit_from_1_to_200_is_accepted(int limit)
    {
        var result = CursorPageRequest.Create(null, limit);

        Assert.True(result.IsSuccess);
        Assert.Equal(limit, result.Value.Limit);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(201)]
    public void Invalid_limit_is_rejected_with_stable_code(int limit)
    {
        var result = CursorPageRequest.Create(null, limit);

        Assert.False(result.IsSuccess);
        Assert.Equal("PAGING_LIMIT_INVALID", result.Error.Code);
    }

    [Theory]
    [InlineData("has space")]
    [InlineData("a/b+c")]
    [InlineData("%%%")]
    [InlineData("{\"id\":1}")]
    public void Malformed_cursor_is_rejected(string cursor)
    {
        var result = CursorPageRequest.Create(cursor, 10);

        Assert.False(result.IsSuccess);
        Assert.Equal("PAGING_CURSOR_INVALID", result.Error.Code);
    }

    [Fact]
    public void Cursor_longer_than_limit_is_rejected()
    {
        var result = CursorPageRequest.Create(new string('a', CursorPageRequest.MaxCursorLength + 1), 10);

        Assert.False(result.IsSuccess);
        Assert.Equal("PAGING_CURSOR_INVALID", result.Error.Code);
    }

    [Theory]
    [InlineData("eyJzIjoiLXAiLCJpIjoxMDF9")]
    [InlineData("abc-_123")]
    [InlineData("YWJj==")]
    public void Opaque_base64url_cursor_is_accepted_unchanged(string cursor)
    {
        var result = CursorPageRequest.Create(cursor, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(cursor, result.Value.Cursor);
    }

    [Fact]
    public void Blank_cursor_means_first_page()
    {
        var result = CursorPageRequest.Create("  ", 10);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.Cursor);
    }
}
