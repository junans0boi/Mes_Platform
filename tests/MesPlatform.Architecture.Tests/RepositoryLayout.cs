using System.Xml.Linq;

namespace MesPlatform.Architecture.Tests;

/// <summary>저장소 구조 규칙을 csproj 파일에서 직접 읽어 검사한다. 제품 프로젝트를 참조하지 않는다.</summary>
internal static class RepositoryLayout
{
    public static string Root { get; } = FindRoot();

    public static IEnumerable<string> ProjectFiles(string folder) =>
        Directory.EnumerateFiles(Path.Combine(Root, folder), "*.csproj", SearchOption.AllDirectories)
            .Where(p => !p.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                        && !p.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"));

    public static string Name(string projectFile) => Path.GetFileNameWithoutExtension(projectFile);

    public static SortedSet<string> ProjectReferences(string projectFile)
    {
        var doc = XDocument.Load(projectFile);
        return new SortedSet<string>(
            doc.Descendants("ProjectReference")
                .Select(e => (string?)e.Attribute("Include"))
                .Where(v => v is not null)
                .Select(v => Path.GetFileNameWithoutExtension(v!.Replace('\\', '/'))),
            StringComparer.Ordinal);
    }

    private static string FindRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "MesPlatform.sln")))
        {
            dir = dir.Parent;
        }

        return dir?.FullName ?? throw new InvalidOperationException("MesPlatform.sln을 찾을 수 없습니다.");
    }
}
