using System;
using System.ComponentModel.DataAnnotations;

namespace MinecraftGuessr.Models
{
    public class DailyChallenge
    {
        [Key]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(100)]
        public string Ingredient1 { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Ingredient2 { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Ingredient3 { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Ingredient4 { get; set; } = string.Empty;

        [Required]
        public string PossibleCraftsJson { get; set; } = string.Empty;

        public int PossibleCraftsCount { get; set; }
    }
}
