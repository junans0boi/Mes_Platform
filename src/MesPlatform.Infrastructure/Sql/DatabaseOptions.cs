namespace MesPlatform.Infrastructure.Sql;

public sealed class DatabaseOptions
{
    public const string Section = "Database";

    public string ConnectionString { get; set; } = string.Empty;
    public int DefaultCommandTimeoutSeconds { get; set; } = 30;
    public int LongCommandTimeoutSeconds { get; set; } = 120;
    public string ApplicationName { get; set; } = "MesPlatform";

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString))
            throw new InvalidOperationException(
                $"{Section}:{nameof(ConnectionString)}이 설정되지 않았습니다.");
    }
}
