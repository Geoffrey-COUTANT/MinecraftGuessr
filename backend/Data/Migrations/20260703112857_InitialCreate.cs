using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MinecraftGuessr.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyChallenges",
                columns: table => new
                {
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Ingredient1 = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Ingredient2 = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Ingredient3 = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Ingredient4 = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PossibleCraftsJson = table.Column<string>(type: "text", nullable: false),
                    PossibleCraftsCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyChallenges", x => x.Date);
                });

            migrationBuilder.CreateTable(
                name: "UserDailyCrafts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CraftedItemId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDailyCrafts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    TotalScore = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserDailyCrafts_UserId_Date",
                table: "UserDailyCrafts",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyChallenges");

            migrationBuilder.DropTable(
                name: "UserDailyCrafts");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
