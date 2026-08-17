using Microsoft.AspNetCore.Http.Json;
using Scalar.AspNetCore;
using System.Text.Json.Serialization;
using TODO.Database.AccessLayer.Services;
using TODO.Database.AccessLayer.Services.Implementations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSingleton<ITODOListService, TODOListMemoryService>();

// 1. Force JSON serialization to use strings for enums
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// For Controller-based APIs, apply it to AddControllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference(options =>
{
    options.OperationTitleSource = OperationTitleSource.Summary;
});
app.MapGet("/", () => Results.Redirect("/scalar")).ExcludeFromDescription();

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
