using MesPlatform.Application.Abstractions.Identity;
using Microsoft.AspNetCore.Authorization;

namespace MesPlatform.Server.Authorization;

/// <summary>
/// Controller 또는 action이 요구하는 업무 권한. 메뉴 경로가 아니라 Permission Code를 받는다
/// (예 <c>[RequirePermission("Production.WorkOrder.Read")]</c>).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "Permission:";

    public RequirePermissionAttribute(string permissionCode)
        : base(PolicyPrefix + permissionCode)
    {
        if (!PermissionCode.IsValid(permissionCode))
        {
            throw new ArgumentException($"'{permissionCode}' is not a valid Permission Code.", nameof(permissionCode));
        }

        Code = permissionCode;
    }

    public string Code { get; }
}
