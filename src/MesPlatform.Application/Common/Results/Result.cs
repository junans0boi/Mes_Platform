using MesPlatform.Application.Common.Errors;

namespace MesPlatform.Application.Common.Results;

public class Result
{
    protected Result(bool isSuccess, ApplicationError error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }

    public ApplicationError Error { get; }

    public static Result Success() => new(true, ApplicationError.None);

    public static Result Failure(ApplicationError error)
    {
        if (error == ApplicationError.None)
        {
            throw new ArgumentException("실패 결과에는 실제 오류가 필요합니다.", nameof(error));
        }

        return new Result(false, error);
    }
}
