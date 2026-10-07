using System.Text.RegularExpressions;

namespace MesPlatform.Architecture.Tests;

/// <summary>
/// Controller는 업무 기능이 소유하는 얇은 HTTP 어댑터다. 테이블 이름으로 열리는 범용 endpoint나 SQL 접근은 허용하지 않는다.
/// 제품 어셈블리를 로드하지 않고 소스를 읽어 검사하며, 검사 규칙 자체도 나쁜 예제로 검증한다.
/// </summary>
public partial class ControllerRulesTests
{
    private static IEnumerable<(string Path, string Text)> ServerSources() =>
        Directory.EnumerateFiles(Path.Combine(RepositoryLayout.Root, "src", "MesPlatform.Server"), "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                        && !p.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
            .Select(p => (p, File.ReadAllText(p)));

    // class Foo<T> : ControllerBase  /  class Foo : EntityController<T>
    [GeneratedRegex(@"class\s+\w+\s*<[^>]*>[^{;]*:[^{;]*\bController(Base)?\b|class\s+\w+[^{;]*:\s*[^{;]*\b\w*Controller\s*<")]
    private static partial Regex GenericController();

    // [Route("api/{entity}")], [HttpGet("{tableName}/{id}")] 같은 이름으로 대상을 고르는 route
    [GeneratedRegex(@"\[(Route|Http\w+)\(""[^""]*\{(entity|entityname|table|tablename|resource|type)(:[^}]*)?\}", RegexOptions.IgnoreCase)]
    private static partial Regex GenericRoute();

    [GeneratedRegex(@"\b(SqlConnection|SqlSession|SqlConnectionFactory|ITransactionRunner|Dapper|Microsoft\.Data\.SqlClient)\b")]
    private static partial Regex DataAccess();

    internal static bool HasGenericController(string source) => GenericController().IsMatch(source);

    internal static bool HasGenericRoute(string source) => GenericRoute().IsMatch(source);

    internal static bool HasDataAccess(string source) => DataAccess().IsMatch(source);

    [Fact]
    public void Server_defines_no_generic_controller()
    {
        var offenders = ServerSources().Where(s => HasGenericController(s.Text)).Select(s => s.Path).ToList();

        Assert.True(offenders.Count == 0, $"범용(제네릭) Controller가 있습니다: {string.Join(", ", offenders)}");
    }

    [Fact]
    public void Server_has_no_route_that_selects_an_entity_or_table_by_name()
    {
        var offenders = ServerSources().Where(s => HasGenericRoute(s.Text)).Select(s => s.Path).ToList();

        Assert.True(offenders.Count == 0, $"테이블·엔터티 이름으로 대상을 고르는 route가 있습니다: {string.Join(", ", offenders)}");
    }

    [Fact]
    public void Controllers_do_not_touch_SQL_access_types()
    {
        var controllers = ServerSources().Where(s => s.Path.Contains($"{Path.DirectorySeparatorChar}Controllers{Path.DirectorySeparatorChar}"));
        var offenders = controllers.Where(s => HasDataAccess(s.Text)).Select(s => s.Path).ToList();

        Assert.True(offenders.Count == 0, $"Controller가 SQL 접근 타입을 직접 씁니다: {string.Join(", ", offenders)}");
    }

    [Fact]
    public void Controller_classes_live_under_the_Controllers_folder()
    {
        var misplaced = ServerSources()
            .Where(s => Regex.IsMatch(s.Text, @"class\s+\w+Controller\b[^{;]*:\s*ControllerBase"))
            .Where(s => !s.Path.Contains($"{Path.DirectorySeparatorChar}Controllers{Path.DirectorySeparatorChar}"))
            .Select(s => s.Path)
            .ToList();

        Assert.True(misplaced.Count == 0, $"Controllers 폴더 밖에 Controller가 있습니다: {string.Join(", ", misplaced)}");
    }

    [Theory]
    [InlineData("public class EntityController<T> : ControllerBase { }")]
    [InlineData("public abstract class CrudController<TEntity, TKey> : Controller { }")]
    [InlineData("public class WorkOrderController : CrudController<WorkOrder> { }")]
    [InlineData("public sealed class GenericApi<T> : ControllerBase")]
    public void Detector_catches_generic_controllers(string source) => Assert.True(HasGenericController(source));

    [Theory]
    [InlineData("public sealed class WorkOrdersController : ControllerBase { }")]
    [InlineData("public sealed class PagedList<T> { }")]
    [InlineData("public sealed class AuthController(IUserAuthenticator a) : ControllerBase")]
    public void Detector_accepts_feature_controllers(string source) => Assert.False(HasGenericController(source));

    [Theory]
    [InlineData("[Route(\"api/v1/{entity}\")]")]
    [InlineData("[HttpGet(\"{tableName}/{id}\")]")]
    [InlineData("[Route(\"api/{Resource}\")]")]
    [InlineData("[HttpPost(\"{type:alpha}\")]")]
    public void Detector_catches_name_based_routes(string source) => Assert.True(HasGenericRoute(source));

    [Theory]
    [InlineData("[Route(\"api/v1/production/work-orders\")]")]
    [InlineData("[HttpGet(\"{workOrderId:long}\")]")]
    [InlineData("[HttpPut(\"{workOrderId}/status\")]")]
    public void Detector_accepts_feature_routes(string source) => Assert.False(HasGenericRoute(source));

    [Theory]
    [InlineData("using Microsoft.Data.SqlClient;")]
    [InlineData("private readonly SqlSession _session;")]
    [InlineData("conn.QueryAsync<X>(sql)  // Dapper")]
    public void Detector_catches_data_access(string source) => Assert.True(HasDataAccess(source));
}
