namespace MesPlatform.Application.Abstractions.Auditing;

/// <summary>감사 기록 seam. SQL 구현은 DB를 쓰는 첫 수직 기능이 생길 때 추가한다.</summary>
public interface IAuditWriter
{
    Task WriteAsync(AuditEntry entry, CancellationToken cancellationToken);
}
