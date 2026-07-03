using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MinecraftGuessr.Data;
using MinecraftGuessr.Models;

namespace MinecraftGuessr.Services
{
    public class DailyChallengeService
    {
        private readonly AppDbContext _dbContext;
        private readonly RecipeService _recipeService;

        public DailyChallengeService(AppDbContext dbContext, RecipeService recipeService)
        {
            _dbContext = dbContext;
            _recipeService = recipeService;
        }

        public async Task<DailyChallenge> GetOrCreateDailyChallengeAsync(DateTime date)
        {
            var targetDate = date.Date; // Normalize to midnight
            var challenge = await _dbContext.DailyChallenges.FirstOrDefaultAsync(c => c.Date == targetDate);

            if (challenge != null)
            {
                return challenge;
            }

            // Create a new daily challenge
            var baseIngredients = _recipeService.GetAllBaseIngredients().ToList();
            if (baseIngredients.Count < 4)
            {
                throw new InvalidOperationException("Not enough unique base ingredients loaded to generate a challenge.");
            }

            var rand = new Random();
            List<string> chosen = new();
            List<string> craftableItems = new();

            // Try generating ingredients until we have at least 3 possible crafts to ensure a fun game
            int attempts = 0;
            while (attempts < 150)
            {
                attempts++;
                chosen = baseIngredients.OrderBy(_ => rand.Next()).Take(4).ToList();

                var craftableSet = new HashSet<string>();
                var recipes = _recipeService.GetAllRecipes();

                foreach (var recipe in recipes)
                {
                    if (_recipeService.IsRecipeCraftable(recipe, chosen))
                    {
                        craftableSet.Add(recipe.Result.Id);
                    }
                }

                // If possible crafts is in a good sweet spot, pick it
                if (craftableSet.Count >= 2 && craftableSet.Count <= 25)
                {
                    craftableItems = craftableSet.ToList();
                    break;
                }
            }

            // Fallback if we couldn't find a set within 150 attempts
            if (craftableItems.Count == 0)
            {
                int fallbackAttempts = 0;
                while (fallbackAttempts < 100)
                {
                    fallbackAttempts++;
                    chosen = baseIngredients.OrderBy(_ => rand.Next()).Take(4).ToList();
                    var craftableSet = new HashSet<string>();
                    foreach (var recipe in _recipeService.GetAllRecipes())
                    {
                        if (_recipeService.IsRecipeCraftable(recipe, chosen))
                        {
                            craftableSet.Add(recipe.Result.Id);
                        }
                    }
                    if (craftableSet.Count > 0)
                    {
                        craftableItems = craftableSet.ToList();
                        break;
                    }
                }
            }

            // Absolute fallback if somehow still 0 (e.g. choose standard ingredients)
            if (craftableItems.Count == 0)
            {
                chosen = new List<string> { "minecraft:oak_planks", "minecraft:stick", "minecraft:iron_ingot", "minecraft:coal" };
                var craftableSet = new HashSet<string>();
                foreach (var recipe in _recipeService.GetAllRecipes())
                {
                    if (_recipeService.IsRecipeCraftable(recipe, chosen))
                    {
                        craftableSet.Add(recipe.Result.Id);
                    }
                }
                craftableItems = craftableSet.ToList();
            }

            challenge = new DailyChallenge
            {
                Date = targetDate,
                Ingredient1 = chosen[0],
                Ingredient2 = chosen[1],
                Ingredient3 = chosen[2],
                Ingredient4 = chosen[3],
                PossibleCraftsJson = JsonSerializer.Serialize(craftableItems),
                PossibleCraftsCount = craftableItems.Count
            };

            _dbContext.DailyChallenges.Add(challenge);
            await _dbContext.SaveChangesAsync();

            return challenge;
        }
    }
}
