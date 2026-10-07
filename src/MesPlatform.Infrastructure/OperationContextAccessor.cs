using MesPlatform.Application.Common.Operations;

namespace MesPlatform.Infrastructure;

// scoped: 요청당 하나의 OperationContext를 보유한다.
public sealed class OperationContextAccessor : IOperationContextAccessor
{
    public OperationContext? Current { get; private set; }

    public void Set(OperationContext context) => Current = context;
}
