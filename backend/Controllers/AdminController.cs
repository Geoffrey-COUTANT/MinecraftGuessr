using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MinecraftGuessr.Data;
using MinecraftGuessr.Models;
using MinecraftGuessr.Services;

namespace MinecraftGuessr.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly RecipeService _recipeService;

        public AdminController(AppDbContext context, RecipeService recipeService)
        {
            _context = context;
            _recipeService = recipeService;
        }

        private async Task<bool> IsCurrentUserAdminAsync()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return false;
            }
            var user = await _context.Users.FindAsync(userId);
            return user != null && user.IsAdmin;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            var totalUsers = await _context.Users.CountAsync();
            var totalCraftsToday = await _context.UserDailyCrafts
                .Where(c => c.Date == DateTime.UtcNow.Date)
                .CountAsync();
            var uniqueCraftedItemsToday = await _context.UserDailyCrafts
                .Where(c => c.Date == DateTime.UtcNow.Date)
                .Select(c => c.CraftedItemId)
                .Distinct()
                .CountAsync();

            var todayChallenge = await _context.DailyChallenges
                .FirstOrDefaultAsync(c => c.Date == DateTime.UtcNow.Date);

            return Ok(new
            {
                TotalUsers = totalUsers,
                TotalCraftsToday = totalCraftsToday,
                UniqueCraftedItemsToday = uniqueCraftedItemsToday,
                HasActiveChallengeToday = todayChallenge != null,
                TodayChallengeIngredients = todayChallenge != null ? new List<object>
                {
                    new { Id = todayChallenge.Ingredient1, Name = FormatItemName(todayChallenge.Ingredient1), TextureUrl = _recipeService.GetTextureUrl(todayChallenge.Ingredient1) },
                    new { Id = todayChallenge.Ingredient2, Name = FormatItemName(todayChallenge.Ingredient2), TextureUrl = _recipeService.GetTextureUrl(todayChallenge.Ingredient2) },
                    new { Id = todayChallenge.Ingredient3, Name = FormatItemName(todayChallenge.Ingredient3), TextureUrl = _recipeService.GetTextureUrl(todayChallenge.Ingredient3) },
                    new { Id = todayChallenge.Ingredient4, Name = FormatItemName(todayChallenge.Ingredient4), TextureUrl = _recipeService.GetTextureUrl(todayChallenge.Ingredient4) }
                } : null
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            var users = await _context.Users
                .OrderBy(u => u.Username)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.TotalScore,
                    u.IsAdmin,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{id}/score")]
        public async Task<IActionResult> UpdateUserScore(int id, [FromBody] UpdateScoreDto dto)
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            user.TotalScore = dto.Score;
            _context.Entry(user).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User score updated successfully." });
        }

        [HttpPut("users/{id}/admin")]
        public async Task<IActionResult> UpdateUserAdmin(int id, [FromBody] UpdateAdminDto dto)
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            user.IsAdmin = dto.IsAdmin;
            _context.Entry(user).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User admin status updated successfully." });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User deleted successfully." });
        }

        [HttpGet("ingredients")]
        public async Task<IActionResult> GetIngredients()
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            var baseIngredients = _recipeService.GetAllBaseIngredients()
                .Select(id => new
                {
                    Id = id,
                    Name = FormatItemName(id),
                    TextureUrl = _recipeService.GetTextureUrl(id)
                })
                .OrderBy(i => i.Name)
                .ToList();

            return Ok(baseIngredients);
        }

        [HttpPost("preview-challenge")]
        public async Task<IActionResult> PreviewChallenge([FromBody] SetupChallengeDto dto)
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            if (dto.Ingredients == null || dto.Ingredients.Count != 4)
            {
                return BadRequest("Must provide exactly 4 ingredients.");
            }

            var chosen = dto.Ingredients;
            var craftableSet = new HashSet<string>();
            var recipes = _recipeService.GetAllRecipes();

            foreach (var recipe in recipes)
            {
                if (_recipeService.IsRecipeCraftable(recipe, chosen))
                {
                    craftableSet.Add(recipe.Result.Id);
                }
            }

            var possibleCrafts = craftableSet.Select(id => new
            {
                Id = id,
                Name = FormatItemName(id),
                TextureUrl = _recipeService.GetTextureUrl(id)
            }).ToList();

            return Ok(possibleCrafts);
        }

        [HttpPost("setup-challenge")]
        public async Task<IActionResult> SetupChallenge([FromBody] SetupChallengeDto dto)
        {
            if (!await IsCurrentUserAdminAsync()) return Forbid();

            if (dto.Ingredients == null || dto.Ingredients.Count != 4)
            {
                return BadRequest("Must provide exactly 4 ingredients.");
            }

            var targetDate = DateTime.SpecifyKind((dto.Date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

            // Delete existing challenge for this date if any
            var existing = await _context.DailyChallenges.FirstOrDefaultAsync(c => c.Date == targetDate);
            if (existing != null)
            {
                _context.DailyChallenges.Remove(existing);
            }

            var chosen = dto.Ingredients;
            var craftableSet = new HashSet<string>();
            var recipes = _recipeService.GetAllRecipes();

            foreach (var recipe in recipes)
            {
                if (_recipeService.IsRecipeCraftable(recipe, chosen))
                {
                    craftableSet.Add(recipe.Result.Id);
                }
            }

            var challenge = new DailyChallenge
            {
                Date = targetDate,
                Ingredient1 = chosen[0],
                Ingredient2 = chosen[1],
                Ingredient3 = chosen[2],
                Ingredient4 = chosen[3],
                PossibleCraftsJson = JsonSerializer.Serialize(craftableSet.ToList()),
                PossibleCraftsCount = craftableSet.Count
            };

            _context.DailyChallenges.Add(challenge);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Challenge successfully configured.", Date = targetDate, PossibleCraftsCount = challenge.PossibleCraftsCount });
        }

        private static string FormatItemName(string itemId)
        {
            var name = itemId.Replace("minecraft:", "").Replace("_", " ");
            return System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(name);
        }
    }

    public class UpdateScoreDto
    {
        public int Score { get; set; }
    }

    public class UpdateAdminDto
    {
        public bool IsAdmin { get; set; }
    }

    public class SetupChallengeDto
    {
        public List<string> Ingredients { get; set; } = new();
        public DateTime? Date { get; set; }
    }
}
