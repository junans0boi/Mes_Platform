namespace MesPlatform.Application.Common.Pagination;

/// <summary>cursor 목록 응답. 페이지 번호와 전체 건수는 제공하지 않는다.</summary>
public sealed record CursorPage<T>(IReadOnlyList<T> Items, string? NextCursor, bool HasMore, DateTimeOffset AsOf);
