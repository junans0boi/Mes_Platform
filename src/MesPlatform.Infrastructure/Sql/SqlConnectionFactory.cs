using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace MesPlatform.Infrastructure.Sql;

public sealed class SqlConnectionFactory(IOptions<DatabaseOptions> options)
{
    private readonly DatabaseOptions _options = options.Value;

    public async Task<SqlConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        var builder = new SqlConnectionStringBuilder(_options.ConnectionString)
        {
            ApplicationName = _options.ApplicationName,
        };
        var conn = new SqlConnection(builder.ConnectionString);
        await conn.OpenAsync(cancellationToken);
        return conn;
    }
}
