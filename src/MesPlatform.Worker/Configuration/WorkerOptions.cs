namespace MesPlatform.Worker.Configuration;

/// <summary>
/// Worker 실행 조건. 모든 기본값은 "아무것도 하지 않음"이다. 개발 환경에서 운영 DB에 연결해도 Worker가
/// 자동으로 시작되지 않도록, 켜려면 <see cref="Enabled"/>와 <see cref="ProcessRole"/>을 둘 다 명시해야 한다.
/// </summary>
public sealed class WorkerOptions
{
    public const string Section = "Worker";
    public const string RequiredProcessRole = "Worker";

    public bool Enabled { get; set; }

    /// <summary>이 프로세스의 역할. <c>Worker</c>일 때만 Job을 시작한다. 비어 있으면 거부한다(API 설정을 공유해도 안전).</summary>
    public string ProcessRole { get; set; } = string.Empty;

    /// <summary>시작을 거부할 DB 이름. 대소문자를 구분하지 않는다. 이름에 <c>prod</c>가 들어 있으면 이 목록과 무관하게 거부한다.</summary>
    public List<string> BlockedDatabaseNames { get; set; } = [];

    public TimeSpan HeartbeatInterval { get; set; } = TimeSpan.FromSeconds(30);
}
