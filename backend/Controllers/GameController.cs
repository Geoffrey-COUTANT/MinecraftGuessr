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
    public class GameController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly RecipeService _recipeService;
        private readonly DailyChallengeService _challengeService;

        public GameController(AppDbContext context, RecipeService recipeService, DailyChallengeService challengeService)
        {
            _context = context;
            _recipeService = recipeService;
            _challengeService = challengeService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User is not authorized.");
            }
            return userId;
        }

        [HttpGet("daily")]
        public async Task<IActionResult> GetDailyChallenge()
        {
            try
            {
                int userId = GetCurrentUserId();
                var today = DateTime.UtcNow.Date;

                // Load or create the daily challenge
                var challenge = await _challengeService.GetOrCreateDailyChallengeAsync(today);

                // Get user's crafts for today
                var userCrafts = await _context.UserDailyCrafts
                    .Where(c => c.UserId == userId && c.Date == today)
                    .ToListAsync();

                // Format the 4 ingredients
                var ingredients = new List<IngredientDto>
                {
                    CreateIngredientDto(challenge.Ingredient1),
                    CreateIngredientDto(challenge.Ingredient2),
                    CreateIngredientDto(challenge.Ingredient3),
                    CreateIngredientDto(challenge.Ingredient4)
                };

                // Format history of successful crafts
                var history = userCrafts.Select(c => new CraftedItemDto
                {
                    Id = c.CraftedItemId,
                    Name = FormatItemName(c.CraftedItemId),
                    TextureUrl = _recipeService.GetTextureUrl(c.CraftedItemId),
                    CraftedAt = c.CreatedAt
                }).OrderByDescending(h => h.CraftedAt).ToList();

                // Format possible crafts list
                var possibleCraftsIds = JsonSerializer.Deserialize<List<string>>(challenge.PossibleCraftsJson) ?? new List<string>();
                var possibleCrafts = possibleCraftsIds.Select(id => CreateIngredientDto(id)).ToList();

                var response = new DailyGameStatusDto
                {
                    Date = challenge.Date,
                    Ingredients = ingredients,
                    TotalPossibleCrafts = challenge.PossibleCraftsCount,
                    CraftedCount = history.Count,
                    History = history,
                    PossibleCrafts = possibleCrafts
                };

                return Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "An error occurred.", Details = ex.Message });
            }
        }

        [HttpPost("craft")]
        public async Task<IActionResult> CraftItem([FromBody] CraftRequestDto request)
        {
            if (request == null || request.Grid == null || request.Grid.Length != 9)
            {
                return BadRequest("Invalid grid layout. Grid must be an array of 9 strings.");
            }

            try
            {
                int userId = GetCurrentUserId();
                var today = DateTime.UtcNow.Date;

                // Reconstruct the 3x3 grid from the flat 1D array of 9 strings
                var grid = new string?[3, 3];
                for (int i = 0; i < 9; i++)
                {
                    int r = i / 3;
                    int c = i % 3;
                    grid[r, c] = string.IsNullOrWhiteSpace(request.Grid[i]) ? null : request.Grid[i];
                }

                // Match with recipe
                var matchedRecipe = _recipeService.MatchCraftingGrid(grid);
                if (matchedRecipe == null)
                {
                    return Ok(new CraftResponseDto
                    {
                        Success = false,
                        Message = "Pattern did not match any recipe."
                    });
                }

                var craftedItemId = matchedRecipe.Result.Id;

                // Load challenge to verify daily ingredients and craft list
                var challenge = await _challengeService.GetOrCreateDailyChallengeAsync(today);

                // Check if recipe only uses the daily ingredients
                var chosenIngredients = new List<string> { challenge.Ingredient1, challenge.Ingredient2, challenge.Ingredient3, challenge.Ingredient4 };
                if (!_recipeService.IsRecipeCraftable(matchedRecipe, chosenIngredients))
                {
                    return Ok(new CraftResponseDto
                    {
                        Success = false,
                        Message = "Recipe cannot be crafted with today's ingredients."
                    });
                }

                // Verify it belongs in the possible crafts of the daily challenge
                var possibleCraftsList = JsonSerializer.Deserialize<List<string>>(challenge.PossibleCraftsJson) ?? new List<string>();
                if (!possibleCraftsList.Contains(craftedItemId))
                {
                    return Ok(new CraftResponseDto
                    {
                        Success = false,
                        Message = "This recipe is not in today's challenge list."
                    });
                }

                // Check if user has already crafted it today
                var existingCraft = await _context.UserDailyCrafts
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.Date == today && c.CraftedItemId == craftedItemId);

                bool isNewDiscovery = false;
                if (existingCraft == null)
                {
                    isNewDiscovery = true;

                    // Save daily craft
                    var newCraft = new UserDailyCraft
                    {
                        UserId = userId,
                        Date = today,
                        CraftedItemId = craftedItemId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.UserDailyCrafts.Add(newCraft);

                    // Add point to user score
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null)
                    {
                        user.TotalScore += 1;
                        _context.Entry(user).State = EntityState.Modified;
                    }

                    await _context.SaveChangesAsync();
                }

                return Ok(new CraftResponseDto
                {
                    Success = true,
                    IsNewDiscovery = isNewDiscovery,
                    Message = isNewDiscovery ? "New item crafted successfully!" : "You have already crafted this item today.",
                    CraftedItem = new CraftedItemDto
                    {
                        Id = craftedItemId,
                        Name = FormatItemName(craftedItemId),
                        TextureUrl = _recipeService.GetTextureUrl(craftedItemId),
                        CraftedAt = DateTime.UtcNow
                    }
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "An error occurred while crafting.", Details = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetGameHistory()
        {
            try
            {
                int userId = GetCurrentUserId();
                var today = DateTime.UtcNow.Date;

                // Load all past challenges (strictly before today)
                var pastChallenges = await _context.DailyChallenges
                    .Where(d => d.Date < today)
                    .OrderByDescending(d => d.Date)
                    .ToListAsync();

                var historyList = new List<PastChallengeDto>();

                foreach (var challenge in pastChallenges)
                {
                    // Load user's crafts for that day
                    var userCrafts = await _context.UserDailyCrafts
                        .Where(c => c.UserId == userId && c.Date == challenge.Date)
                        .Select(c => c.CraftedItemId)
                        .ToListAsync();

                    var possibleCraftsIds = JsonSerializer.Deserialize<List<string>>(challenge.PossibleCraftsJson) ?? new List<string>();

                    var crafts = possibleCraftsIds.Select(id => new PastCraftDto
                    {
                        Id = id,
                        Name = FormatItemName(id),
                        TextureUrl = _recipeService.GetTextureUrl(id),
                        Succeeded = userCrafts.Contains(id)
                    }).ToList();

                    var ingredients = new List<IngredientDto>
                    {
                        CreateIngredientDto(challenge.Ingredient1),
                        CreateIngredientDto(challenge.Ingredient2),
                        CreateIngredientDto(challenge.Ingredient3),
                        CreateIngredientDto(challenge.Ingredient4)
                    };

                    historyList.Add(new PastChallengeDto
                    {
                        Date = challenge.Date,
                        Ingredients = ingredients,
                        TotalPossibleCrafts = challenge.PossibleCraftsCount,
                        CraftedCount = userCrafts.Count,
                        Crafts = crafts
                    });
                }

                return Ok(historyList);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error loading history.", Details = ex.Message });
            }
        }

        private IngredientDto CreateIngredientDto(string itemId)
        {
            return new IngredientDto
            {
                Id = itemId,
                Name = FormatItemName(itemId),
                TextureUrl = _recipeService.GetTextureUrl(itemId)
            };
        }

        private static string FormatItemName(string itemId)
        {
            var name = itemId.Replace("minecraft:", "").Replace("_", " ");
            return System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(name);
        }
    }

    public class IngredientDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string TextureUrl { get; set; } = string.Empty;
    }

    public class CraftedItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string TextureUrl { get; set; } = string.Empty;
        public DateTime CraftedAt { get; set; }
    }

    public class DailyGameStatusDto
    {
        public DateTime Date { get; set; }
        public List<IngredientDto> Ingredients { get; set; } = new();
        public int TotalPossibleCrafts { get; set; }
        public int CraftedCount { get; set; }
        public List<CraftedItemDto> History { get; set; } = new();
        public List<IngredientDto> PossibleCrafts { get; set; } = new();
    }

    public class CraftRequestDto
    {
        // 1D array of 9 strings representing the 3x3 layout
        public string?[] Grid { get; set; } = Array.Empty<string>();
    }

    public class CraftResponseDto
    {
        public bool Success { get; set; }
        public bool IsNewDiscovery { get; set; }
        public string Message { get; set; } = string.Empty;
        public CraftedItemDto? CraftedItem { get; set; }
    }

    public class PastChallengeDto
    {
        public DateTime Date { get; set; }
        public List<IngredientDto> Ingredients { get; set; } = new();
        public int TotalPossibleCrafts { get; set; }
        public int CraftedCount { get; set; }
        public List<PastCraftDto> Crafts { get; set; } = new();
    }

    public class PastCraftDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string TextureUrl { get; set; } = string.Empty;
        public bool Succeeded { get; set; }
    }
}
