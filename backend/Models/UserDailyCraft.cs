using System;
using System.ComponentModel.DataAnnotations;

namespace MinecraftGuessr.Models
{
    public class UserDailyCraft
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(100)]
        public string CraftedItemId { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
