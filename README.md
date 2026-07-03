# MinecraftGuessr ⛏️

MinecraftGuessr is a daily web-based puzzle game inspired by crafting mechanics and word guessing games. Every day, players receive a set of four randomly selected Minecraft ingredients and must use them in a 3x3 crafting grid to discover all possible recipes. Each new craft adds to their score on the global leaderboard.

---

## Features

- **Daily Challenges:** A fresh global challenge resets every day at 00:00 UTC. Every player gets the same four base ingredients.
- **Crafting Grid Simulation:** Drag and place ingredients into a 3x3 grid matching Minecraft crafting shapes. Supports both shaped (anywhere on the grid) and shapeless recipes.
- **Discovery Tracker:** A progress bar showing how many items you've successfully crafted out of the total possible crafts for the day.
- **Global Leaderboard:** Compete against other players. Points accumulate and your rank updates in real time.
- **Sound Effects:** Retro level-up sound alerts when a new craft is discovered.
- **Aesthetic Design:** 75% classic Minecraft HUD theme mixed with a clean modern layout.

---

## Tech Stack

- **Backend:** C# ASP.NET Core Web API (running on .NET 10.0), Entity Framework Core, PostgreSQL, JWT Authentication, BCrypt.
- **Frontend:** React, TypeScript, Vite, Vanilla CSS.
- **Containerization:** Docker Compose for the backend service and database.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [Node.js](https://nodejs.org/) (LTS version)

### Running with Docker Compose (Recommended)

1. Clone the repository and navigate to the project directory:
   ```bash
   cd MinecraftGuessr
   ```
2. Build and start the PostgreSQL database and backend container services:
   ```bash
   docker-compose up --build -d
   ```
   *Note: The database migrations run automatically on startup. The API will listen on port `5080`.*
3. Install the frontend dependencies and run the client dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Open your browser to the URL printed in the terminal (usually [http://localhost:5173](http://localhost:5173)).

---

## Development Manual Setup (No Docker)

If you prefer to run the database and backend directly on your local system:

### 1. Database Configuration
1. Ensure PostgreSQL is installed and running locally.
2. Edit [backend/appsettings.json](backend/appsettings.json) and configure the database connection string:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Database=minecraft_guessr;Username=your_username;Password=your_password"
   }
   ```

### 2. Startup Backend
1. Generate or update EF migrations and apply them to your database:
   ```bash
   cd backend
   dotnet ef database update
   ```
2. Run the C# Web API project:
   ```bash
   dotnet run
   ```

### 3. Startup Frontend
1. Make sure the API base URL in [frontend/src/App.tsx](frontend/src/App.tsx) matches your local running port.
2. Launch the frontend Vite dev server:
   ```bash
   cd frontend
   npm run dev
   ```
