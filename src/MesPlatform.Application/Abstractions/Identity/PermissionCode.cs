namespace MesPlatform.Application.Abstractions.Identity;

/// <summary>
/// Permission Code 형식 규칙. <c>Module.Resource.Action</c>처럼 점으로 구분된 세 개 이상의 PascalCase 조각이다
/// (예 <c>Production.WorkOrder.Read</c>). 메뉴 경로(<c>/production/work-orders</c>)는 Permission Code가 아니다.
/// </summary>
public static class PermissionCode
{
    private const int MinSegments = 3;

    public static bool IsValid(string? code)
    {
        if (string.IsNullOrEmpty(code))
        {
            return false;
        }

        var segments = code.Split('.');
        return segments.Length >= MinSegments && segments.All(IsSegment);
    }

    private static bool IsSegment(string segment) =>
        segment.Length > 0
        && segment[0] is >= 'A' and <= 'Z'
        && segment.All(c => c is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9');
}
