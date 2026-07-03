import React, { useState, useEffect } from 'react';
import { Play, LogOut, Trash2, Award, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5080';

interface Ingredient {
  id: string;
  name: string;
  textureUrl: string;
}

interface CraftedItem {
  id: string;
  name: string;
  textureUrl: string;
  craftedAt: string;
}

interface DailyChallengeStatus {
  date: string;
  ingredients: Ingredient[];
  totalPossibleCrafts: number;
  craftedCount: number;
  history: CraftedItem[];
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Navigation & Session states
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [totalScore, setTotalScore] = useState<number>(parseInt(localStorage.getItem('totalScore') || '0', 10));
  const [activeTab, setActiveTab] = useState<'play' | 'leaderboard'>('play');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Gameplay State
  const [dailyStatus, setDailyStatus] = useState<DailyChallengeStatus | null>(null);
  const [grid, setGrid] = useState<(string | null)[]>(Array(9).fill(null));
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [craftingResult, setCraftingResult] = useState<CraftedItem | null>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Toast System
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Daily Challenge data when user is authenticated
  const fetchDailyChallenge = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/game/daily`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDailyStatus(data);
      } else {
        showToast('Failed to load daily challenge.', 'error');
      }
    } catch (err) {
      showToast('Network error loading game state.', 'error');
    }
  };

  // Fetch Leaderboard entries
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      showToast('Error loading leaderboard.', 'error');
    }
  };

  useEffect(() => {
    if (token) {
      fetchDailyChallenge();
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regConfirmPassword) {
      showToast('All fields are required.', 'error');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (regPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }
    if (!/[a-zA-Z]/.test(regPassword) || !/[0-9]/.test(regPassword)) {
      showToast('Password must contain at least 1 letter and 1 number.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          confirmPassword: regConfirmPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        saveSession(data.token, data.username, data.totalScore);
        showToast('Registration successful! Welcome.', 'success');
      } else {
        showToast(data.message || 'Registration failed.', 'error');
      }
    } catch (err) {
      showToast('Server connection error.', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showToast('Username and password are required.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        saveSession(data.token, data.username, data.totalScore);
        showToast('Logged in successfully.', 'success');
      } else {
        showToast(data.message || 'Invalid username or password.', 'error');
      }
    } catch (err) {
      showToast('Server connection error.', 'error');
    }
  };

  const saveSession = (token: string, user: string, score: number) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('totalScore', score.toString());
    setToken(token);
    setUsername(user);
    setTotalScore(score);
    setAuthView('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('totalScore');
    setToken(null);
    setUsername(null);
    setTotalScore(0);
    setDailyStatus(null);
    setGrid(Array(9).fill(null));
    setSelectedIngredient(null);
    setCraftingResult(null);
    setActiveTab('play');
    showToast('Logged out.', 'info');
  };

  // Craft grid click placements
  const handleSlotClick = (index: number) => {
    const newGrid = [...grid];
    if (newGrid[index]) {
      // Clear slot if it was already filled
      newGrid[index] = null;
    } else if (selectedIngredient) {
      // Place the selected ingredient
      newGrid[index] = selectedIngredient;
    }
    setGrid(newGrid);
    setCraftingResult(null); // Clear any old craft output
  };

  const handleClearGrid = () => {
    setGrid(Array(9).fill(null));
    setCraftingResult(null);
  };

  const handleCraft = async () => {
    const isEmpty = grid.every(cell => cell === null);
    if (isEmpty) {
      showToast('The crafting grid is empty!', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/game/craft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grid })
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCraftingResult(data.craftedItem);
          if (data.isNewDiscovery) {
            showToast('New craft discovered! +1 Score!', 'success');
            // Play a level up sound dynamically using Web Audio API
            playMinecraftLevelUpSound();
            // Update total score local storage & state
            const newScore = totalScore + 1;
            localStorage.setItem('totalScore', newScore.toString());
            setTotalScore(newScore);
          } else {
            showToast('Item crafted successfully (already discovered today).', 'info');
          }
          fetchDailyChallenge(); // Reload history and counts
        } else {
          showToast(data.message || 'Invalid layout shape.', 'error');
        }
      }
    } catch (err) {
      showToast('Error validating craft layout.', 'error');
    }
  };

  const playMinecraftLevelUpSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play 2-tone level up beep (G5 then B5)
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(783.99, now, 0.15); // G5
      playTone(987.77, now + 0.15, 0.3); // B5
    } catch (e) {
      // AudioContext failed to start or browser blocked
    }
  };

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toast && (
        <div className={`mc-toast mc-panel ${toast.type === 'error' ? 'text-red' : toast.type === 'success' ? 'text-green' : 'text-white'}`} style={{ backgroundColor: 'rgba(20,20,20,0.95)', border: '2px solid #5a5a5a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
            {toast.type === 'success' && <CheckCircle size={22} />}
            {toast.type === 'error' && <AlertTriangle size={22} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Authenticated Application */}
      {token ? (
        <>
          <header className="main-header">
            <div className="logo-section">
              <Play className="text-gold" size={30} />
              <span className="logo-text text-gold">MinecraftGuessr</span>
            </div>
            
            <div className="header-nav">
              <button 
                onClick={() => setActiveTab('play')} 
                className={`mc-button ${activeTab === 'play' ? 'text-gold' : ''}`}
                style={{ fontSize: '20px', padding: '6px 15px' }}
              >
                Play
              </button>
              <button 
                onClick={() => setActiveTab('leaderboard')} 
                className={`mc-button ${activeTab === 'leaderboard' ? 'text-gold' : ''}`}
                style={{ fontSize: '20px', padding: '6px 15px' }}
              >
                Leaderboard
              </button>

              <div className="user-badge text-gold">
                <Award size={18} />
                <span>{username}</span>
                <span style={{ color: '#aaa', marginLeft: '5px' }}>({totalScore} pts)</span>
              </div>

              <button 
                onClick={handleLogout} 
                className="mc-button text-red"
                style={{ fontSize: '20px', padding: '6px 12px' }}
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'play' ? (
              <div className="game-container">
                {/* Crafting Grid Side */}
                <div className="crafting-section">
                  <div className="instructions-panel mc-panel dark">
                    <h2 className="text-gold" style={{ fontSize: '24px', marginBottom: '8px' }}>How to play</h2>
                    <p>Every day at midnight UTC, a new challenge launches. Today you have 4 ingredients shown below.</p>
                    <ul>
                      <li>Select an ingredient from the dock (highlighted in green).</li>
                      <li>Click empty slots in the 3x3 table to place it.</li>
                      <li>Click an occupied grid slot to clear it.</li>
                      <li>Assemble valid recipes and click the Output slot or "CRAFT" to register it!</li>
                    </ul>
                  </div>

                  {dailyStatus && (
                    <div className="progress-header mc-panel dark">
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px' }}>
                          <span className="text-gold">Daily Discoveries</span>
                          <span className="text-green">{dailyStatus.craftedCount} / {dailyStatus.totalPossibleCrafts} Crafted</span>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${dailyStatus.totalPossibleCrafts > 0 ? (dailyStatus.craftedCount / dailyStatus.totalPossibleCrafts) * 100 : 0}%` }}
                          />
                          <span className="progress-bar-text">
                            {dailyStatus.totalPossibleCrafts > 0 ? Math.round((dailyStatus.craftedCount / dailyStatus.totalPossibleCrafts) * 100) : 0}% Found
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Crafting Table Grid */}
                  <div className="crafting-table-ui">
                    <div className="grid-3x3">
                      {grid.map((cell, idx) => {
                        const ing = dailyStatus?.ingredients.find(i => i.id === cell);
                        return (
                          <div 
                            key={idx} 
                            className="crafting-slot"
                            onClick={() => handleSlotClick(idx)}
                          >
                            {cell && ing && (
                              <div className="slot-item">
                                <img src={`${API_BASE}${ing.textureUrl}`} alt={ing.name} />
                                <span className="slot-tooltip">{ing.name}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="crafting-arrow">➜</div>

                    {/* Output Slot */}
                    <div 
                      className={`output-slot ${craftingResult ? 'active' : ''}`}
                      onClick={handleCraft}
                    >
                      {craftingResult ? (
                        <div className="slot-item celebrate-animation">
                          <img src={`${API_BASE}${craftingResult.textureUrl}`} alt={craftingResult.name} />
                          <span className="slot-tooltip">{craftingResult.name} (Click to Register)</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '32px', color: '#4c4c4c', textShadow: 'none', userSelect: 'none' }}>?</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '15px', width: '100%', maxWidth: '350px' }}>
                    <button 
                      onClick={handleClearGrid} 
                      className="mc-button text-red" 
                      style={{ flex: 1, gap: '8px', fontSize: '22px' }}
                    >
                      <Trash2 size={20} /> Clear
                    </button>
                    <button 
                      onClick={handleCraft} 
                      className="mc-button text-green" 
                      style={{ flex: 2, fontSize: '22px' }}
                    >
                      CRAFT
                    </button>
                  </div>

                  {/* Inventory dock displaying 4 ingredients */}
                  {dailyStatus && (
                    <div className="inventory-dock">
                      <span className="inventory-title">Active Ingredients Dock</span>
                      <div className="inventory-slots">
                        {dailyStatus.ingredients.map(ing => (
                          <div 
                            key={ing.id}
                            className={`inventory-slot ${selectedIngredient === ing.id ? 'selected' : ''}`}
                            onClick={() => setSelectedIngredient(selectedIngredient === ing.id ? null : ing.id)}
                            title={ing.name}
                          >
                            <div className="slot-item">
                              <img src={`${API_BASE}${ing.textureUrl}`} alt={ing.name} />
                              <span className="slot-tooltip">{ing.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <span style={{ color: '#444', fontSize: '18px', textAlign: 'center' }}>
                        {selectedIngredient ? `Placing: ${FormatItemName(selectedIngredient)}` : 'Click an ingredient to select, then click grid cells.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sidebar Discoveries History */}
                <div className="history-section mc-panel dark">
                  <h3 className="text-gold" style={{ fontSize: '26px', borderBottom: '2px solid #5a5a5a', paddingBottom: '10px' }}>
                    History today ({dailyStatus?.craftedCount || 0})
                  </h3>
                  {dailyStatus && dailyStatus.history.length > 0 ? (
                    <div className="history-list">
                      {dailyStatus.history.map(item => (
                        <div key={item.id} className="history-item">
                          <img src={`${API_BASE}${item.textureUrl}`} alt={item.name} />
                          <div className="history-details">
                            <span className="history-name text-green">{item.name}</span>
                            <span className="history-time">Found at {new Date(item.craftedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#888', marginTop: '40px', fontSize: '22px' }}>
                      No items crafted yet today. Start guessing shapes!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Leaderboard view */
              <div className="leaderboard-wrapper mc-panel dark">
                <div className="leaderboard-title-box">
                  <h2 className="text-gold" style={{ fontSize: '36px', marginBottom: '5px' }}>Global Leaderboard</h2>
                  <p style={{ color: '#aaa', fontSize: '20px' }}>Top players sorted by total score. Play daily to climb ranks!</p>
                </div>

                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th className="rank-col">Rank</th>
                      <th>Player</th>
                      <th style={{ textAlign: 'right' }}>Total Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      leaderboard.map(entry => (
                        <tr 
                          key={entry.username} 
                          className={`leaderboard-row ${entry.username === username ? 'current-user' : ''}`}
                        >
                          <td className="rank-col">
                            <span className={`rank-pill ${
                              entry.rank === 1 ? 'gold' :
                              entry.rank === 2 ? 'silver' :
                              entry.rank === 3 ? 'bronze' : 'default'
                            }`}>
                              {entry.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: entry.username === username ? 'bold' : 'normal' }}>
                            {entry.username}
                          </td>
                          <td className="text-gold" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {entry.score} pts
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: '30px' }}>
                          Loading leaderboard details...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      ) : (
        /* Authentication Screen (Unauthenticated) */
        <div className="auth-wrapper">
          <div className="auth-card mc-panel">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Play className="text-gold" size={40} style={{ margin: '0 auto 10px' }} />
              <h1 className="text-gold" style={{ fontSize: '42px', letterSpacing: '1px' }}>MinecraftGuessr</h1>
              <p style={{ color: '#444', fontSize: '20px', fontWeight: 'bold' }}>The Daily Crafting Puzzle</p>
            </div>

            {authView === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label htmlFor="login-username">Username</label>
                  <input 
                    type="text" 
                    id="login-username"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    className="mc-input"
                    placeholder="Enter username"
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input 
                    type="password" 
                    id="login-password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="mc-input"
                    placeholder="Enter password"
                  />
                </div>
                <button type="submit" className="mc-button text-gold" style={{ marginTop: '10px' }}>
                  LOG IN
                </button>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '20px', color: '#444' }}>
                  Don't have an account?{' '}
                  <span 
                    onClick={() => setAuthView('register')} 
                    style={{ textDecoration: 'underline', cursor: 'pointer', color: '#111' }}
                  >
                    Register here
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
                <div className="form-group">
                  <label htmlFor="reg-username">Username</label>
                  <input 
                    type="text" 
                    id="reg-username"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    className="mc-input"
                    placeholder="Enter username"
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password">Password</label>
                  <input 
                    type="password" 
                    id="reg-password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="mc-input"
                    placeholder="Min 8 chars, 1 letter, 1 number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-confirm">Confirm Password</label>
                  <input 
                    type="password" 
                    id="reg-confirm"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    className="mc-input"
                    placeholder="Re-enter password"
                  />
                </div>
                <button type="submit" className="mc-button text-gold" style={{ marginTop: '10px' }}>
                  REGISTER
                </button>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '20px', color: '#444' }}>
                  Already have an account?{' '}
                  <span 
                    onClick={() => setAuthView('login')} 
                    style={{ textDecoration: 'underline', cursor: 'pointer', color: '#111' }}
                  >
                    Log in here
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to format item names on client-side
function FormatItemName(itemId: string): string {
  const name = itemId.replace('minecraft:', '').replace(/_/g, ' ');
  return name.replace(/\b\w/g, c => c.toUpperCase());
}
