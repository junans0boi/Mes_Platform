using MesPlatform.Application.Abstractions.Identity;
using MesPlatform.Contracts.Auth;
using MesPlatform.Contracts.Common;
using MesPlatform.Server.Authentication;
using MesPlatform.Server.Authorization;
using MesPlatform.Server.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MesPlatform.Server.Controllers.Auth;

// CON-01 provisional 계약. access token만 발급하며 refresh token과 cookie는 BE-05 결정에 따라 BE-11이 추가한다.
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    IUserAuthenticator authenticator,
    IAccessTokenIssuer issuer,
    CurrentUserAccessor currentUser) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiEnvelope<LoginData>>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var errors = new List<ProblemFieldError>();
        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            errors.Add(new ProblemFieldError("userName", "REQUIRED"));
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            errors.Add(new ProblemFieldError("password", "REQUIRED"));
        }

        if (errors.Count > 0)
        {
            throw HttpProblemException.BadRequest(ErrorCodes.ValidationFailed, errors);
        }

        var user = await authenticator.AuthenticateAsync(request.UserName!, request.Password!, cancellationToken)
            ?? throw HttpProblemException.Unauthorized(ErrorCodes.InvalidCredentials);

        var token = issuer.Issue(user);
        return Ok(this.Envelope(new LoginData(token.Token, "Bearer", token.ExpiresInSeconds), includeOperationId: true));
    }

    [Authorize]
    [HttpGet("session")]
    public ActionResult<ApiEnvelope<SessionData>> GetSession()
    {
        var user = currentUser.GetRequired();
        return Ok(this.Envelope(new SessionData(
            user.UserId,
            user.UserName,
            user.DisplayName,
            [.. user.AllowedPlantIds.Order()],
            [.. user.PermissionCodes.Order(StringComparer.Ordinal)])));
    }
}
