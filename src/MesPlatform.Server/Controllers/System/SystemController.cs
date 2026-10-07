using MesPlatform.Server.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace MesPlatform.Server.Controllers.System;

[ApiController]
[Route("api/v1/system")]
public sealed class SystemController : ControllerBase
{
    [RequirePermission("System.Info.Read")]
    [HttpGet("info")]
    public IActionResult GetInfo()
    {
        var version = Assembly.GetEntryAssembly()
            ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "unknown";

        return Ok(this.Envelope(new { application = "MesPlatform", version }));
    }
}
