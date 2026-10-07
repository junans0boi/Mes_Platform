using MesPlatform.Worker.Configuration;
using MesPlatform.Worker.Jobs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MesPlatform.Worker.Tests.Worker;

public class WorkerHeartbeatServiceTests
{
    private sealed class ListLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (Entries)
            {
                Entries.Add((logLevel, formatter(state, exception)));
            }
        }
    }

    [Fact]
    public async Task Disabled_heartbeat_is_a_no_op()
    {
        var logger = new ListLogger<WorkerHeartbeatService>();
        using var service = new WorkerHeartbeatService(Options.Create(new WorkerOptions { Enabled = false }), logger);

        await service.StartAsync(default);
        await service.ExecuteTask!;
        await service.StopAsync(default);

        Assert.Empty(logger.Entries);
    }

    [Fact]
    public async Task Enabled_heartbeat_logs_structured_entries_until_stopped()
    {
        var logger = new ListLogger<WorkerHeartbeatService>();
        var options = new WorkerOptions { Enabled = true, ProcessRole = "Worker", HeartbeatInterval = TimeSpan.FromMilliseconds(10) };
        using var service = new WorkerHeartbeatService(Options.Create(options), logger);

        await service.StartAsync(default);
        await WaitUntilAsync(() => { lock (logger.Entries) { return logger.Entries.Count >= 3; } });
        await service.StopAsync(default);

        List<(LogLevel Level, string Message)> entries;
        lock (logger.Entries)
        {
            entries = [.. logger.Entries];
        }

        Assert.True(entries.Count >= 3);
        Assert.All(entries, e => Assert.Equal(LogLevel.Information, e.Level));
        Assert.StartsWith("WorkerHeartbeat Worker 1", entries[0].Message);
        Assert.True(service.ExecuteTask!.IsCompletedSuccessfully);
    }

    private static async Task WaitUntilAsync(Func<bool> condition)
    {
        var deadline = DateTime.UtcNow.AddSeconds(5);
        while (!condition() && DateTime.UtcNow < deadline)
        {
            await Task.Delay(10);
        }
    }
}
