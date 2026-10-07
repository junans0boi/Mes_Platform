namespace MesPlatform.Worker.Safety;

/// <summary>Worker를 시작해도 되는지의 판단. <see cref="ReasonCode"/>는 안정적인 식별자라 로그·알림이 그대로 쓴다.</summary>
public sealed record WorkerStartDecision(bool Allowed, string ReasonCode)
{
    public const string Disabled = "WORKER_DISABLED";
    public const string RoleInvalid = "WORKER_ROLE_INVALID";
    public const string DatabaseBlocked = "DATABASE_BLOCKED";
    public const string DatabaseNameMissing = "DATABASE_NAME_MISSING";
    public const string AllowedCode = "WORKER_ALLOWED";

    /// <summary>의도적으로 꺼 둔 경우(정상 종료)와 안전 장치가 막은 경우(오류 종료)를 구분한다.</summary>
    public int ExitCode => Allowed || ReasonCode == Disabled ? 0 : 2;
}
