namespace MesPlatform.Contracts.Common;

// CON-01: 목록 응답은 {data:{items,nextCursor,hasMore,asOf},meta} 형태다.
// PageResponse<T>가 ApiEnvelope<T>.Data 자리에 들어간다.
public sealed record PageResponse<T>(
    IReadOnlyList<T> Items,
    string? NextCursor,
    bool HasMore,
    DateTimeOffset AsOf);
