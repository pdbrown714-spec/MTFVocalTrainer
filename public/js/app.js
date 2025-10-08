/**
 * Main Application Controller
 */
class VoiceTrainerApp {
  constructor() {
    this.storage = new Storage();
    this.gamification = new Gamification(this.storage);
    this.audioManager = new AudioManager();
    this.pitchDetector = null;
    this.formantAnalyzer = null;
    this.charts = new Charts();

    // Exercise state
    this.currentExercise = null;
    this.exerciseStartTime = null;
    this.exerciseData = [];

    // Word practice
    this.vowels = ['A', 'E', 'I', 'O', 'U'];
    this.words = ['hello', 'water', 'sister', 'mother', 'beautiful', 'amazing', 'wonderful', 'together', 'forever', 'sunshine'];
    this.phrases = ['how are you', 'nice to meet you', 'have a nice day', 'see you later', 'good morning'];
    this.currentWordList = [];
    this.currentWordIndex = 0;
    this.completedWords = [];

    this.init();
  }

  async init() {
    console.log('Initializing Voice Trainer App...');

    // Initialize audio
    try {
      await this.audioManager.initialize();
      this.pitchDetector = new PitchDetector(this.audioManager.getSampleRate());
      this.formantAnalyzer = new FormantAnalyzer(this.audioManager.getSampleRate());
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      alert('Microphone access is required for this app to work. Please allow microphone access and refresh the page.');
      return;
    }

    // Load progress and update UI
    this.loadProgress();
    this.updateNavStats();
    this.renderHome();

    // Check for daily login
    this.gamification.checkStreakAchievements();
  }

  loadProgress() {
    const progress = this.storage.getProgress();
    const settings = this.storage.getSettings();

    // Update section cards
    if (progress.section2Unlocked) {
      document.getElementById('section2Card').classList.remove('locked');
      document.querySelector('#section2Card .btn').disabled = false;
      document.querySelector('#section2Card .btn').textContent = 'Start Practice';
      document.querySelector('#section2Card .btn').classList.remove('btn-secondary');
      document.querySelector('#section2Card .btn').classList.add('btn-primary');
    }

    if (progress.section3Unlocked) {
      document.getElementById('section3Card').classList.remove('locked');
      document.querySelector('#section3Card .btn').disabled = false;
      document.querySelector('#section3Card .btn').textContent = 'Start Practice';
      document.querySelector('#section3Card .btn').classList.remove('btn-secondary');
      document.querySelector('#section3Card .btn').classList.add('btn-primary');
    }

    // Load settings
    document.getElementById('noteSelect').value = settings.targetNote;
    document.getElementById('darkModeToggle').checked = settings.darkMode;
    document.getElementById('notificationsToggle').checked = settings.notificationsEnabled;
  }

  updateNavStats() {
    const gamification = this.storage.getGamification();
    document.getElementById('navLevel').textContent = gamification.level;
    document.getElementById('navStreak').textContent = `${gamification.streak}🔥`;
  }

  renderHome() {
    const gamification = this.storage.getGamification();

    // Draw XP progress
    const xpCanvas = document.getElementById('xpProgressCanvas');
    if (xpCanvas) {
      const progressInfo = this.gamification.getProgressToNextLevel();
      this.charts.drawProgressBar(xpCanvas, progressInfo.currentXP, progressInfo.xpNeeded, `Level ${gamification.level}`);
    }

    // Draw streak calendar
    const streakCanvas = document.getElementById('streakCalendarCanvas');
    if (streakCanvas) {
      this.charts.drawStreakCalendar(streakCanvas, gamification.dailyPracticeMinutes, gamification.streak);
    }
  }

  navigateTo(screen) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target screen
    document.getElementById(`${screen}Screen`).classList.add('active');

    // Render screen-specific content
    if (screen === 'home') {
      this.renderHome();
    } else if (screen === 'achievements') {
      this.renderAchievements();
    } else if (screen === 'progress') {
      this.renderProgress();
    } else if (screen === 'section1') {
      this.renderSection1();
    } else if (screen === 'section2') {
      this.renderSection2();
    } else if (screen === 'section3') {
      this.renderSection3();
    }

    // Resume audio context if needed
    this.audioManager.resume();
  }

  // Section 1: Pitch Practice
  renderSection1() {
    const settings = this.storage.getSettings();
    document.getElementById('targetNoteDisplay').textContent = `${settings.targetNote} (${settings.targetFrequency.toFixed(2)} Hz)`;
  }

  async startPitchExercise() {
    document.getElementById('startPitchBtn').style.display = 'none';
    document.getElementById('stopPitchBtn').style.display = 'inline-block';
    document.getElementById('pitchResultsSection').style.display = 'none';

    this.currentExercise = 'pitch';
    this.exerciseStartTime = Date.now();
    this.exerciseData = [];

    const settings = this.storage.getSettings();
    const targetFreq = settings.targetFrequency;

    this.pitchDetector.clearHistory();

    // Show ready light after 2 seconds
    setTimeout(() => {
      document.getElementById('readyLight').classList.add('active');
    }, 2000);

    let targetHitTime = null;
    let sessionStarted = false;

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (pitch) {
        const avgPitch = this.pitchDetector.getAveragePitch(5);
        const stdDev = this.pitchDetector.getStandardDeviation(10);

        // Update UI
        document.getElementById('currentPitch').textContent = `${avgPitch.toFixed(1)} Hz`;

        const accuracy = Math.abs(avgPitch - targetFreq);
        document.getElementById('pitchAccuracy').textContent = `${accuracy.toFixed(1)} Hz`;
        document.getElementById('pitchStability').textContent = `${stdDev.toFixed(1)} Hz`;

        // Draw pitch meter
        const canvas = document.getElementById('pitchMeterCanvas');
        if (canvas) {
          this.charts.drawPitchMeter(canvas, avgPitch, targetFreq);
        }

        // Track when target was first hit
        if (!targetHitTime && this.pitchDetector.isOnTarget(avgPitch, targetFreq, 5)) {
          targetHitTime = Date.now() - this.exerciseStartTime;
          sessionStarted = true;
        }

        // Record data
        if (sessionStarted) {
          this.exerciseData.push({
            timestamp: Date.now() - this.exerciseStartTime,
            pitch: avgPitch,
            stdDev: stdDev
          });
        }
      }
    });
  }

  stopPitchExercise() {
    this.audioManager.stopRecording();

    document.getElementById('startPitchBtn').style.display = 'inline-block';
    document.getElementById('stopPitchBtn').style.display = 'none';
    document.getElementById('readyLight').classList.remove('active');

    if (this.exerciseData.length === 0) {
      alert('No data recorded. Please try again and make sure to hum at your target pitch.');
      return;
    }

    // Calculate results
    const settings = this.storage.getSettings();
    const targetFreq = settings.targetFrequency;

    const pitches = this.exerciseData.map(d => d.pitch);
    const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;

    const stdDevs = this.exerciseData.map(d => d.stdDev);
    const avgStdDev = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length;

    const duration = (Date.now() - this.exerciseStartTime) / 1000; // seconds
    const timeToHit = this.exerciseData[0].timestamp / 1000;

    // Calculate score
    const score = this.gamification.calculatePitchScore(targetFreq, avgPitch, timeToHit, duration, avgStdDev);

    document.getElementById('pitchScore').textContent = score;

    // Save progress
    this.storage.updateProgress(1, {
      attempts: this.storage.getProgress().section1Stats.attempts + 1,
      bestAccuracy: Math.min(this.storage.getProgress().section1Stats.bestAccuracy || 999, Math.abs(avgPitch - targetFreq)),
      avgStdDev: avgStdDev
    });

    this.storage.addPitchHistory({
      avgPitch: avgPitch,
      stdDev: avgStdDev,
      score: score
    });

    // Award XP
    const xpResult = this.gamification.awardXP(1, score);

    // Check achievements
    const achievements = [];

    if (this.storage.getProgress().section1Stats.attempts === 1) {
      const ach = this.gamification.checkAchievement('firstSteps');
      if (ach) achievements.push(ach);
    }

    if (Math.abs(avgPitch - targetFreq) <= 1) {
      const ach = this.gamification.checkAchievement('pitchPerfect');
      if (ach) achievements.push(ach);
    }

    if (duration >= 30 && avgStdDev < 5) {
      const ach = this.gamification.checkAchievement('rockSolid');
      if (ach) achievements.push(ach);
    }

    if (timeToHit < 1) {
      const ach = this.gamification.checkAchievement('speedster');
      if (ach) achievements.push(ach);
    }

    // Check if Section 2 should be unlocked
    if (!this.storage.getProgress().section2Unlocked && avgStdDev < 10) {
      this.storage.unlockSection(2);
      alert('🎉 Congratulations! You\'ve unlocked Section II: Resonance Training!');
      this.loadProgress();
    }

    // Show achievements
    achievements.forEach(ach => this.showAchievementNotification(ach));

    // Update nav
    this.updateNavStats();

    // Add practice time
    this.storage.addDailyPracticeTime(duration / 60);

    // Show results
    const resultsSection = document.getElementById('pitchResultsSection');
    const resultsContent = document.getElementById('pitchResultsContent');

    resultsContent.innerHTML = `
      <div class="live-stats">
        <div class="stat-box">
          <span class="stat-label">Average Pitch</span>
          <span class="stat-value">${avgPitch.toFixed(1)} Hz</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Target</span>
          <span class="stat-value">${targetFreq.toFixed(1)} Hz</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Stability (σ)</span>
          <span class="stat-value">${avgStdDev.toFixed(1)} Hz</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Duration</span>
          <span class="stat-value">${duration.toFixed(1)}s</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Score</span>
          <span class="stat-value highlight-primary">${score}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">XP Gained</span>
          <span class="stat-value highlight-success">+${xpResult.xpGained}</span>
        </div>
      </div>
    `;

    resultsSection.style.display = 'block';
  }

  // Section 2: Resonance Training
  renderSection2() {
    // Nothing special to render
  }

  async startResonanceExercise() {
    document.getElementById('startResonanceBtn').style.display = 'none';
    document.getElementById('stopResonanceBtn').style.display = 'inline-block';
    document.getElementById('resonanceResultsSection').style.display = 'none';

    this.currentExercise = 'resonance';
    this.exerciseStartTime = Date.now();
    this.exerciseData = [];

    this.formantAnalyzer.clearHistory();
    this.pitchDetector.clearHistory();

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      const formants = this.formantAnalyzer.analyzeFormants(audioData.timeDomainData);
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (formants) {
        const avgFormants = this.formantAnalyzer.getAverageFormants(5);
        const stability = this.formantAnalyzer.getResonanceStability(10);
        const brightness = this.formantAnalyzer.getBrightnessRatio();

        // Update UI
        document.getElementById('f1Display').textContent = `${avgFormants.F1.toFixed(0)} Hz`;
        document.getElementById('f2Display').textContent = `${avgFormants.F2.toFixed(0)} Hz`;
        document.getElementById('brightnessDisplay').textContent = brightness ? brightness.toFixed(2) : '--';
        document.getElementById('resonanceStability').textContent = `${stability.toFixed(1)}%`;

        // Record data
        this.exerciseData.push({
          timestamp: Date.now() - this.exerciseStartTime,
          formants: avgFormants,
          stability: stability,
          brightness: brightness,
          pitch: pitch
        });
      }
    });
  }

  stopResonanceExercise() {
    this.audioManager.stopRecording();

    document.getElementById('startResonanceBtn').style.display = 'inline-block';
    document.getElementById('stopResonanceBtn').style.display = 'none';

    if (this.exerciseData.length === 0) {
      alert('No data recorded. Please try again.');
      return;
    }

    // Calculate results
    const stabilities = this.exerciseData.map(d => d.stability);
    const avgStability = stabilities.reduce((a, b) => a + b, 0) / stabilities.length;

    const duration = (Date.now() - this.exerciseStartTime) / 1000;

    const score = this.gamification.calculateResonanceScore(avgStability);

    // Save progress
    this.storage.updateProgress(2, {
      attempts: this.storage.getProgress().section2Stats.attempts + 1,
      bestResonanceStability: Math.min(this.storage.getProgress().section2Stats.bestResonanceStability || 999, avgStability),
      avgResonanceStdDev: avgStability
    });

    this.storage.addResonanceHistory({
      stability: avgStability,
      score: score
    });

    // Award XP
    const xpResult = this.gamification.awardXP(2, score);

    // Check achievements
    const achievements = [];

    if (avgStability < 10 && !this.storage.getProgress().section2Stats.completed) {
      const ach = this.gamification.checkAchievement('resonanceMaster');
      if (ach) achievements.push(ach);
      this.storage.updateProgress(2, { completed: true });
    }

    // Check if Section 3 should be unlocked
    if (!this.storage.getProgress().section3Unlocked && avgStability < 10) {
      this.storage.unlockSection(3);
      alert('🎉 Congratulations! You\'ve unlocked Section III: Word Practice!');
      this.loadProgress();
    }

    // Show achievements
    achievements.forEach(ach => this.showAchievementNotification(ach));

    // Update nav
    this.updateNavStats();

    // Add practice time
    this.storage.addDailyPracticeTime(duration / 60);

    // Show results
    const resultsSection = document.getElementById('resonanceResultsSection');
    const resultsContent = document.getElementById('resonanceResultsContent');

    resultsContent.innerHTML = `
      <div class="live-stats">
        <div class="stat-box">
          <span class="stat-label">Avg Stability</span>
          <span class="stat-value">${avgStability.toFixed(1)}%</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Duration</span>
          <span class="stat-value">${duration.toFixed(1)}s</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Score</span>
          <span class="stat-value highlight-primary">${score}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">XP Gained</span>
          <span class="stat-value highlight-success">+${xpResult.xpGained}</span>
        </div>
      </div>
    `;

    resultsSection.style.display = 'block';
  }

  // Section 3: Word Practice
  renderSection3() {
    this.selectWordLevel('vowels');
  }

  selectWordLevel(level) {
    // Update active button
    document.querySelectorAll('.level-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.level-btn[data-level="${level}"]`).classList.add('active');

    // Set word list
    if (level === 'vowels') {
      this.currentWordList = this.vowels;
    } else if (level === 'words') {
      this.currentWordList = this.words;
    } else if (level === 'phrases') {
      this.currentWordList = this.phrases;
    }

    // Load completed words for this level
    const progress = this.storage.getProgress().section3Stats;
    if (level === 'vowels') {
      this.completedWords = progress.vowelsCompleted || [];
    } else if (level === 'words') {
      this.completedWords = progress.wordsCompleted || [];
    } else if (level === 'phrases') {
      this.completedWords = progress.phrasesCompleted || [];
    }

    // Set current word
    this.currentWordIndex = 0;
    this.showNextWord();

    // Render completed words
    this.renderCompletedWords();
  }

  showNextWord() {
    if (this.currentWordIndex >= this.currentWordList.length) {
      alert('🎉 You\'ve completed all items in this level!');
      return;
    }

    const word = this.currentWordList[this.currentWordIndex];
    document.getElementById('currentWord').textContent = word;
  }

  nextWord() {
    this.currentWordIndex++;
    this.showNextWord();
    document.getElementById('wordResultsSection').style.display = 'none';
  }

  renderCompletedWords() {
    const container = document.getElementById('completedWords');
    container.innerHTML = '';

    this.completedWords.forEach(word => {
      const chip = document.createElement('span');
      chip.className = 'word-chip';
      chip.textContent = word;
      container.appendChild(chip);
    });
  }

  async startWordExercise() {
    document.getElementById('startWordBtn').style.display = 'none';
    document.getElementById('stopWordBtn').style.display = 'inline-block';
    document.getElementById('wordResultsSection').style.display = 'none';

    this.currentExercise = 'word';
    this.exerciseStartTime = Date.now();
    this.exerciseData = [];

    this.formantAnalyzer.clearHistory();
    this.pitchDetector.clearHistory();

    const settings = this.storage.getSettings();

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      const formants = this.formantAnalyzer.analyzeFormants(audioData.timeDomainData);
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (formants && pitch) {
        const pitchStdDev = this.pitchDetector.getStandardDeviation(10);
        const resonanceStability = this.formantAnalyzer.getResonanceStability(10);

        // Update UI
        document.getElementById('wordPitchStability').textContent = `${pitchStdDev.toFixed(1)} Hz`;
        document.getElementById('wordResonanceStability').textContent = `${resonanceStability.toFixed(1)}%`;

        // Record data
        this.exerciseData.push({
          timestamp: Date.now() - this.exerciseStartTime,
          pitch: pitch,
          pitchStdDev: pitchStdDev,
          formants: formants,
          resonanceStability: resonanceStability
        });
      }
    });
  }

  stopWordExercise() {
    this.audioManager.stopRecording();

    document.getElementById('startWordBtn').style.display = 'inline-block';
    document.getElementById('stopWordBtn').style.display = 'none';

    if (this.exerciseData.length === 0) {
      alert('No data recorded. Please try again.');
      return;
    }

    // Calculate results
    const pitchStdDevs = this.exerciseData.map(d => d.pitchStdDev);
    const avgPitchStdDev = pitchStdDevs.reduce((a, b) => a + b, 0) / pitchStdDevs.length;

    const resonanceStabilities = this.exerciseData.map(d => d.resonanceStability);
    const avgResonanceStability = resonanceStabilities.reduce((a, b) => a + b, 0) / resonanceStabilities.length;

    const duration = (Date.now() - this.exerciseStartTime) / 1000;

    const score = this.gamification.calculateWordScore(avgPitchStdDev, avgResonanceStability);

    // Check if passed
    const passed = avgPitchStdDev < 10 && avgResonanceStability < 10;

    const currentWord = this.currentWordList[this.currentWordIndex];

    if (passed && !this.completedWords.includes(currentWord)) {
      this.completedWords.push(currentWord);

      // Save progress
      const progress = this.storage.getProgress().section3Stats;
      const level = document.querySelector('.level-btn.active').dataset.level;

      if (level === 'vowels') {
        progress.vowelsCompleted = this.completedWords;

        if (this.completedWords.length === this.vowels.length) {
          const ach = this.gamification.checkAchievement('vowelVirtuoso');
          if (ach) this.showAchievementNotification(ach);
        }
      } else if (level === 'words') {
        progress.wordsCompleted = this.completedWords;

        if (this.completedWords.length >= 50) {
          const ach = this.gamification.checkAchievement('wordWizard');
          if (ach) this.showAchievementNotification(ach);
        }
      } else if (level === 'phrases') {
        progress.phrasesCompleted = this.completedWords;

        if (this.completedWords.length >= 25) {
          const ach = this.gamification.checkAchievement('phrasePhenom');
          if (ach) this.showAchievementNotification(ach);
        }
      }

      this.storage.updateProgress(3, progress);
      this.renderCompletedWords();
    }

    // Award XP
    const xpResult = this.gamification.awardXP(3, score);

    // Update nav
    this.updateNavStats();

    // Add practice time
    this.storage.addDailyPracticeTime(duration / 60);

    // Show results
    const resultsSection = document.getElementById('wordResultsSection');
    const resultsContent = document.getElementById('wordResultsContent');
    const resultTitle = document.getElementById('wordResultTitle');

    resultTitle.textContent = passed ? '✅ Passed!' : '❌ Try Again';
    resultTitle.style.color = passed ? 'var(--color-success)' : 'var(--color-danger)';

    resultsContent.innerHTML = `
      <div class="live-stats">
        <div class="stat-box">
          <span class="stat-label">Pitch Stability</span>
          <span class="stat-value">${avgPitchStdDev.toFixed(1)} Hz</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Resonance Stability</span>
          <span class="stat-value">${avgResonanceStability.toFixed(1)}%</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Score</span>
          <span class="stat-value highlight-primary">${score}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">XP Gained</span>
          <span class="stat-value highlight-success">+${xpResult.xpGained}</span>
        </div>
      </div>
      <p style="margin-top: 1rem; text-align: center;">
        ${passed ? 'Great job! Your pitch and resonance were stable.' : 'Keep practicing! Aim for <10Hz pitch std dev and <10% resonance stability.'}
      </p>
    `;

    resultsSection.style.display = 'block';
  }

  // Achievements
  renderAchievements() {
    const container = document.getElementById('achievementsList');
    container.innerHTML = '';

    const allAchievements = this.gamification.getAllAchievements();
    const unlockedAchievements = this.gamification.getUnlockedAchievements();
    const unlockedIds = unlockedAchievements.map(a => a.id);

    allAchievements.forEach(achievement => {
      const isUnlocked = unlockedIds.includes(achievement.id);

      const card = document.createElement('div');
      card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <h4>${achievement.name}</h4>
        <p>${achievement.description}</p>
        <div class="xp-reward">+${achievement.xpReward} XP</div>
      `;

      container.appendChild(card);
    });
  }

  showAchievementNotification(achievement) {
    const notification = document.getElementById('achievementNotification');
    document.getElementById('achievementIcon').textContent = achievement.icon;
    document.getElementById('achievementTitle').textContent = achievement.name;
    document.getElementById('achievementDescription').textContent = achievement.description;

    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }

  // Progress
  renderProgress() {
    const history = this.storage.getHistory();

    // Pitch history chart
    const pitchCanvas = document.getElementById('pitchHistoryCanvas');
    if (pitchCanvas && history.pitchHistory.length > 0) {
      const data = history.pitchHistory.map((h, i) => ({
        label: i.toString(),
        value: h.avgPitch
      }));
      const settings = this.storage.getSettings();
      this.charts.drawLineChart(pitchCanvas, data, 'Pitch Over Time', settings.targetFrequency);
    }

    // Resonance history chart
    const resonanceCanvas = document.getElementById('resonanceHistoryCanvas');
    if (resonanceCanvas && history.resonanceHistory.length > 0) {
      const data = history.resonanceHistory.map((h, i) => ({
        label: i.toString(),
        value: h.stability
      }));
      this.charts.drawLineChart(resonanceCanvas, data, 'Resonance Stability Over Time', 10);
    }

    // Statistics
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = '';

    const progress = this.storage.getProgress();
    const gamification = this.storage.getGamification();

    const stats = [
      { label: 'Total Sessions', value: history.sessions.length },
      { label: 'Section I Attempts', value: progress.section1Stats.attempts },
      { label: 'Section II Attempts', value: progress.section2Stats.attempts },
      { label: 'Achievements Unlocked', value: gamification.achievements.length },
      { label: 'Total XP', value: gamification.totalXp },
      { label: 'Longest Streak', value: `${gamification.longestStreak} days` }
    ];

    stats.forEach(stat => {
      const box = document.createElement('div');
      box.className = 'stat-box';
      box.innerHTML = `
        <span class="stat-label">${stat.label}</span>
        <span class="stat-value">${stat.value}</span>
      `;
      statsGrid.appendChild(box);
    });
  }

  // Settings
  updateTargetNote() {
    const noteSelect = document.getElementById('noteSelect');
    const note = noteSelect.value;

    const pitchDetector = new PitchDetector();
    const noteMap = {
      'C3': ['C', 3], 'C#3': ['C#', 3], 'D3': ['D', 3], 'D#3': ['D#', 3],
      'E3': ['E', 3], 'F3': ['F', 3], 'F#3': ['F#', 3], 'G3': ['G', 3],
      'G#3': ['G#', 3], 'A3': ['A', 3], 'A#3': ['A#', 3], 'B3': ['B', 3],
      'C4': ['C', 4]
    };

    const [noteName, octave] = noteMap[note];
    const frequency = pitchDetector.noteToFrequency(noteName, octave);

    this.storage.updateSettings({
      targetNote: note,
      targetFrequency: frequency
    });

    alert(`Target note updated to ${note} (${frequency.toFixed(2)} Hz)`);
  }

  toggleDarkMode() {
    const enabled = document.getElementById('darkModeToggle').checked;
    this.storage.updateSettings({ darkMode: enabled });
    // In a real implementation, you'd toggle CSS classes here
  }

  toggleNotifications() {
    const enabled = document.getElementById('notificationsToggle').checked;
    this.storage.updateSettings({ notificationsEnabled: enabled });
  }

  exportData() {
    const data = this.storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voice-trainer-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = this.storage.importData(event.target.result);
        if (success) {
          alert('Data imported successfully!');
          this.loadProgress();
          this.updateNavStats();
        } else {
          alert('Failed to import data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  resetProgress() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      this.storage.resetProgress();
      alert('Progress reset successfully.');
      location.reload();
    }
  }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new VoiceTrainerApp();
});
