using MesPlatform.Application.Common.Errors;
using MesPlatform.Application.Common.Results;

namespace MesPlatform.Application.Tests.Common.Results;

public class ResultTests
{
    private static readonly ApplicationError SampleError = new("SAMPLE_ERROR", "sample.error", new Dictionary<string, string> { ["field"] = "quantity" });

    [Fact]
    public void Success_result_has_no_error()
    {
        var result = Result.Success();

        Assert.True(result.IsSuccess);
        Assert.Equal(ApplicationError.None, result.Error);
    }

    [Fact]
    public void Success_result_of_T_carries_value()
    {
        var result = Result<int>.Success(42);

        Assert.True(result.IsSuccess);
        Assert.Equal(42, result.Value);
        Assert.Equal(ApplicationError.None, result.Error);
    }

    [Fact]
    public void Failure_preserves_error_code_key_and_parameters()
    {
        var result = Result<string>.Failure(SampleError);

        Assert.False(result.IsSuccess);
        Assert.Equal("SAMPLE_ERROR", result.Error.Code);
        Assert.Equal("sample.error", result.Error.MessageKey);
        Assert.Equal("quantity", result.Error.Parameters["field"]);
    }

    [Fact]
    public void Reading_value_of_failure_throws()
    {
        var result = Result<string>.Failure(SampleError);

        Assert.Throws<InvalidOperationException>(() => result.Value);
    }

    [Fact]
    public void Failure_requires_a_real_error()
    {
        Assert.Throws<ArgumentException>(() => Result.Failure(ApplicationError.None));
    }

    [Fact]
    public void Error_parameters_default_to_empty_and_are_read_only()
    {
        var error = new ApplicationError("X", "x");

        Assert.Empty(error.Parameters);
        Assert.IsAssignableFrom<IReadOnlyDictionary<string, string>>(error.Parameters);
    }
}
