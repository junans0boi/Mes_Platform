using System.Xml.Linq;

namespace MesPlatform.Architecture.Tests;

public class RepositoryPolicyTests
{
    private static IEnumerable<string> AllProjects => RepositoryLayout.ProjectFiles("src").Concat(RepositoryLayout.ProjectFiles("tests"));

    [Fact]
    public void Every_project_targets_net10_through_Directory_Build_props()
    {
        var props = XDocument.Load(Path.Combine(RepositoryLayout.Root, "Directory.Build.props"));
        Assert.Equal("net10.0", props.Descendants("TargetFramework").Single().Value);

        foreach (var project in AllProjects)
        {
            Assert.Empty(XDocument.Load(project).Descendants("TargetFramework"));
        }
    }

    [Fact]
    public void Package_versions_live_only_in_Directory_Packages_props()
    {
        foreach (var project in AllProjects)
        {
            foreach (var reference in XDocument.Load(project).Descendants("PackageReference"))
            {
                Assert.True(reference.Attribute("Version") is null && reference.Element("Version") is null, $"{RepositoryLayout.Name(project)}에 패키지 버전이 있습니다.");
            }
        }

        var central = XDocument.Load(Path.Combine(RepositoryLayout.Root, "Directory.Packages.props"));
        Assert.Equal("true", central.Descendants("ManagePackageVersionsCentrally").Single().Value);
    }

    [Fact]
    public void Entity_Framework_packages_are_not_used()
    {
        var central = File.ReadAllText(Path.Combine(RepositoryLayout.Root, "Directory.Packages.props"));
        Assert.DoesNotContain("EntityFramework", central, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Sdk_version_is_pinned()
    {
        var global = File.ReadAllText(Path.Combine(RepositoryLayout.Root, "global.json"));
        Assert.Contains("\"version\": \"10.0.400\"", global, StringComparison.Ordinal);
        Assert.Contains("\"rollForward\": \"latestFeature\"", global, StringComparison.Ordinal);
    }

    [Fact]
    public void No_template_placeholder_files_and_no_catch_all_library_project()
    {
        var sources = Directory.EnumerateFiles(RepositoryLayout.Root, "*.cs", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}") && !p.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
            .Select(Path.GetFileName)
            .ToList();
        Assert.DoesNotContain("Class1.cs", sources);
        Assert.DoesNotContain("UnitTest1.cs", sources);

        Assert.DoesNotContain(AllProjects.Select(RepositoryLayout.Name), name => name.EndsWith(".Library", StringComparison.Ordinal));
    }
}
