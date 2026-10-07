using Microsoft.AspNetCore.Authorization;

namespace MesPlatform.Server.Authorization;

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;
