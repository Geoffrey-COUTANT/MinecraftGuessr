import React, { useState, useEffect } from 'react';
import { Play, LogOut, Award, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5080';

const getTextureUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
};

const getTextureClass = (_itemId: string) => {
  return '';
};

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
  possibleCrafts: Ingredient[];
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
  const [isAdmin, setIsAdmin] = useState<boolean>(localStorage.getItem('isAdmin') === 'true');
  const [activeTab, setActiveTab] = useState<'home' | 'play' | 'leaderboard' | 'profile'>('home');
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
  const [isPossibleCraftsOpen, setIsPossibleCraftsOpen] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  // Profile / Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);

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
        // Check if just completed
        if (data.craftedCount === data.totalPossibleCrafts && data.totalPossibleCrafts > 0) {
          if (dailyStatus && dailyStatus.craftedCount < dailyStatus.totalPossibleCrafts) {
            setShowCongrats(true);
          }
        }
        setDailyStatus(data);
      } else {
        showToast('Failed to load daily challenge.', 'error');
      }
    } catch (err) {
      showToast('Network error loading game state.', 'error');
    }
  };

  // Fetch past challenges history
  const fetchGameHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/game/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      } else {
        showToast('Failed to load past history.', 'error');
      }
    } catch (err) {
      showToast('Error loading history.', 'error');
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast('All fields are required.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showToast('New password must contain at least 1 letter and 1 number.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        showToast(data.message || 'Failed to change password.', 'error');
      }
    } catch (err) {
      showToast('Server connection error.', 'error');
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
      fetchLeaderboard();
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'leaderboard' || activeTab === 'home') {
      fetchLeaderboard();
    } else if (activeTab === 'profile') {
      fetchGameHistory();
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
        saveSession(data.token, data.username, data.totalScore, data.isAdmin);
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
        saveSession(data.token, data.username, data.totalScore, data.isAdmin);
        showToast('Logged in successfully.', 'success');
      } else {
        showToast(data.message || 'Invalid username or password.', 'error');
      }
    } catch (err) {
      showToast('Server connection error.', 'error');
    }
  };

  const saveSession = (token: string, user: string, score: number, isAdminUser: boolean) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('totalScore', score.toString());
    localStorage.setItem('isAdmin', isAdminUser ? 'true' : 'false');
    setToken(token);
    setUsername(user);
    setTotalScore(score);
    setIsAdmin(isAdminUser);
    setAuthView('login');
    setActiveTab('home'); // Go to home after logging in or registering
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('totalScore');
    localStorage.removeItem('isAdmin');
    setToken(null);
    setUsername(null);
    setTotalScore(0);
    setIsAdmin(false);
    setDailyStatus(null);
    setGrid(Array(9).fill(null));
    setSelectedIngredient(null);
    setCraftingResult(null);
    setActiveTab('home');
    showToast('Logged out.', 'info');
  };

  // Craft grid click placements
  const handleSlotClick = (index: number) => {
    const newGrid = [...grid];
    if (selectedIngredient) {
      if (newGrid[index] === selectedIngredient) {
        // Toggle off if clicking with the same selected ingredient
        newGrid[index] = null;
      } else {
        // Place or replace with selected ingredient
        newGrid[index] = selectedIngredient;
      }
    } else {
      // Clear slot if no ingredient is selected
      newGrid[index] = null;
    }
    setGrid(newGrid);
    setCraftingResult(null); // Clear any old craft output
  };

  const handleRightClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault(); // Prevent standard browser context menu
    const newGrid = [...grid];
    if (newGrid[index]) {
      newGrid[index] = null;
      setGrid(newGrid);
      setCraftingResult(null);
    }
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
            <div 
              className="logo-section clickable-logo" 
              onClick={() => setActiveTab('home')}
              title="Go to Home"
              style={{ cursor: 'pointer' }}
            >
              <Play className="text-gold" size={30} />
              <span className="logo-text text-gold">MinecraftGuessr</span>
            </div>
            
            <div className="header-nav">
              <div 
                className="user-badge text-gold header-score-badge"
                onClick={() => setActiveTab('profile')}
                style={{ cursor: 'pointer' }}
                title="View Profile & Stats"
              >
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
            {/* HOME VIEW */}
            {activeTab === 'home' && (
              <div className="home-container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', width: '100%', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Welcome Panel */}
                <div className="mc-panel dark text-center" style={{ padding: '30px' }}>
                  <h1 className="text-gold" style={{ fontSize: '42px', marginBottom: '10px', textShadow: '3px 3px 0px #000', margin: 0 }}>
                    Welcome to MinecraftGuessr!
                  </h1>
                  <p style={{ fontSize: '22px', color: '#ccc', lineHeight: '1.4', margin: 0 }}>
                    A daily crafting puzzle game. Use the 4 daily ingredients in a 3x3 crafting grid to discover all the possible recipes of the day!
                  </p>
                </div>

                {/* Dashboard Grid */}
                <div className="home-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  {/* Play Card */}
                  <div className="mc-panel dark dashboard-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div className="card-header-icon text-gold" style={{ borderBottom: '2px solid #5a5a5a', paddingBottom: '10px' }}>
                        <Play size={30} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }} />
                        <span style={{ fontSize: '26px', verticalAlign: 'middle', fontWeight: 'bold' }}>PLAY GAME</span>
                      </div>
                      
                      <p style={{ fontSize: '18px', color: '#ccc', margin: '15px 0', lineHeight: '1.4' }}>
                        Try to guess all recipes using today's ingredients. A new challenge is released every day!
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                        <div className="card-stats-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#aaa', fontSize: '18px' }}>Today's Progress:</span>
                          {dailyStatus ? (
                            <span style={{ fontSize: '22px', fontWeight: 'bold' }} className={dailyStatus.craftedCount === dailyStatus.totalPossibleCrafts ? "text-green" : "text-white"}>
                              {dailyStatus.craftedCount} / {dailyStatus.totalPossibleCrafts} Crafted
                            </span>
                          ) : (
                            <span style={{ fontSize: '18px' }} className="text-white">Loading...</span>
                          )}
                        </div>

                        {dailyStatus && dailyStatus.totalPossibleCrafts > 0 && (
                          <div className="progress-bar-container" style={{ margin: '0 0 10px 0', height: '20px' }}>
                            <div 
                              className="progress-bar-fill" 
                              style={{ width: `${(dailyStatus.craftedCount / dailyStatus.totalPossibleCrafts) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      {dailyStatus && dailyStatus.craftedCount === dailyStatus.totalPossibleCrafts && dailyStatus.totalPossibleCrafts > 0 ? (
                        <div>
                          <button 
                            className="mc-button disabled"
                            style={{ fontSize: '22px', width: '100%', cursor: 'not-allowed', opacity: 0.6 }}
                            disabled
                          >
                            COMPLETED TODAY
                          </button>
                          <p style={{ color: '#ff5555', marginTop: '8px', fontSize: '16px', textAlign: 'center' }}>
                            ✓ Today's daily challenge complete!
                          </p>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveTab('play')}
                          className="mc-button text-gold"
                          style={{ fontSize: '22px', width: '100%' }}
                        >
                          PLAY TODAY'S GAME
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Leaderboard Card */}
                  <div className="mc-panel dark dashboard-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div className="card-header-icon text-gold" style={{ borderBottom: '2px solid #5a5a5a', paddingBottom: '10px' }}>
                        <Award size={30} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }} />
                        <span style={{ fontSize: '26px', verticalAlign: 'middle', fontWeight: 'bold' }}>LEADERBOARD</span>
                      </div>

                      <p style={{ fontSize: '18px', color: '#ccc', margin: '15px 0', lineHeight: '1.4' }}>
                        Compete with other crafters globally. Can you reach the top of the leaderboard?
                      </p>

                      <div style={{ marginTop: '20px' }}>
                        <div className="mini-leaderboard">
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '18px' }}>
                            <tbody>
                              {leaderboard.length > 0 ? (
                                leaderboard.slice(0, 3).map(entry => (
                                  <tr key={entry.username} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '6px 0', width: '40px' }}>
                                      <span className={`rank-pill ${
                                        entry.rank === 1 ? 'gold' :
                                        entry.rank === 2 ? 'silver' :
                                        entry.rank === 3 ? 'bronze' : 'default'
                                      }`} style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                                        {entry.rank}
                                      </span>
                                    </td>
                                    <td style={{ padding: '6px 0', color: entry.username === username ? '#55ff55' : '#fff', fontWeight: entry.username === username ? 'bold' : 'normal' }}>
                                      {entry.username}
                                    </td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#ffaa00', fontWeight: 'bold' }}>
                                      {entry.score} pts
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: '10px 0' }}>
                                    Loading leaderboard...
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('leaderboard')}
                      className="mc-button"
                      style={{ fontSize: '22px', width: '100%', marginTop: '20px' }}
                    >
                      VIEW LEADERBOARD
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PLAY VIEW */}
            {activeTab === 'play' && (
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '22px' }}>
                          <span className="text-gold">Daily Discoveries</span>
                          {isAdmin && (
                            <button 
                              onClick={() => setIsPossibleCraftsOpen(true)}
                              className="mc-button"
                              style={{ fontSize: '18px', padding: '4px 10px', height: 'auto', lineHeight: 1 }}
                            >
                              Recipes list
                            </button>
                          )}
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

                  <div className="crafting-table-container">
                    <div className="crafting-table mc-panel">
                      <div className="crafting-grid">
                        {grid.map((cell, idx) => {
                          const ing = cell ? dailyStatus?.ingredients.find(i => i.id === cell) : null;
                          return (
                            <div 
                              key={idx} 
                              className={`slot slot-input ${selectedIngredient ? 'hoverable' : ''}`}
                              onClick={() => handleSlotClick(idx)}
                              onContextMenu={(e) => handleRightClick(e, idx)}
                            >
                              {ing && (
                                <div className="slot-item" title={ing.name}>
                                  <img src={getTextureUrl(ing.textureUrl)} alt={ing.name} className={getTextureClass(ing.id)} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="crafting-arrow">➜</div>

                      <div className="crafting-output">
                        <div className="slot slot-output" onClick={handleCraft} title="Click to Craft!">
                          {craftingResult && (
                            <div className="slot-item animated-pulse" title={craftingResult.name}>
                              <img src={getTextureUrl(craftingResult.textureUrl)} alt={craftingResult.name} className={getTextureClass(craftingResult.id)} />
                            </div>
                          )}
                        </div>
                        <span className="output-label text-gold">OUTPUT</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '15px' }}>
                      <button onClick={handleCraft} className="mc-button text-gold" style={{ fontSize: '20px', padding: '10px 25px' }}>
                        CRAFT
                      </button>
                      <button onClick={handleClearGrid} className="mc-button text-red" style={{ fontSize: '20px', padding: '10px 20px' }}>
                        CLEAR GRID
                      </button>
                    </div>
                  </div>

                  {/* Dock / Selection Side */}
                  <div className="dock-panel mc-panel dark">
                    <h3 className="text-gold" style={{ fontSize: '22px', borderBottom: '2px solid #5a5a5a', paddingBottom: '8px', marginBottom: '15px' }}>
                      Available Ingredients
                    </h3>
                    <div className="ingredients-dock">
                      {dailyStatus?.ingredients.map(ing => (
                        <div 
                          key={ing.id} 
                          className={`dock-slot ${selectedIngredient === ing.id ? 'selected' : ''}`}
                          onClick={() => setSelectedIngredient(selectedIngredient === ing.id ? null : ing.id)}
                          title={`${ing.name} (Click to select)`}
                        >
                          <img src={getTextureUrl(ing.textureUrl)} alt={ing.name} className={getTextureClass(ing.id)} />
                        </div>
                      ))}
                    </div>
                    {selectedIngredient && (
                      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '18px', color: '#ffaa00' }}>
                        Ingredient selected! Click grid cells to place it.
                      </div>
                    )}
                  </div>
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
                          <img src={getTextureUrl(item.textureUrl)} alt={item.name} className={getTextureClass(item.id)} />
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
            )}

            {/* LEADERBOARD VIEW */}
            {activeTab === 'leaderboard' && (
              <div className="leaderboard-wrapper mc-panel dark" style={{ width: '100%', maxWidth: '800px', margin: '40px auto' }}>
                <div className="leaderboard-title-box">
                  <h2 className="text-gold" style={{ fontSize: '36px', marginBottom: '5px', margin: 0 }}>Global Leaderboard</h2>
                  <p style={{ color: '#aaa', fontSize: '20px', margin: 0 }}>Top players sorted by total score. Play daily to climb ranks!</p>
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

            {/* PROFILE VIEW */}
            {activeTab === 'profile' && (
              <div className="profile-container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
                {/* Account card & password form */}
                <div className="mc-panel dark" style={{ padding: '30px' }}>
                  <h2 className="text-gold" style={{ fontSize: '30px', borderBottom: '2px solid #5a5a5a', paddingBottom: '10px', marginBottom: '20px', margin: 0 }}>Your Profile</h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    {/* User Info details */}
                    <div>
                      <h3 className="text-gold" style={{ fontSize: '22px', marginBottom: '15px', marginTop: 0 }}>Account Info</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '18px', color: '#ccc' }}>
                        <p>Username: <strong className="text-white">{username}</strong></p>
                        <p>Total Score: <strong className="text-gold">{totalScore} Points</strong></p>
                        <p>Role: <strong className="text-white">{isAdmin ? 'Administrator' : 'Player'}</strong></p>
                      </div>
                    </div>

                    {/* Change password form */}
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 className="text-gold" style={{ fontSize: '22px', margin: 0 }}>Change Password</h3>
                      
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="current-pw" style={{ color: '#aaa', fontSize: '15px' }}>Current Password</label>
                        <input 
                          type="password" 
                          id="current-pw"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="mc-input"
                          placeholder="Current password"
                          style={{ padding: '8px 12px' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="new-pw" style={{ color: '#aaa', fontSize: '15px' }}>New Password</label>
                        <input 
                          type="password" 
                          id="new-pw"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="mc-input"
                          placeholder="New password"
                          style={{ padding: '8px 12px' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="confirm-new-pw" style={{ color: '#aaa', fontSize: '15px' }}>Confirm New Password</label>
                        <input 
                          type="password" 
                          id="confirm-new-pw"
                          value={confirmNewPassword}
                          onChange={e => setConfirmNewPassword(e.target.value)}
                          className="mc-input"
                          placeholder="Re-enter new password"
                          style={{ padding: '8px 12px' }}
                        />
                      </div>

                      <button type="submit" className="mc-button text-gold" style={{ marginTop: '10px', alignSelf: 'flex-start', padding: '6px 15px' }}>
                        Update Password
                      </button>
                    </form>
                  </div>
                </div>

                {/* Challenges History */}
                <div className="mc-panel dark" style={{ padding: '30px' }}>
                  <h2 className="text-gold" style={{ fontSize: '30px', borderBottom: '2px solid #5a5a5a', paddingBottom: '10px', marginBottom: '20px', margin: 0 }}>Game History</h2>
                  
                  {historyData && historyData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                      {historyData.map(challenge => (
                        <div key={challenge.date} className="mc-panel" style={{ background: 'rgba(20,20,20,0.4)', padding: '20px', border: '2px solid #5a5a5a' }}>
                          
                          {/* Date and count */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>
                            <span className="text-gold" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                              Challenge of {new Date(challenge.date).toLocaleDateString()}
                            </span>
                            <span className="text-green" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                              {challenge.craftedCount} / {challenge.totalPossibleCrafts} Crafted
                            </span>
                          </div>

                          {/* 4 Ingredients */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <span style={{ color: '#aaa', fontSize: '16px' }}>Ingredients:</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {challenge.ingredients.map((ing: any) => (
                                <div key={ing.id} className="history-dock-slot" title={ing.name}>
                                  <img src={getTextureUrl(ing.textureUrl)} alt={ing.name} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Possible crafts with success indicators */}
                          <h4 className="text-gold" style={{ fontSize: '18px', marginBottom: '10px', marginTop: 0 }}>Possible Crafts:</h4>
                          <div className="history-crafts-grid">
                            {challenge.crafts.map((craft: any) => (
                              <div key={craft.id} className={`history-craft-card ${craft.succeeded ? 'success' : 'failed'}`}>
                                <div className="history-craft-icon">
                                  <img src={getTextureUrl(craft.textureUrl)} alt={craft.name} />
                                </div>
                                <div className="history-craft-info">
                                  <span className="history-craft-name">{craft.name}</span>
                                  <span className={`history-craft-status ${craft.succeeded ? 'text-green' : 'text-red'}`}>
                                    {craft.succeeded ? '✓ Discovered' : '✗ Missed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px', fontSize: '20px' }}>
                      No game history found. Finish today's game first!
                    </div>
                  )}
                </div>
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

      {/* Modal Overlay for Possible Crafts */}
      {isPossibleCraftsOpen && dailyStatus && (
        <div className="mc-modal-overlay" onClick={() => setIsPossibleCraftsOpen(false)}>
          <div className="mc-modal-content mc-panel dark" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header">
              <h2 className="text-gold" style={{ fontSize: '28px', textShadow: '2px 2px 0px #000', margin: 0 }}>Possible Recipes ({dailyStatus.possibleCrafts?.length || 0})</h2>
              <button className="mc-modal-close" onClick={() => setIsPossibleCraftsOpen(false)}>×</button>
            </div>
            <div className="mc-modal-body">
              <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '18px' }}>
                Here are all the items you can craft using only today's 4 active ingredients:
              </p>
              <div className="possible-crafts-grid">
                {dailyStatus.possibleCrafts?.map(item => {
                  const isCrafted = dailyStatus.history.some(h => h.id === item.id);
                  return (
                    <div key={item.id} className={`possible-craft-card ${isCrafted ? 'crafted' : ''}`}>
                      <div className="possible-craft-icon">
                        <img src={getTextureUrl(item.textureUrl)} alt={item.name} />
                      </div>
                      <div className="possible-craft-details">
                        <span className="possible-craft-name">{item.name}</span>
                        {isCrafted ? (
                          <span className="possible-craft-status text-green" style={{ fontSize: '15px' }}>✓ Discovered</span>
                        ) : (
                          <span className="possible-craft-status text-red" style={{ fontSize: '15px' }}>? Locked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Congratulations Modal */}
      {showCongrats && (
        <div className="mc-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="mc-modal-content mc-panel dark text-center" style={{ maxWidth: '550px', padding: '30px' }}>
            <h2 className="text-gold animate-bounce" style={{ fontSize: '32px', marginBottom: '15px', textShadow: '2px 2px 0px #000', margin: 0 }}>
              CONGRATULATIONS!
            </h2>
            <div style={{ fontSize: '20px', marginBottom: '25px', lineHeight: '1.5', color: '#ccc' }}>
              <p>You have successfully discovered all <strong className="text-green" style={{ fontSize: '24px' }}>{dailyStatus?.totalPossibleCrafts}</strong> possible crafts for today's challenge!</p>
              <p style={{ marginTop: '15px', color: '#ffd700', fontWeight: 'bold' }}>Great job, crafter!</p>
            </div>
            <button 
              onClick={() => {
                setShowCongrats(false);
                setActiveTab('home');
              }}
              className="mc-button text-gold"
              style={{ padding: '10px 20px', fontSize: '20px', display: 'inline-block' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to format item names on client-side
export function FormatItemName(itemId: string): string {
  const name = itemId.replace('minecraft:', '').replace(/_/g, ' ');
  return name.replace(/\b\w/g, c => c.toUpperCase());
}
