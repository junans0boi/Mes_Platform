namespace MesPlatform.Server.Errors;

// 안정적인 MES 오류 코드. 한 번 공개한 값의 의미는 바꾸지 않는다.
public static class ErrorCodes
{
    public const string AuthenticationRequired = "AUTHENTICATION_REQUIRED";
    public const string TokenExpired = "TOKEN_EXPIRED";
    public const string TokenInvalid = "TOKEN_INVALID";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string PermissionDenied = "PERMISSION_DENIED";
    public const string PlantNotAllowed = "PLANT_NOT_ALLOWED";
    public const string PlantIdRequired = "PLANT_ID_REQUIRED";
    public const string ValidationFailed = "VALIDATION_FAILED";
}
