using Scalar.AspNetCore;
using System.Text.Json.Serialization;
using TODO.Database.AccessLayer.Services;
using TODO.Database.AccessLayer.Services.Implementations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSingleton<ITODOListService, TODOListMemoryService>();

// Force JSON serialization to use strings for enums on the controller pipeline.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Allow the locally running Angular UI to call this API.
const string AngularDevCorsPolicy = "AngularDevCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularDevCorsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference(options =>
{
    options.OperationTitleSource = OperationTitleSource.Summary;
});
app.MapGet("/", () => Results.Redirect("/scalar")).ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseCors(AngularDevCorsPolicy);

app.MapControllers();

app.Run();
