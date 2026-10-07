using MesPlatform.Server.Configuration;

var builder = WebApplication.CreateBuilder(args);
builder.ConfigureServices();

var app = builder.Build();
app.ConfigurePipeline();

app.Run();

// WebApplicationFactory 사용을 위한 partial class 선언
public partial class Program;
