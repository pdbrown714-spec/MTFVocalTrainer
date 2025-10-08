/**
 * LocalStorage wrapper for managing user data, progress, and settings
 */
class Storage {
  constructor() {
    this.storageKey = 'voiceTrainer';
    this.initializeStorage();
  }

  initializeStorage() {
    if (!this.getData()) {
      const defaultData = {
        settings: {
          targetNote: 'E3',
          targetFrequency: 164.81,
          darkMode: true,
          notificationsEnabled: true,
          sensitivity: 0.8
        },
        progress: {
          currentSection: 1,
          section1Unlocked: true,
          section2Unlocked: false,
          section3Unlocked: false,
          section1Stats: {
            attempts: 0,
            bestAccuracy: null,
            avgStdDev: null,
            completed: false
          },
          section2Stats: {
            attempts: 0,
            bestResonanceStability: null,
            avgResonanceStdDev: null,
            completed: false
          },
          section3Stats: {
            vowelsCompleted: [],
            wordsCompleted: [],
            phrasesCompleted: [],
            currentLevel: 'vowels'
          }
        },
        gamification: {
          level: 1,
          xp: 0,
          totalXp: 0,
          streak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
          streakFreezes: 1,
          achievements: [],
          dailyPracticeMinutes: {}
        },
        history: {
          sessions: [],
          pitchHistory: [],
          resonanceHistory: []
        }
      };
      this.saveData(defaultData);
    }
  }

  getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  updateSettings(newSettings) {
    const data = this.getData();
    data.settings = { ...data.settings, ...newSettings };
    this.saveData(data);
  }

  getSettings() {
    return this.getData().settings;
  }

  updateProgress(section, updates) {
    const data = this.getData();
    if (section === 1) {
      data.progress.section1Stats = { ...data.progress.section1Stats, ...updates };
    } else if (section === 2) {
      data.progress.section2Stats = { ...data.progress.section2Stats, ...updates };
    } else if (section === 3) {
      data.progress.section3Stats = { ...data.progress.section3Stats, ...updates };
    }
    this.saveData(data);
  }

  unlockSection(section) {
    const data = this.getData();
    if (section === 2) {
      data.progress.section2Unlocked = true;
    } else if (section === 3) {
      data.progress.section3Unlocked = true;
    }
    this.saveData(data);
  }

  getProgress() {
    return this.getData().progress;
  }

  addXP(amount) {
    const data = this.getData();
    const streakMultiplier = this.getStreakMultiplier(data.gamification.streak);
    const finalXP = Math.floor(amount * streakMultiplier);

    data.gamification.xp += finalXP;
    data.gamification.totalXp += finalXP;

    // Level up check (100 XP per level)
    const xpPerLevel = 100;
    while (data.gamification.xp >= xpPerLevel) {
      data.gamification.xp -= xpPerLevel;
      data.gamification.level++;
    }

    this.saveData(data);
    return { xpGained: finalXP, newLevel: data.gamification.level };
  }

  getStreakMultiplier(streak) {
    if (streak >= 30) return 3;
    if (streak >= 7) return 2;
    return 1;
  }

  updateStreak() {
    const data = this.getData();
    const today = new Date().toDateString();
    const lastPractice = data.gamification.lastPracticeDate;

    if (!lastPractice) {
      // First practice
      data.gamification.streak = 1;
    } else {
      const lastDate = new Date(lastPractice);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already practiced today
        return;
      } else if (diffDays === 1) {
        // Consecutive day
        data.gamification.streak++;
      } else if (diffDays === 2 && data.gamification.streakFreezes > 0) {
        // Missed one day but have a freeze
        data.gamification.streakFreezes--;
        data.gamification.streak++;
      } else {
        // Streak broken
        data.gamification.streak = 1;
      }
    }

    data.gamification.lastPracticeDate = today;

    if (data.gamification.streak > data.gamification.longestStreak) {
      data.gamification.longestStreak = data.gamification.streak;
    }

    // Weekly streak freeze reward
    if (data.gamification.streak % 7 === 0) {
      data.gamification.streakFreezes++;
    }

    this.saveData(data);
  }

  addDailyPracticeTime(minutes) {
    const data = this.getData();
    const today = new Date().toDateString();

    if (!data.gamification.dailyPracticeMinutes[today]) {
      data.gamification.dailyPracticeMinutes[today] = 0;
    }

    data.gamification.dailyPracticeMinutes[today] += minutes;

    // Update streak if practiced 5+ minutes
    if (data.gamification.dailyPracticeMinutes[today] >= 5) {
      this.updateStreak();
    }

    this.saveData(data);
  }

  unlockAchievement(achievementId) {
    const data = this.getData();
    if (!data.gamification.achievements.includes(achievementId)) {
      data.gamification.achievements.push(achievementId);
      this.saveData(data);
      return true;
    }
    return false;
  }

  getGamification() {
    return this.getData().gamification;
  }

  addSession(sessionData) {
    const data = this.getData();
    data.history.sessions.push({
      timestamp: new Date().toISOString(),
      ...sessionData
    });
    this.saveData(data);
  }

  addPitchHistory(pitchData) {
    const data = this.getData();
    data.history.pitchHistory.push({
      timestamp: new Date().toISOString(),
      ...pitchData
    });
    // Keep only last 100 entries
    if (data.history.pitchHistory.length > 100) {
      data.history.pitchHistory.shift();
    }
    this.saveData(data);
  }

  addResonanceHistory(resonanceData) {
    const data = this.getData();
    data.history.resonanceHistory.push({
      timestamp: new Date().toISOString(),
      ...resonanceData
    });
    // Keep only last 100 entries
    if (data.history.resonanceHistory.length > 100) {
      data.history.resonanceHistory.shift();
    }
    this.saveData(data);
  }

  getHistory() {
    return this.getData().history;
  }

  exportData() {
    return JSON.stringify(this.getData(), null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.saveData(data);
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }

  resetProgress() {
    localStorage.removeItem(this.storageKey);
    this.initializeStorage();
  }
}

// Export for use in other modules
window.Storage = Storage;
