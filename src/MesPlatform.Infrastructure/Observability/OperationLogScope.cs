using System.Collections;
using MesPlatform.Application.Common.Operations;
using Microsoft.Extensions.Logging;

namespace MesPlatform.Infrastructure.Observability;

/// <summary>
/// 로그 속성 이름은 TraceId, RequestId, OperationId, ActorUserId, PlantId, Endpoint, UseCase로 고정한다.
/// 값은 로그를 쓰는 시점에 <see cref="IOperationContextAccessor"/>에서 읽으므로 인증 뒤에 정해지는 ActorUserId·PlantId도 반영된다.
/// </summary>
public static class OperationLogScope
{
    public const string TraceId = nameof(TraceId);
    public const string RequestId = nameof(RequestId);
    public const string OperationId = nameof(OperationId);
    public const string ActorUserId = nameof(ActorUserId);
    public const string PlantId = nameof(PlantId);
    public const string Endpoint = nameof(Endpoint);
    public const string UseCase = nameof(UseCase);

    public static IDisposable? BeginOperationScope(this ILogger logger, IOperationContextAccessor accessor, string? traceId) =>
        logger.BeginScope(new LazyProperties(accessor, traceId));

    public static IReadOnlyList<KeyValuePair<string, object?>> Properties(OperationContext? context, string? traceId) =>
    [
        new(TraceId, traceId),
        new(RequestId, context?.RequestId),
        new(OperationId, context?.OperationId),
        new(ActorUserId, context?.ActorUserId),
        new(PlantId, context?.PlantId),
        new(Endpoint, LogRedactor.Redact(context?.Endpoint)),
        new(UseCase, LogRedactor.Redact(context?.CommandName)),
    ];

    private sealed class LazyProperties(IOperationContextAccessor accessor, string? traceId)
        : IReadOnlyList<KeyValuePair<string, object?>>
    {
        private IReadOnlyList<KeyValuePair<string, object?>> Current => Properties(accessor.Current, traceId);

        public int Count => Current.Count;

        public KeyValuePair<string, object?> this[int index] => Current[index];

        public IEnumerator<KeyValuePair<string, object?>> GetEnumerator() => Current.GetEnumerator();

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
