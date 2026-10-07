using MesPlatform.Application.Abstractions.Identity;
using MesPlatform.Contracts.Common;
using MesPlatform.Server.Errors;
using Microsoft.AspNetCore.Mvc.Filters;

namespace MesPlatform.Server.Authorization;

/// <summary>
/// 이 action이 Plant 범위 요청임을 표시하고, 요청에 <b>명시된</b> plantId를 사용자의 allowedPlantIds와 대조한다.
/// plantId는 <c>plantId</c> 이름의 action 인자(query·route) 또는 <see cref="IPlantScoped"/>를 구현한 본문에서만 읽는다.
/// 헤더 등 숨겨진 경로로 Plant를 지정하는 방법은 없다. 허용되지 않은 Plant는 403, 값이 없으면 400이다.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class PlantScopedAttribute : Attribute, IAsyncActionFilter
{
    private const string PlantIdArgument = "plantId";

    public Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var plantIds = ExplicitPlantIds(context.ActionArguments).ToArray();
        if (plantIds.Length == 0 || plantIds.Any(p => p <= 0))
        {
            throw HttpProblemException.BadRequest(
                ErrorCodes.PlantIdRequired,
                [new ProblemFieldError(PlantIdArgument, ErrorCodes.PlantIdRequired)]);
        }

        var checker = context.HttpContext.RequestServices.GetRequiredService<IPermissionChecker>();
        foreach (var plantId in plantIds.Distinct().Where(p => !checker.CanAccessPlant(p)))
        {
            throw HttpProblemException.Forbidden(
                ErrorCodes.PlantNotAllowed,
                new Dictionary<string, string> { ["plantId"] = plantId.ToString(System.Globalization.CultureInfo.InvariantCulture) });
        }

        return next();
    }

    private static IEnumerable<int> ExplicitPlantIds(IDictionary<string, object?> arguments)
    {
        foreach (var (name, value) in arguments)
        {
            if (value is IPlantScoped scoped)
            {
                yield return scoped.PlantId;
            }
            else if (value is int id && string.Equals(name, PlantIdArgument, StringComparison.OrdinalIgnoreCase))
            {
                yield return id;
            }
        }
    }
}
