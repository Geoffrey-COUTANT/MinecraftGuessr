using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using MinecraftGuessr.Data;
using MinecraftGuessr.Models;

namespace MinecraftGuessr.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (dto == null) return BadRequest("Invalid request.");

            // Basic validation
            if (string.IsNullOrWhiteSpace(dto.Username))
                return BadRequest(new { Message = "Username is required." });

            if (dto.Username.Length < 3 || dto.Username.Length > 20)
                return BadRequest(new { Message = "Username must be between 3 and 20 characters." });

            // Password confirmations
            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { Message = "Passwords do not match." });

            // Password strength rules
            if (dto.Password.Length < 8)
                return BadRequest(new { Message = "Password must be at least 8 characters long." });

            bool hasLetter = Regex.IsMatch(dto.Password, @"[a-zA-Z]");
            bool hasDigit = Regex.IsMatch(dto.Password, @"[0-9]");
            if (!hasLetter || !hasDigit)
            {
                return BadRequest(new { Message = "Password must contain at least one letter and one number." });
            }

            // Check duplicate username
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == dto.Username.ToLower());
            if (existingUser != null)
                return BadRequest(new { Message = "Username is already taken." });

            // Hash password and save
            var user = new User
            {
                Username = dto.Username.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                TotalScore = 0
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return Ok(new AuthResponseDto
            {
                Token = token,
                Username = user.Username,
                TotalScore = user.TotalScore,
                IsAdmin = user.IsAdmin
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (dto == null) return BadRequest("Invalid request.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == dto.Username.ToLower());
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { Message = "Invalid username or password." });
            }

            var token = GenerateJwtToken(user);
            return Ok(new AuthResponseDto
            {
                Token = token,
                Username = user.Username,
                TotalScore = user.TotalScore,
                IsAdmin = user.IsAdmin
            });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto == null) return BadRequest("Invalid request.");

            // Get user id from claims
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { Message = "Incorrect current password." });
            }

            // Validate new password rules
            if (dto.NewPassword.Length < 8)
                return BadRequest(new { Message = "New password must be at least 8 characters long." });

            bool hasLetter = Regex.IsMatch(dto.NewPassword, @"[a-zA-Z]");
            bool hasDigit = Regex.IsMatch(dto.NewPassword, @"[0-9]");
            if (!hasLetter || !hasDigit)
            {
                return BadRequest(new { Message = "New password must contain at least one letter and one number." });
            }

            // Hash new password and save
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            _context.Entry(user).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Password changed successfully." });
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _configuration["Jwt:Secret"] ?? "super_secret_key_minecraft_guessr_2026_long_enough";
            var key = Encoding.ASCII.GetBytes(jwtSecret);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public int TotalScore { get; set; }
        public bool IsAdmin { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
