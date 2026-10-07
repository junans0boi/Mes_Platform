using MesPlatform.Application.Common.Errors;
using Microsoft.Data.SqlClient;

namespace MesPlatform.Infrastructure.Sql;

public static class SqlErrorMapper
{
    // SQL Server 오류 번호 → ApplicationError 코드 매핑
    // SQL 텍스트와 연결 문자열은 클라이언트에 노출하지 않는다.
    public static ApplicationError Map(SqlException ex)
    {
        var code = ex.Number switch
        {
            2627 or 2601 => "DATABASE_DUPLICATE_KEY",        // unique constraint violation
            547            => "DATABASE_FOREIGN_KEY_VIOLATION",
            1205            => "DATABASE_DEADLOCK",
            _              => "DATABASE_OPERATION_FAILED",
        };
        return new ApplicationError(code, $"errors.{code.ToLowerInvariant().Replace('_', '.')}");
    }
}
