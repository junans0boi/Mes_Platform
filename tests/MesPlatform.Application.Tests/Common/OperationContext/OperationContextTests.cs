using MesPlatform.Application.Common.Operations;
using Context = MesPlatform.Application.Common.Operations.OperationContext;

namespace MesPlatform.Application.Tests.Common.Operations;

public class OperationContextTests
{
    [Fact]
    public void Created_context_preserves_every_value_without_normalization()
    {
        var requestId = Guid.NewGuid();
        var operationId = Guid.NewGuid();
        var correlationId = Guid.NewGuid();

        var context = new Context(
            requestId,
            operationId,
            correlationId,
            ActorUserId: " 홍길동 ",
            PlantId: 1,
            Endpoint: "POST /api/v1/production/work-orders",
            CommandName: "ChangeWorkOrderStatus",
            Reason: "  설비 점검  ",
            ClientIp: "10.0.0.7");

        Assert.Equal(requestId, context.RequestId);
        Assert.Equal(operationId, context.OperationId);
        Assert.Equal(correlationId, context.CorrelationId);
        Assert.Equal(" 홍길동 ", context.ActorUserId);
        Assert.Equal(1L, context.PlantId);
        Assert.Equal("POST /api/v1/production/work-orders", context.Endpoint);
        Assert.Equal("ChangeWorkOrderStatus", context.CommandName);
        Assert.Equal("  설비 점검  ", context.Reason);
        Assert.Equal("10.0.0.7", context.ClientIp);
    }

    [Fact]
    public void Optional_values_default_to_null()
    {
        var context = new Context(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

        Assert.Null(context.ActorUserId);
        Assert.Null(context.PlantId);
        Assert.Null(context.CommandName);
        Assert.Null(context.Reason);
        Assert.Null(context.ClientIp);
    }

    [Fact]
    public void Accessor_exposes_the_current_context()
    {
        IOperationContextAccessor accessor = new StubAccessor();
        var context = new Context(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        accessor.Set(context);

        Assert.Same(context, accessor.Current);
    }

    private sealed class StubAccessor : IOperationContextAccessor
    {
        public Context? Current { get; private set; }

        public void Set(Context context) => Current = context;
    }
}
