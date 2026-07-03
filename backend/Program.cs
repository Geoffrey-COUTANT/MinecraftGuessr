using System.IO;
using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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



// Dev environment OpenAPI configuration (if package available)
// DB migration and seeding automatically on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        dbContext.Database.Migrate();
        
        // Seed code to make Radiou22 an admin if they exist
        var radiouUser = dbContext.Users.FirstOrDefault(u => u.Username.ToLower() == "radiou22");
        if (radiouUser != null && !radiouUser.IsAdmin)
        {
            radiouUser.IsAdmin = true;
            dbContext.SaveChanges();
            System.Console.WriteLine("Promoted Radiou22 to admin!");
        }
    }
    catch (System.Exception ex)
    {
        System.Console.WriteLine($"Error running migrations or seeding: {ex.Message}");
    }
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
