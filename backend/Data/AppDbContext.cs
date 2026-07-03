using Microsoft.EntityFrameworkCore;
using MinecraftGuessr.Models;

namespace MinecraftGuessr.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<DailyChallenge> DailyChallenges => Set<DailyChallenge>();
        public DbSet<UserDailyCraft> UserDailyCrafts => Set<UserDailyCraft>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure DailyChallenge key to be Date only (represented by DateTime at midnight)
            modelBuilder.Entity<DailyChallenge>()
                .HasKey(c => c.Date);

            // Configure index on UserDailyCrafts for fast lookups by User and Date
            modelBuilder.Entity<UserDailyCraft>()
                .HasIndex(c => new { c.UserId, c.Date });
                
            // Ensure unique username
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();
        }
    }
}
