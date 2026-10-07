namespace MesPlatform.Server.Authentication;

/// <summary>access token claim 이름. 표준 claim(sub, unique_name)은 그대로 쓰고 MES 고유 값만 정의한다.</summary>
public static class MesClaimTypes
{
    public const string Subject = "sub";
    public const string UserName = "unique_name";
    public const string DisplayName = "display_name";
    public const string PlantId = "plant_id";

    /// <summary>Permission Code. 메뉴 경로나 role 이름은 이 claim에 넣지 않는다.</summary>
    public const string Permission = "permission";
}
