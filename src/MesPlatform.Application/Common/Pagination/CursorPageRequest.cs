using System.Text.RegularExpressions;
using MesPlatform.Application.Common.Errors;
using MesPlatform.Application.Common.Results;

namespace MesPlatform.Application.Common.Pagination;

/// <summary>
/// cursor 목록 요청. 잘못된 limit과 형식이 깨진 cursor는 DB 어댑터를 호출하기 전에 여기서 거절한다.
/// cursor는 서버가 만든 base64url 불투명 문자열이며, 정렬 키 일치 검사(CURSOR_SORT_MISMATCH)는 각 Query가 한다.
/// </summary>
public sealed partial record CursorPageRequest
{
    public const int DefaultLimit = 50;
    public const int MaxLimit = 200;
    public const int MaxCursorLength = 2048;

    private CursorPageRequest(string? cursor, int limit)
    {
        Cursor = cursor;
        Limit = limit;
    }

    public string? Cursor { get; }

    public int Limit { get; }

    public static Result<CursorPageRequest> Create(string? cursor, int? limit)
    {
        var effectiveLimit = limit ?? DefaultLimit;
        if (effectiveLimit is < 1 or > MaxLimit)
        {
            return Result<CursorPageRequest>.Failure(new ApplicationError(
                "PAGING_LIMIT_INVALID",
                "paging.limit.invalid",
                new Dictionary<string, string> { ["min"] = "1", ["max"] = MaxLimit.ToString(System.Globalization.CultureInfo.InvariantCulture) }));
        }

        if (string.IsNullOrWhiteSpace(cursor))
        {
            return Result<CursorPageRequest>.Success(new CursorPageRequest(null, effectiveLimit));
        }

        if (cursor.Length > MaxCursorLength || !Base64UrlPattern().IsMatch(cursor))
        {
            return Result<CursorPageRequest>.Failure(new ApplicationError("PAGING_CURSOR_INVALID", "paging.cursor.invalid"));
        }

        return Result<CursorPageRequest>.Success(new CursorPageRequest(cursor, effectiveLimit));
    }

    [GeneratedRegex("^[A-Za-z0-9_-]+={0,2}$")]
    private static partial Regex Base64UrlPattern();
}
