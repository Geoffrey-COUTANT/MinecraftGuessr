using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace MinecraftGuessr.Services
{
    public class Recipe
    {
        public string Id { get; set; } = string.Empty; // file name or result id
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public Dictionary<string, string>? Key { get; set; }
        public List<string>? Pattern { get; set; }
        public List<string>? Ingredients { get; set; }
        public RecipeResult Result { get; set; } = new();
    }

    public class RecipeResult
    {
        public string Id { get; set; } = string.Empty;
        public int Count { get; set; } = 1;
    }

    public class RecipeService
    {
        private readonly List<Recipe> _recipes = new();
        private readonly ILogger<RecipeService> _logger;
        private readonly HashSet<string> _allBaseIngredients = new();
        private readonly Dictionary<string, string> _texturesMap = new(StringComparer.OrdinalIgnoreCase);
        private readonly string _cdnBaseUrl;

        public RecipeService(ILogger<RecipeService> logger, IHostEnvironment env, IConfiguration config)
        {
            _logger = logger;
            _cdnBaseUrl = config["AssetSettings:CdnBaseUrl"]?.TrimEnd('/')
                ?? "https://cdn.jsdelivr.net/gh/Geoffrey-COUTANT/MinecraftGuessr-Assets@main";

            LoadRecipes(env.ContentRootPath);
            LoadTextures(env.ContentRootPath);
        }

        public List<Recipe> GetAllRecipes() => _recipes;

        public HashSet<string> GetAllBaseIngredients() => _allBaseIngredients;

        public string GetTextureUrl(string itemId)
        {
            var name = itemId.Replace("minecraft:", "").ToUpperInvariant();

            // Direct mapping of all items to Owen1212055/mc-assets pre-rendered inventory renders (in uppercase)
            return $"https://raw.githubusercontent.com/Owen1212055/mc-assets/main/item-assets/{name}.png";
        }

        private void LoadTextures(string contentRoot)
        {
            var filePath = Path.Combine(contentRoot, "textures_map.json");
            if (!File.Exists(filePath))
            {
                _logger.LogError($"Textures map file not found at: {filePath}");
                return;
            }

            _logger.LogInformation($"Loading textures map from: {filePath}");

            try
            {
                var content = File.ReadAllText(filePath);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var map = JsonSerializer.Deserialize<Dictionary<string, string>>(content, options);

                if (map != null)
                {
                    foreach (var kvp in map)
                    {
                        _texturesMap[kvp.Key] = kvp.Value;
                    }
                    _logger.LogInformation($"Successfully loaded {_texturesMap.Count} texture mappings.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error reading textures map file: {ex.Message}");
            }
        }

        private void LoadRecipes(string contentRoot)
        {
            var filePath = Path.Combine(contentRoot, "recipes.json");
            if (!File.Exists(filePath))
            {
                _logger.LogError($"Recipes file not found at: {filePath}");
                return;
            }

            _logger.LogInformation($"Loading recipes from: {filePath}");

            try
            {
                var content = File.ReadAllText(filePath);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var recipesList = JsonSerializer.Deserialize<List<Recipe>>(content, options);

                if (recipesList != null)
                {
                    int loadedCount = 0;
                    foreach (var recipe in recipesList)
                    {
                        if (recipe != null && (recipe.Type == "minecraft:crafting_shaped" || recipe.Type == "minecraft:crafting_shapeless"))
                        {
                            // Normalize recipe result ID to always include minecraft:
                            if (!recipe.Result.Id.StartsWith("minecraft:"))
                            {
                                recipe.Result.Id = "minecraft:" + recipe.Result.Id;
                            }

                            _recipes.Add(recipe);
                            ExtractIngredients(recipe);
                            loadedCount++;
                        }
                    }
                    _logger.LogInformation($"Successfully loaded {loadedCount} crafting recipes. Total unique base ingredients: {_allBaseIngredients.Count}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error reading recipes file: {ex.Message}");
            }
        }

        private void ExtractIngredients(Recipe recipe)
        {
            // Extract raw item IDs (excluding tags starting with #) to identify base ingredients
            if (recipe.Type == "minecraft:crafting_shaped" && recipe.Key != null)
            {
                foreach (var kvp in recipe.Key)
                {
                    if (!kvp.Value.StartsWith("#"))
                    {
                        _allBaseIngredients.Add(kvp.Value);
                    }
                }
            }
            else if (recipe.Type == "minecraft:crafting_shapeless" && recipe.Ingredients != null)
            {
                foreach (var ing in recipe.Ingredients)
                {
                    if (!ing.StartsWith("#"))
                    {
                        _allBaseIngredients.Add(ing);
                    }
                }
            }
        }

        // Checks if a recipe can be crafted using ONLY the specified chosenIngredients
        public bool IsRecipeCraftable(Recipe recipe, List<string> chosenIngredients)
        {
            // Helper to check if an ingredient (tag or direct item) matches any of the chosen ingredients
            bool MatchesAny(string ingredient)
            {
                foreach (var chosen in chosenIngredients)
                {
                    if (TagResolver.MatchesTag(chosen, ingredient))
                        return true;
                }
                return false;
            }

            if (recipe.Type == "minecraft:crafting_shaped" && recipe.Key != null)
            {
                // Verify every symbol in the key is satisfied by our chosen ingredients
                foreach (var symbol in recipe.Key.Values)
                {
                    if (!MatchesAny(symbol))
                        return false;
                }
                return true;
            }
            else if (recipe.Type == "minecraft:crafting_shapeless" && recipe.Ingredients != null)
            {
                // Verify every ingredient in the shapeless recipe is satisfied
                foreach (var ingredient in recipe.Ingredients)
                {
                    if (!MatchesAny(ingredient))
                        return false;
                }
                return true;
            }

            return false;
        }

        // Matches a 3x3 crafting grid to a valid recipe, returning the resulting item ID (or null)
        public Recipe? MatchCraftingGrid(string?[,] grid)
        {
            var trimmedUser = TrimGrid(grid);
            int userRows = trimmedUser.GetLength(0);
            int userCols = trimmedUser.GetLength(1);

            if (userRows == 0) return null; // empty grid

            // List of non-empty user items (for shapeless matching)
            var userItemsList = new List<string>();
            for (int r = 0; r < 3; r++)
            {
                for (int c = 0; c < 3; c++)
                {
                    if (!string.IsNullOrEmpty(grid[r, c]))
                    {
                        userItemsList.Add(grid[r, c]!);
                    }
                }
            }

            foreach (var recipe in _recipes)
            {
                if (recipe.Type == "minecraft:crafting_shaped" && recipe.Key != null && recipe.Pattern != null)
                {
                    var trimmedPattern = TrimPattern(recipe.Pattern, recipe.Key);
                    int patRows = trimmedPattern.GetLength(0);
                    int patCols = trimmedPattern.GetLength(1);

                    if (userRows == patRows && userCols == patCols)
                    {
                        bool matched = true;
                        for (int r = 0; r < userRows; r++)
                        {
                            for (int c = 0; c < userCols; c++)
                            {
                                var userVal = trimmedUser[r, c];
                                var patVal = trimmedPattern[r, c];

                                if (string.IsNullOrEmpty(patVal))
                                {
                                    if (!string.IsNullOrEmpty(userVal))
                                    {
                                        matched = false;
                                        break;
                                    }
                                }
                                else
                                {
                                    if (string.IsNullOrEmpty(userVal) || !TagResolver.MatchesTag(userVal, patVal))
                                    {
                                        matched = false;
                                        break;
                                    }
                                }
                            }
                            if (!matched) break;
                        }

                        if (matched)
                        {
                            return recipe;
                        }
                    }
                }
                else if (recipe.Type == "minecraft:crafting_shapeless" && recipe.Ingredients != null)
                {
                    if (userItemsList.Count == recipe.Ingredients.Count)
                    {
                        var matchedIngredients = new bool[recipe.Ingredients.Count];
                        if (MatchShapeless(userItemsList, recipe.Ingredients, 0, matchedIngredients))
                        {
                            return recipe;
                        }
                    }
                }
            }

            return null;
        }

        private static string?[,] TrimGrid(string?[,] grid)
        {
            int minRow = 3, maxRow = -1, minCol = 3, maxCol = -1;
            for (int r = 0; r < 3; r++)
            {
                for (int c = 0; c < 3; c++)
                {
                    if (!string.IsNullOrEmpty(grid[r, c]))
                    {
                        if (r < minRow) minRow = r;
                        if (r > maxRow) maxRow = r;
                        if (c < minCol) minCol = c;
                        if (c > maxCol) maxCol = c;
                    }
                }
            }

            if (maxRow == -1) // empty grid
                return new string?[0, 0];

            int rows = maxRow - minRow + 1;
            int cols = maxCol - minCol + 1;
            var trimmed = new string?[rows, cols];
            for (int r = 0; r < rows; r++)
            {
                for (int c = 0; c < cols; c++)
                {
                    trimmed[r, c] = grid[minRow + r, minCol + c];
                }
            }
            return trimmed;
        }

        private static string[,] TrimPattern(List<string> pattern, Dictionary<string, string> key)
        {
            int minRow = pattern.Count, maxRow = -1, minCol = 99, maxCol = -1;
            for (int r = 0; r < pattern.Count; r++)
            {
                var rowStr = pattern[r];
                for (int c = 0; c < rowStr.Length; c++)
                {
                    if (rowStr[c] != ' ')
                    {
                        if (r < minRow) minRow = r;
                        if (r > maxRow) maxRow = r;
                        if (c < minCol) minCol = c;
                        if (c > maxCol) maxCol = c;
                    }
                }
            }

            if (maxRow == -1) // empty pattern
                return new string[0, 0];

            int rows = maxRow - minRow + 1;
            int cols = maxCol - minCol + 1;
            var trimmed = new string[rows, cols];
            for (int r = 0; r < rows; r++)
            {
                var rowStr = pattern[minRow + r];
                for (int c = 0; c < cols; c++)
                {
                    char charAt = (minCol + c < rowStr.Length) ? rowStr[minCol + c] : ' ';
                    if (charAt != ' ' && key.TryGetValue(charAt.ToString(), out var ingredient))
                    {
                        trimmed[r, c] = ingredient;
                    }
                    else
                    {
                        trimmed[r, c] = string.Empty;
                    }
                }
            }
            return trimmed;
        }

        private static bool MatchShapeless(List<string> userItems, List<string> recipeIngredients, int userIdx, bool[] matchedIngredients)
        {
            if (userIdx >= userItems.Count)
                return true;

            var userItem = userItems[userIdx];
            for (int i = 0; i < recipeIngredients.Count; i++)
            {
                if (!matchedIngredients[i] && TagResolver.MatchesTag(userItem, recipeIngredients[i]))
                {
                    matchedIngredients[i] = true;
                    if (MatchShapeless(userItems, recipeIngredients, userIdx + 1, matchedIngredients))
                        return true;
                    matchedIngredients[i] = false;
                }
            }
            return false;
        }
    }
}
