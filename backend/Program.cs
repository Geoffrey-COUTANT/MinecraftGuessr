using System.IO;
using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using MinecraftGuessr.Data;
using MinecraftGuessr.Services;

var builder = WebApplication.CreateBuilder(args);

// DbContext connection string setup
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Database=minecraft_guessr;Username=postgres;Password=password";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add controllers
builder.Services.AddControllers();

// Register game services
builder.Services.AddSingleton<RecipeService>();
builder.Services.AddScoped<DailyChallengeService>();

// JWT Authentication Setup
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "super_secret_key_minecraft_guessr_2026_long_enough";
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true
    };
});

// Configure CORS to allow frontend integration
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Enable CORS
app.UseCors();

// Configure static file serving for block and item textures
var blockPaths = new[] { "/app/texture-block", "../texture-block", "texture-block", Path.Combine(app.Environment.ContentRootPath, "texture-block") };
var itemPaths = new[] { "/app/texture-item", "../texture-item", "texture-item", Path.Combine(app.Environment.ContentRootPath, "texture-item") };

var blockPath = blockPaths.FirstOrDefault(Directory.Exists);
var itemPath = itemPaths.FirstOrDefault(Directory.Exists);

if (!string.IsNullOrEmpty(blockPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.GetFullPath(blockPath)),
        RequestPath = "/textures/block"
    });
}

if (!string.IsNullOrEmpty(itemPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.GetFullPath(itemPath)),
        RequestPath = "/textures/item"
    });
}

// Dev environment OpenAPI configuration (if package available)
if (app.Environment.IsDevelopment())
{
    // DB migration automatically on startup in development
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        dbContext.Database.Migrate();
    }
    catch (System.Exception ex)
    {
        System.Console.WriteLine($"Error running migrations: {ex.Message}");
    }
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
