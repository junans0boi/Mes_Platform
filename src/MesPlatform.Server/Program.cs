// HTTP API + SignalR Hub 실행 프로세스. 호스트 구성은 BE-02에서 만든다.
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.Run();
