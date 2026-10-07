namespace MesPlatform.Application.Common.Errors;

// Controller/Adapter에서 Result.Failure(error)를 HTTP 응답으로 변환할 때 던진다.
// MesExceptionHandler가 잡아서 Problem Details로 반환한다.
public sealed class ApplicationLayerException(ApplicationError error) : Exception(error.MessageKey)
{
    public ApplicationError Error { get; } = error;
}
