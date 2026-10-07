using MesPlatform.Contracts.Common;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace MesPlatform.Server.Controllers.System;

[ApiController]
[Route("api/v1/system")]
public sealed class SystemController : ControllerBase
{
    [HttpGet("info")]
    public IActionResult GetInfo()
    {
        var version = Assembly.GetEntryAssembly()
            ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "unknown";

        var data = new { application = "MesPlatform", version };
        var meta = new ApiMeta(
            RequestId: Guid.NewGuid(),
            OperationId: null,
            ServerTime: DateTimeOffset.UtcNow);

        return Ok(new ApiEnvelope<object>(data, meta));
    }
}
