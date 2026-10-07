using Microsoft.Data.SqlClient;
using System.Reflection;
using Xunit;

namespace MesPlatform.Infrastructure.Tests.Database;

// Trait(Category, "SqlIntegration") — 실제 DB가 필요한 테스트.
// MES_TEST_CONNECTION_STRING이 없으면 명확한 메시지와 함께 즉시 실패한다.
// 연결 문자열에 운영 DB 패턴(prod, .msmes., 10.0.0.)이 있으면 실패한다.
public sealed class MigrationTests
{
    private static string GetConnectionString()
    {
        var conn = Environment.GetEnvironmentVariable("MES_TEST_CONNECTION_STRING");
        if (conn is null)
            throw new InvalidOperationException(
                "MES_TEST_CONNECTION_STRING 환경 변수가 없습니다. " +
                "전용 테스트 DB 연결 문자열을 설정한 뒤 실행하세요. " +
                "운영 DB 연결 문자열은 사용하지 마세요.");
        AssertNotProductionDatabase(conn);
        return conn;
    }

    private static string GetMigrationsDir()
    {
        var dir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        var current = new DirectoryInfo(dir);
        while (current != null && !File.Exists(Path.Combine(current.FullName, "MesPlatform.sln")))
            current = current.Parent;
        return current != null
            ? Path.Combine(current.FullName, "database", "migrations")
            : string.Empty;
    }

    [Trait("Category", "SqlIntegration")]
    [Fact]
    public async Task Scripts_apply_idempotently_on_database()
    {
        var connectionString = GetConnectionString();
        var migrationsDir = GetMigrationsDir();
        Assert.True(Directory.Exists(migrationsDir),
            $"database/migrations 디렉터리를 찾지 못했습니다: {migrationsDir}");

        var scripts = Directory.GetFiles(migrationsDir, "*.sql")
            .OrderBy(Path.GetFileName)
            .ToList();
        Assert.NotEmpty(scripts);

        // 첫 번째 적용
        await ApplyAllAsync(scripts, connectionString);

        // 두 번째 적용 — 멱등성 검증 (오류 없이 통과해야 한다)
        await ApplyAllAsync(scripts, connectionString);

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // WorkOrder RowVersion이 timestamp(rowversion의 기술 이름) 타입이어야 한다
        var rowVersionType = await conn.QuerySingleAsync<string>(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS " +
            "WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='WorkOrder' AND COLUMN_NAME='RowVersion'");
        Assert.Equal("timestamp", rowVersionType);

        // Status에 CHECK 제약이 없어야 한다 (BE-06 전이 규칙은 Application 계층)
        var checkCount = await conn.QuerySingleAsync<int>(
            "SELECT COUNT(*) FROM sys.check_constraints cc " +
            "JOIN sys.columns c ON cc.parent_object_id=c.object_id AND cc.parent_column_id=c.column_id " +
            "WHERE OBJECT_NAME(cc.parent_object_id)='WorkOrder' AND c.name='Status'");
        Assert.Equal(0, checkCount);

        // index 7종이 모두 있어야 한다 (database design §4.2)
        var indexNames = (await conn.QueryAsync<string>(
            "SELECT name FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WorkOrder') AND name IS NOT NULL"))
            .ToHashSet();
        Assert.Contains("IX_WorkOrder_PlantId_PlannedStartAt_WorkOrderId", indexNames);
        Assert.Contains("UQ_WorkOrder_PlantId_WorkOrderNumber", indexNames);
        Assert.Contains("IX_WorkOrder_PlantId_Status_WorkOrderId", indexNames);
        Assert.Contains("IX_WorkOrder_PlantId_Status_PlannedStartAt_WorkOrderId", indexNames);
        Assert.Contains("IX_WorkOrder_PlantId_Priority_WorkOrderId", indexNames);
        Assert.Contains("IX_WorkOrder_PlantId_LineId_PlannedStartAt_WorkOrderId", indexNames);
        Assert.Contains("IX_WorkOrder_PlantId_ProductModelId_PlannedStartAt_WorkOrderId", indexNames);

        // Plant.PlantId가 int NOT NULL PK인지 확인
        var plantPkType = await conn.QuerySingleAsync<string>(
            "SELECT c.DATA_TYPE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc " +
            "JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME " +
            "JOIN INFORMATION_SCHEMA.COLUMNS c ON kcu.TABLE_NAME=c.TABLE_NAME AND kcu.COLUMN_NAME=c.COLUMN_NAME " +
            "WHERE tc.TABLE_NAME='Plant' AND tc.CONSTRAINT_TYPE='PRIMARY KEY' AND kcu.COLUMN_NAME='PlantId'");
        Assert.Equal("int", plantPkType);
    }

    private static void AssertNotProductionDatabase(string conn)
    {
        string[] prodPatterns = ["prod", ".msmes.", "10.0.0."];
        foreach (var pat in prodPatterns)
            if (conn.Contains(pat, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"MES_TEST_CONNECTION_STRING에 운영 DB 패턴('{pat}')이 포함되어 있습니다.");
    }

    private static async Task ApplyAllAsync(List<string> scripts, string connectionString)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        foreach (var script in scripts)
        {
            var sql = await File.ReadAllTextAsync(script);
            foreach (var batch in sql.Split(
                ["\nGO\n", "\nGO\r\n", "\r\nGO\r\n", "\nGO"],
                StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = batch.Trim();
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed == "GO") continue;
                await using var cmd = new SqlCommand(trimmed, conn) { CommandTimeout = 60 };
                await cmd.ExecuteNonQueryAsync();
            }
        }
    }
}

file static class SqlConnectionExtensions
{
    internal static async Task<T> QuerySingleAsync<T>(this SqlConnection conn, string sql)
    {
        await using var cmd = new SqlCommand(sql, conn);
        var result = await cmd.ExecuteScalarAsync();
        return (T)Convert.ChangeType(result!, typeof(T));
    }

    internal static async Task<IEnumerable<T>> QueryAsync<T>(this SqlConnection conn, string sql)
    {
        var list = new List<T>();
        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            list.Add((T)Convert.ChangeType(reader[0]!, typeof(T)));
        return list;
    }
}
