namespace MesPlatform.Application.Common.Operations;

public interface IOperationContextAccessor
{
    OperationContext? Current { get; }

    void Set(OperationContext context);
}
