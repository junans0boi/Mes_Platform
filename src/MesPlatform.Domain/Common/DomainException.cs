namespace MesPlatform.Domain.Common;

public sealed class DomainException : Exception
{
    public DomainException(DomainError error)
        : base($"{error.Code}: {error.MessageKey}")
    {
        Error = error;
    }

    public DomainError Error { get; }
}
