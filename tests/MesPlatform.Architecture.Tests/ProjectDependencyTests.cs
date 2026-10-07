namespace MesPlatform.Architecture.Tests;

// 의존 방향: Domain ← Application ← Infrastructure ← Server/Worker. Contracts는 어떤 프로젝트도 참조하지 않는다.
public class ProjectDependencyTests
{
    private static readonly Dictionary<string, string[]> AllowedSource = new()
    {
        ["MesPlatform.Domain"] = [],
        ["MesPlatform.Contracts"] = [],
        ["MesPlatform.Application"] = ["MesPlatform.Domain"],
        ["MesPlatform.Infrastructure"] = ["MesPlatform.Application", "MesPlatform.Domain"],
        ["MesPlatform.Server"] = ["MesPlatform.Application", "MesPlatform.Contracts", "MesPlatform.Infrastructure"],
        ["MesPlatform.Worker"] = ["MesPlatform.Application", "MesPlatform.Infrastructure"],
    };

    private static readonly Dictionary<string, string[]> AllowedTests = new()
    {
        ["MesPlatform.Domain.Tests"] = ["MesPlatform.Domain"],
        ["MesPlatform.Application.Tests"] = ["MesPlatform.Application", "MesPlatform.Domain"],
        ["MesPlatform.Infrastructure.Tests"] = ["MesPlatform.Application", "MesPlatform.Domain", "MesPlatform.Infrastructure"],
        ["MesPlatform.Api.Tests"] = ["MesPlatform.Application", "MesPlatform.Contracts", "MesPlatform.Infrastructure", "MesPlatform.Server"],
        ["MesPlatform.Worker.Tests"] = ["MesPlatform.Application", "MesPlatform.Infrastructure", "MesPlatform.Worker"],
        ["MesPlatform.Architecture.Tests"] = [],
    };

    [Fact]
    public void Source_projects_have_exactly_the_allowed_project_references()
    {
        var actual = RepositoryLayout.ProjectFiles("src").ToDictionary(RepositoryLayout.Name, RepositoryLayout.ProjectReferences);

        Assert.Equal(AllowedSource.Keys.Order(), actual.Keys.Order());
        foreach (var (project, allowed) in AllowedSource)
        {
            Assert.True(allowed.Order().SequenceEqual(actual[project]), $"{project}의 프로젝트 참조가 허용 목록과 다릅니다: [{string.Join(", ", actual[project])}]");
        }
    }

    [Fact]
    public void Test_projects_have_exactly_the_allowed_project_references()
    {
        var actual = RepositoryLayout.ProjectFiles("tests").ToDictionary(RepositoryLayout.Name, RepositoryLayout.ProjectReferences);

        Assert.Equal(AllowedTests.Keys.Order(), actual.Keys.Order());
        foreach (var (project, allowed) in AllowedTests)
        {
            Assert.True(allowed.Order().SequenceEqual(actual[project]), $"{project}의 프로젝트 참조가 허용 목록과 다릅니다: [{string.Join(", ", actual[project])}]");
        }
    }

    [Fact]
    public void Dependency_graph_has_no_cycle_and_inner_layers_never_reference_outer_layers()
    {
        string[] order = ["MesPlatform.Domain", "MesPlatform.Application", "MesPlatform.Infrastructure", "MesPlatform.Server", "MesPlatform.Worker"];
        var rank = order.Select((name, i) => (name, i)).ToDictionary(x => x.name, x => x.i);
        rank["MesPlatform.Server"] = rank["MesPlatform.Worker"] = 3; // 실행 프로젝트는 같은 바깥 층

        foreach (var file in RepositoryLayout.ProjectFiles("src"))
        {
            var name = RepositoryLayout.Name(file);
            if (!rank.TryGetValue(name, out var self))
            {
                continue; // Contracts
            }

            foreach (var reference in RepositoryLayout.ProjectReferences(file).Where(rank.ContainsKey))
            {
                Assert.True(rank[reference] < self, $"{name}이 같은 층 또는 바깥 층 {reference}를 참조합니다.");
            }
        }
    }

    [Fact]
    public void Only_server_and_worker_are_executable_projects()
    {
        var executables = RepositoryLayout.ProjectFiles("src")
            .Where(f =>
            {
                var text = File.ReadAllText(f);
                return text.Contains("Microsoft.NET.Sdk.Web", StringComparison.Ordinal)
                    || text.Contains("<OutputType>Exe</OutputType>", StringComparison.Ordinal);
            })
            .Select(RepositoryLayout.Name)
            .Order();

        Assert.Equal(["MesPlatform.Server", "MesPlatform.Worker"], executables);
    }
}
