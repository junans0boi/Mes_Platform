namespace MesPlatform.Application.Abstractions.Identity;

public interface IPermissionChecker
{
    /// <summary>Permission Code(예 <c>Production.WorkOrder.Read</c>)를 가졌는지 확인한다. 메뉴 경로는 권한이 아니다.</summary>
    bool Has(string permissionCode);

    /// <summary>요청에 명시된 plantId가 사용자의 allowedPlantIds에 있는지 확인한다.</summary>
    bool CanAccessPlant(int plantId);
}
