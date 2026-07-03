using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MinecraftGuessr.Data;

namespace MinecraftGuessr.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaderboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LeaderboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaderboard()
        {
            var topUsers = await _context.Users
                .OrderByDescending(u => u.TotalScore)
                .ThenBy(u => u.Username)
                .Take(100)
                .Select(u => new LeaderboardEntryDto
                {
                    Username = u.Username,
                    Score = u.TotalScore
                })
                .ToListAsync();

            // Compute rank dynamically
            var result = topUsers.Select((u, index) => new LeaderboardEntryDto
            {
                Rank = index + 1,
                Username = u.Username,
                Score = u.Score
            }).ToList();

            return Ok(result);
        }
    }

    public class LeaderboardEntryDto
    {
        public int Rank { get; set; }
        public string Username { get; set; } = string.Empty;
        public int Score { get; set; }
    }
}
