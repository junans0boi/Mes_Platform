using MesPlatform.Application.Common.Errors;

namespace MesPlatform.Application.Common.Results;

public sealed class Result<T> : Result
{
    private readonly T? _value;

    private Result(T? value, bool isSuccess, ApplicationError error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    /// <summary>성공한 결과의 값. 실패 결과에서 읽으면 <see cref="InvalidOperationException"/>을 던진다.</summary>
    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("실패 결과에는 값이 없습니다.");

    public static Result<T> Success(T value) => new(value, true, ApplicationError.None);

    public static new Result<T> Failure(ApplicationError error)
    {
        if (error == ApplicationError.None)
        {
            throw new ArgumentException("실패 결과에는 실제 오류가 필요합니다.", nameof(error));
        }

        return new Result<T>(default, false, error);
    }
}
