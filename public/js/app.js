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

    // Section 2: Advanced Pitch Practice sentences
    this.sentences = [
      // Tier 1: High Vowel Anchors (Easiest)
      { text: "My dearest friend, say hi to me.", tier: 1 },
      { text: "We need three easy keys, please.", tier: 1 },
      // Tier 2: Transitional Vowel Challenges (Medium)
      { text: "Oh, I know all you told me.", tier: 2 },
      { text: "Love you so much, dear.", tier: 2 },
      // Tier 3: Low Consonant Resistance (Hard)
      { text: "Little lamps light up the room.", tier: 3 },
      { text: "No, my name is Ellie, not him.", tier: 3 }
    ];
    this.currentSentenceIndex = 0;
    this.isTestMode = false;
    this.testSentencesCompleted = [];

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

    if (progress.section4Unlocked) {
      document.getElementById('section4Card').classList.remove('locked');
      document.querySelector('#section4Card .btn').disabled = false;
      document.querySelector('#section4Card .btn').textContent = 'Start Practice';
      document.querySelector('#section4Card .btn').classList.remove('btn-secondary');
      document.querySelector('#section4Card .btn').classList.add('btn-primary');
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
    const progress = this.storage.getProgress();

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

    // Update section progress text
    const section1Prog = document.getElementById('section1Progress');
    if (section1Prog) {
      const consecutive = progress.section1Stats.consecutiveSuccesses;
      if (consecutive > 0) {
        section1Prog.textContent = `Progress: ${consecutive}/3 consecutive successes`;
      } else {
        section1Prog.textContent = 'Get 3 consecutive passes to unlock Section II';
      }
    }

    const section2Prog = document.getElementById('section2Progress');
    if (section2Prog && progress.section2Unlocked) {
      const completed = progress.section2Stats.completedSessions;
      if (completed > 0) {
        section2Prog.textContent = `Progress: ${completed}/3 successful sessions`;
      } else {
        section2Prog.textContent = 'Complete 3 sessions to unlock Section III';
      }
    }

    const section3Prog = document.getElementById('section3Progress');
    if (section3Prog && progress.section3Unlocked) {
      const consecutive = progress.section3Stats.consecutiveSuccesses;
      if (consecutive > 0) {
        section3Prog.textContent = `Progress: ${consecutive}/3 consecutive successes`;
      } else {
        section3Prog.textContent = 'Get 3 consecutive passes to unlock Section IV';
      }
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
    } else if (screen === 'section4') {
      this.renderSection4();
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
    document.getElementById('startPitchPracticeBtn').style.display = 'none';
    document.getElementById('startPitchTestBtn').style.display = 'none';
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
    let sustainStartTime = null;
    let sustainDuration = 0;
    const requiredSustainSeconds = 3; // Must hold for 3 seconds

    // Track actual humming time (not including silence)
    let totalHummingTime = 0;
    const targetHummingSeconds = 30; // Auto-stop after 30s of humming

    // Failure threshold tracking
    let pitchFailureStartTime = null;
    const pitchFailureThreshold = 150; // Hz
    const pitchFailureTimeLimit = 0.5; // seconds
    let exerciseFailed = false;

    // Start recording and analyzing
    let callbackCount = 0;
    let lastLogTime = Date.now();
    let lastCallbackTime = Date.now();

    this.audioManager.startRecording((audioData) => {
      if (exerciseFailed) return; // Stop processing if failed

      callbackCount++;
      const now = Date.now();
      const deltaTime = (now - lastCallbackTime) / 1000; // Time since last callback in seconds
      lastCallbackTime = now;

      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      // Log pitch every 2 seconds for debugging
      if (now - lastLogTime > 2000) {
        console.log('🎵 Current pitch:', pitch ? `${pitch.toFixed(1)} Hz` : 'none', '| Humming time:', totalHummingTime.toFixed(1), 's/', targetHummingSeconds, 's');
        lastLogTime = now;
      }

      if (pitch) {
        // Count this as humming time
        totalHummingTime += deltaTime;

        const avgPitch = this.pitchDetector.getAveragePitch(5);
        const stdDev = this.pitchDetector.getStandardDeviation(10);

        // Update UI
        document.getElementById('currentPitch').textContent = `${avgPitch.toFixed(1)} Hz`;

        const accuracy = Math.abs(avgPitch - targetFreq);
        document.getElementById('pitchStability').textContent = `${stdDev.toFixed(1)} Hz`;

        // Draw pitch meter
        const canvas = document.getElementById('pitchMeterCanvas');
        if (canvas) {
          this.charts.drawPitchMeter(canvas, avgPitch, targetFreq);
        }

        // Check failure threshold: pitch below 150 Hz for > 0.5s
        if (avgPitch < pitchFailureThreshold) {
          if (!pitchFailureStartTime) {
            pitchFailureStartTime = Date.now();
          } else {
            const failureDuration = (Date.now() - pitchFailureStartTime) / 1000;
            if (failureDuration > pitchFailureTimeLimit) {
              exerciseFailed = true;
              console.log('❌ FAILURE: Pitch dropped below 150 Hz for too long');
              this.audioManager.stopRecording();
              document.getElementById('readyLight').classList.remove('active');
              alert('⚠️ Exercise disqualified!\n\nYour pitch dropped below 150 Hz for longer than 0.5 seconds.\n\nThis suggests your voice is slipping toward your old pitch habit. Take a breath and try again!');
              document.getElementById('startPitchPracticeBtn').style.display = 'inline-block';
              document.getElementById('startPitchTestBtn').style.display = 'inline-block';
              return;
            }
          }
        } else {
          pitchFailureStartTime = null; // Reset failure timer
        }

        // Check if currently on target
        const onTarget = this.pitchDetector.isOnTarget(avgPitch, targetFreq, 5);

        // Track sustain time
        if (onTarget) {
          if (!sustainStartTime) {
            sustainStartTime = Date.now();
            console.log('🎯 On target! Starting sustain timer...');
          } else {
            sustainDuration = (Date.now() - sustainStartTime) / 1000;

            // Update sustain display
            const sustainText = `Sustaining: ${sustainDuration.toFixed(1)}s / ${requiredSustainSeconds}s`;
            document.getElementById('pitchAccuracy').textContent = sustainText;

            // Check if we've sustained long enough to start recording
            if (sustainDuration >= requiredSustainSeconds && !sessionStarted) {
              targetHitTime = Date.now() - this.exerciseStartTime;
              sessionStarted = true;
              console.log('✅ Sustained for 3 seconds! Starting session recording.');
            }
          }
        } else {
          // Lost target - reset sustain timer if we haven't started recording yet
          if (!sessionStarted && sustainStartTime) {
            console.log('❌ Lost target. Resetting sustain timer.');
            sustainStartTime = null;
            sustainDuration = 0;
          }
        }

        // Update UI with progress
        if (sessionStarted) {
          const remainingTime = Math.max(0, targetHummingSeconds - totalHummingTime);
          document.getElementById('pitchAccuracy').textContent = `Recording: ${remainingTime.toFixed(1)}s left`;
        }

        // Record data only after sustaining for required time
        if (sessionStarted) {
          this.exerciseData.push({
            timestamp: Date.now() - this.exerciseStartTime,
            pitch: avgPitch,
            stdDev: stdDev
          });
        }

        // Auto-stop after 30 seconds of humming
        if (totalHummingTime >= targetHummingSeconds) {
          console.log('⏱️ Auto-stopping after 30 seconds of humming');
          document.getElementById('readyLight').classList.remove('active');
          this.stopPitchExercise();
        }
      }
    });
  }

  stopPitchExercise() {
    this.audioManager.stopRecording();

    document.getElementById('startPitchPracticeBtn').style.display = 'inline-block';
    document.getElementById('startPitchTestBtn').style.display = 'inline-block';
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

    // Track consecutive successes for unlocking
    const progress = this.storage.getProgress();
    const passedThreshold = avgStdDev < 10;

    if (passedThreshold) {
      // Success! Increment consecutive counter
      const newConsecutive = progress.section1Stats.consecutiveSuccesses + 1;
      this.storage.updateProgress(1, { consecutiveSuccesses: newConsecutive });

      console.log(`✅ Passed! Consecutive successes: ${newConsecutive}/3`);

      // Check if we've hit the required number
      if (newConsecutive >= 3 && !progress.section2Unlocked) {
        this.storage.unlockSection(2);
        alert('🎉 Congratulations! You\'ve passed 3 times in a row!\n\nSection II: Resonance Training is now unlocked!');
        this.loadProgress();
      } else if (newConsecutive < 3) {
        alert(`Great job! 🎯\n\nConsecutive successes: ${newConsecutive}/3\n\nKeep it up - ${3 - newConsecutive} more to unlock Section II!`);
      }
    } else {
      // Failed - reset counter
      if (progress.section1Stats.consecutiveSuccesses > 0) {
        console.log(`❌ Didn't pass (${avgStdDev.toFixed(1)}Hz std dev). Resetting consecutive counter.`);
        this.storage.updateProgress(1, { consecutiveSuccesses: 0 });
        alert(`Keep practicing! 💪\n\nYour pitch stability was ${avgStdDev.toFixed(1)}Hz (need <10Hz).\n\nConsecutive successes reset to 0/3.`);
      }
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

  // Section 1: Practice Mode (no time limit, no failure)
  async startPitchPractice() {
    document.getElementById('startPitchPracticeBtn').style.display = 'none';
    document.getElementById('startPitchTestBtn').style.display = 'none';
    document.getElementById('stopPitchPracticeBtn').style.display = 'inline-block';
    document.getElementById('pitchResultsSection').style.display = 'none';

    const indicator = document.getElementById('pitchModeIndicator');
    indicator.style.display = 'block';
    indicator.textContent = '🎵 PRACTICE MODE - Hum freely, no limits!';
    indicator.style.color = '#00d9ff';

    this.currentExercise = 'pitch-practice';
    this.exerciseStartTime = Date.now();

    const settings = this.storage.getSettings();
    const targetFreq = settings.targetFrequency;

    this.pitchDetector.clearHistory();

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (pitch) {
        const avgPitch = this.pitchDetector.getAveragePitch(5);
        const stdDev = this.pitchDetector.getStandardDeviation(10);

        // Update UI
        document.getElementById('currentPitch').textContent = `${avgPitch.toFixed(1)} Hz`;
        document.getElementById('pitchStability').textContent = `${stdDev.toFixed(1)} Hz`;

        // Color code the status based on pitch
        const statusEl = document.getElementById('pitchAccuracy');
        const accuracy = Math.abs(avgPitch - targetFreq);

        if (avgPitch < 150) {
          statusEl.textContent = '❌ TOO LOW (< 150 Hz)';
          statusEl.style.color = '#ff4757';
        } else if (accuracy <= 5) {
          statusEl.textContent = '✅ ON TARGET';
          statusEl.style.color = '#2ed573';
        } else if (accuracy <= 10) {
          statusEl.textContent = '⚠️ CLOSE';
          statusEl.style.color = '#ffa502';
        } else {
          statusEl.textContent = `Off by ${accuracy.toFixed(1)} Hz`;
          statusEl.style.color = '#ffa502';
        }

        // Draw pitch meter with color coding
        const canvas = document.getElementById('pitchMeterCanvas');
        if (canvas) {
          this.charts.drawPitchMeter(canvas, avgPitch, targetFreq);
        }
      } else {
        document.getElementById('pitchAccuracy').textContent = 'No sound detected';
        document.getElementById('pitchAccuracy').style.color = '#a4b0be';
      }
    });
  }

  stopPitchPractice() {
    this.audioManager.stopRecording();

    document.getElementById('startPitchPracticeBtn').style.display = 'inline-block';
    document.getElementById('startPitchTestBtn').style.display = 'inline-block';
    document.getElementById('stopPitchPracticeBtn').style.display = 'none';
    document.getElementById('pitchModeIndicator').style.display = 'none';

    // Reset displays
    document.getElementById('currentPitch').textContent = '-- Hz';
    document.getElementById('pitchAccuracy').textContent = '--';
    document.getElementById('pitchAccuracy').style.color = '';
    document.getElementById('pitchStability').textContent = '-- Hz';
  }

  // Section 2: Advanced Pitch Practice (Sentences)
  renderSection2() {
    this.currentSentenceIndex = 0;
    this.updateSentenceDisplay();
    this.updateTierIndicator();
    const progress = this.storage.getProgress();
    document.getElementById('sentenceProgress').textContent = `${progress.section2Stats.sentencesCompleted.length}/6`;
  }

  updateTierIndicator() {
    const sentence = this.sentences[this.currentSentenceIndex];
    const indicator = document.getElementById('tierIndicator');

    if (sentence.tier === 1) {
      indicator.innerHTML = `<h3>Tier 1: High Vowel Anchors</h3><p>Easiest - Practice with bright 'ee' and 'ay' sounds</p>`;
    } else if (sentence.tier === 2) {
      indicator.innerHTML = `<h3>Tier 2: Transitional Vowel Challenges</h3><p>Medium - Maintain pitch through 'oh' and 'ah' sounds</p>`;
    } else if (sentence.tier === 3) {
      indicator.innerHTML = `<h3>Tier 3: Low Consonant Resistance</h3><p>Hard - Overcome difficult consonants ('L', 'M', 'N')</p>`;
    }
  }

  updateSentenceDisplay() {
    const sentence = this.sentences[this.currentSentenceIndex];
    document.getElementById('currentSentence').textContent = `"${sentence.text}"`;
    this.updateTierIndicator();
  }

  nextSentence() {
    // First, evaluate the current sentence
    if (this.isTestMode) {
      this.evaluateSentence();
    } else {
      // In practice mode, just move to next sentence
      this.currentSentenceIndex++;
      if (this.currentSentenceIndex >= this.sentences.length) {
        this.currentSentenceIndex = 0;
      }
      this.updateSentenceDisplay();
      document.getElementById('sentenceResultsSection').style.display = 'none';
    }
  }

  async startSentencePractice() {
    document.getElementById('startSentencePracticeBtn').style.display = 'none';
    document.getElementById('startSentenceTestBtn').style.display = 'none';
    document.getElementById('stopSentencePracticeBtn').style.display = 'inline-block';
    document.getElementById('sentenceResultsSection').style.display = 'none';

    const indicator = document.getElementById('sentenceModeIndicator');
    indicator.style.display = 'block';
    indicator.textContent = '🗣️ PRACTICE MODE - Speak freely, get feedback!';
    indicator.style.color = '#00d9ff';

    this.currentExercise = 'sentence-practice';
    this.exerciseStartTime = Date.now();

    const targetFreq = 165; // Hz - the pitch anchor

    this.pitchDetector.clearHistory();

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (pitch) {
        const avgPitch = this.pitchDetector.getAveragePitch(5);
        const stdDev = this.pitchDetector.getStandardDeviation(10);

        // Update UI
        document.getElementById('sentenceCurrentPitch').textContent = `${avgPitch.toFixed(1)} Hz`;
        document.getElementById('sentenceMelodicStability').textContent = `${stdDev.toFixed(1)} Hz`;

        // Color code the status based on pitch and stability
        const statusEl = document.getElementById('sentenceStatus');

        if (avgPitch < 150) {
          statusEl.textContent = '❌ TOO LOW (< 150 Hz)';
          statusEl.style.color = '#ff4757';
        } else if (stdDev > 15) {
          statusEl.textContent = '⚠️ TOO MUCH VARIATION';
          statusEl.style.color = '#ffa502';
        } else if (stdDev < 15 && Math.abs(avgPitch - targetFreq) <= 10) {
          statusEl.textContent = '✅ EXCELLENT!';
          statusEl.style.color = '#2ed573';
        } else {
          statusEl.textContent = 'GOOD - Keep going!';
          statusEl.style.color = '#00d9ff';
        }

        // Draw pitch meter
        const canvas = document.getElementById('sentencePitchMeterCanvas');
        if (canvas) {
          this.charts.drawPitchMeter(canvas, avgPitch, targetFreq);
        }
      } else {
        document.getElementById('sentenceStatus').textContent = 'No sound detected';
        document.getElementById('sentenceStatus').style.color = '#a4b0be';
      }
    });
  }

  stopSentencePractice() {
    this.audioManager.stopRecording();

    document.getElementById('startSentencePracticeBtn').style.display = 'inline-block';
    document.getElementById('startSentenceTestBtn').style.display = 'inline-block';
    document.getElementById('stopSentencePracticeBtn').style.display = 'none';
    document.getElementById('sentenceModeIndicator').style.display = 'none';

    // Reset displays
    document.getElementById('sentenceCurrentPitch').textContent = '-- Hz';
    document.getElementById('sentenceStatus').textContent = 'Ready';
    document.getElementById('sentenceStatus').style.color = '';
    document.getElementById('sentenceMelodicStability').textContent = '-- Hz';
  }

  async startSentenceTest() {
    // This will cycle through all 6 sentences
    this.isTestMode = true;
    this.testSentencesCompleted = [];
    this.currentSentenceIndex = 0;
    this.updateSentenceDisplay();

    document.getElementById('startSentencePracticeBtn').style.display = 'none';
    document.getElementById('startSentenceTestBtn').style.display = 'none';
    document.getElementById('nextSentenceBtn').style.display = 'inline-block';

    const indicator = document.getElementById('sentenceModeIndicator');
    indicator.style.display = 'block';
    indicator.textContent = '🎯 TEST MODE - Read when ready, then click Next';
    indicator.style.color = '#ffa502';

    // Start recording for this sentence
    this.startSentenceRecording();
  }

  startSentenceRecording() {
    this.exerciseStartTime = Date.now();
    this.exerciseData = [];
    this.pitchDetector.clearHistory();

    const targetFreq = 165;

    this.audioManager.startRecording((audioData) => {
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (pitch) {
        const avgPitch = this.pitchDetector.getAveragePitch(5);
        const stdDev = this.pitchDetector.getStandardDeviation(10);

        // Update UI
        document.getElementById('sentenceCurrentPitch').textContent = `${avgPitch.toFixed(1)} Hz`;
        document.getElementById('sentenceMelodicStability').textContent = `${stdDev.toFixed(1)} Hz`;

        // Record data
        this.exerciseData.push({
          timestamp: Date.now() - this.exerciseStartTime,
          pitch: avgPitch,
          stdDev: stdDev
        });

        // Draw pitch meter
        const canvas = document.getElementById('sentencePitchMeterCanvas');
        if (canvas) {
          this.charts.drawPitchMeter(canvas, avgPitch, targetFreq);
        }
      }
    });
  }

  async evaluateSentence() {
    this.audioManager.stopRecording();

    if (this.exerciseData.length === 0) {
      alert('No speech detected. Please try again and make sure to speak the sentence.');
      this.startSentenceRecording();
      return;
    }

    // Calculate melodic stability (std dev across the entire sentence)
    const pitches = this.exerciseData.map(d => d.pitch);
    const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((sum, pitch) => sum + Math.pow(pitch - avgPitch, 2), 0) / pitches.length;
    const melodicStability = Math.sqrt(variance);

    const sentence = this.sentences[this.currentSentenceIndex];
    const passed = melodicStability < 15 && avgPitch >= 150;

    // Show result
    const resultsSection = document.getElementById('sentenceResultsSection');
    const resultsContent = document.getElementById('sentenceResultsContent');
    const resultTitle = document.getElementById('sentenceResultTitle');

    resultTitle.textContent = passed ? '✅ Passed!' : '❌ Try Again';
    resultTitle.style.color = passed ? 'var(--color-success)' : 'var(--color-danger)';

    resultsContent.innerHTML = `
      <div class="live-stats">
        <div class="stat-box">
          <span class="stat-label">Average Pitch</span>
          <span class="stat-value">${avgPitch.toFixed(1)} Hz</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Melodic Stability (σ)</span>
          <span class="stat-value">${melodicStability.toFixed(1)} Hz</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Target</span>
          <span class="stat-value">&lt; 15 Hz</span>
        </div>
      </div>
      <p style="margin-top: 1rem; text-align: center;">
        ${passed ? 'Great job! Your pitch remained stable.' : 'Keep practicing! Try to reduce pitch variation to below 15 Hz.'}
      </p>
    `;

    resultsSection.style.display = 'block';

    if (passed) {
      this.testSentencesCompleted.push(this.currentSentenceIndex);
    }

    // Update progress display
    document.getElementById('sentenceProgress').textContent = `${this.testSentencesCompleted.length}/6`;

    // Move to next sentence
    this.currentSentenceIndex++;

    // Check if all sentences are complete
    if (this.currentSentenceIndex >= this.sentences.length) {
      // Check if we passed all sentences
      if (this.testSentencesCompleted.length === 6) {
        // Session complete!
        const progress = this.storage.getProgress();
        const newSessions = progress.section2Stats.completedSessions + 1;

        this.storage.updateProgress(2, {
          completedSessions: newSessions,
          attempts: progress.section2Stats.attempts + 1
        });

        if (newSessions >= 3 && !progress.section3Unlocked) {
          this.storage.unlockSection(3);
          alert('🎉 Congratulations! You\'ve completed 3 successful sessions!\n\nSection III: Resonance Training is now unlocked!');
          this.loadProgress();
        } else if (newSessions < 3) {
          alert(`🎯 Session Complete!\n\nYou passed all 6 sentences!\n\nCompleted sessions: ${newSessions}/3\n\nComplete ${3 - newSessions} more sessions to unlock Section III!`);
        }
      } else {
        alert(`Test incomplete. You only passed ${this.testSentencesCompleted.length} out of 6 sentences. Try again!`);
      }

      // Reset test mode
      this.isTestMode = false;
      this.currentSentenceIndex = 0;
      this.updateSentenceDisplay();
      document.getElementById('nextSentenceBtn').style.display = 'none';
      document.getElementById('startSentencePracticeBtn').style.display = 'inline-block';
      document.getElementById('startSentenceTestBtn').style.display = 'inline-block';
      document.getElementById('sentenceModeIndicator').style.display = 'none';
      document.getElementById('sentenceResultsSection').style.display = 'none';
    } else {
      // Continue to next sentence
      this.updateSentenceDisplay();
      this.startSentenceRecording();
    }
  }

  // Section 3: Resonance Training
  renderSection3() {
    // Nothing special to render
  }

  async startResonanceExercise() {
    document.getElementById('startResonancePracticeBtn').style.display = 'none';
    document.getElementById('startResonanceTestBtn').style.display = 'none';
    document.getElementById('resonanceResultsSection').style.display = 'none';

    this.currentExercise = 'resonance';
    this.exerciseStartTime = Date.now();
    this.exerciseData = [];

    this.formantAnalyzer.clearHistory();
    this.pitchDetector.clearHistory();

    // Track actual humming time (not including silence)
    let totalHummingTime = 0;
    const targetHummingSeconds = 30; // Auto-stop after 30s of humming
    let lastCallbackTime = Date.now();

    // Failure threshold tracking
    let stabilityFailureStartTime = null;
    const stabilityFailureThreshold = 15; // % (std dev)
    const stabilityFailureTimeLimit = 1; // seconds
    let exerciseFailed = false;

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      if (exerciseFailed) return; // Stop processing if failed

      const now = Date.now();
      const deltaTime = (now - lastCallbackTime) / 1000; // Time since last callback in seconds
      lastCallbackTime = now;

      const formants = this.formantAnalyzer.analyzeFormants(audioData.timeDomainData);
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (formants && pitch) {
        // Count this as humming time
        totalHummingTime += deltaTime;

        const avgFormants = this.formantAnalyzer.getAverageFormants(5);
        const stability = this.formantAnalyzer.getResonanceStability(10);
        const brightness = this.formantAnalyzer.getBrightnessRatio();

        // Update UI
        document.getElementById('f1Display').textContent = `${avgFormants.F1.toFixed(0)} Hz`;
        document.getElementById('f2Display').textContent = `${avgFormants.F2.toFixed(0)} Hz`;
        document.getElementById('brightnessDisplay').textContent = brightness ? brightness.toFixed(2) : '--';
        document.getElementById('resonanceStability').textContent = `${stability.toFixed(1)}% | ${(targetHummingSeconds - totalHummingTime).toFixed(1)}s left`;

        // Check failure threshold: stability > 15% for > 1s
        if (stability > stabilityFailureThreshold) {
          if (!stabilityFailureStartTime) {
            stabilityFailureStartTime = Date.now();
          } else {
            const failureDuration = (Date.now() - stabilityFailureStartTime) / 1000;
            if (failureDuration > stabilityFailureTimeLimit) {
              exerciseFailed = true;
              console.log('❌ FAILURE: Stability spiked above 15% for too long');
              this.audioManager.stopRecording();
              alert('⚠️ Exercise disqualified!\n\nYour resonance stability spiked above 15% for longer than 1 second.\n\nThis indicates the "Silent K" throat posture collapsed. Re-engage the warmth and try again!');
              document.getElementById('startResonancePracticeBtn').style.display = 'inline-block';
              document.getElementById('startResonanceTestBtn').style.display = 'inline-block';
              return;
            }
          }
        } else {
          stabilityFailureStartTime = null; // Reset failure timer
        }

        // Record data
        this.exerciseData.push({
          timestamp: Date.now() - this.exerciseStartTime,
          formants: avgFormants,
          stability: stability,
          brightness: brightness,
          pitch: pitch
        });

        // Auto-stop after 30 seconds of humming
        if (totalHummingTime >= targetHummingSeconds) {
          console.log('⏱️ Auto-stopping after 30 seconds of humming');
          this.stopResonanceExercise();
        }
      }
    });
  }

  stopResonanceExercise() {
    this.audioManager.stopRecording();

    document.getElementById('startResonancePracticeBtn').style.display = 'inline-block';
    document.getElementById('startResonanceTestBtn').style.display = 'inline-block';

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
    this.storage.updateProgress(3, {
      attempts: this.storage.getProgress().section3Stats.attempts + 1,
      bestResonanceStability: Math.min(this.storage.getProgress().section3Stats.bestResonanceStability || 999, avgStability),
      avgResonanceStdDev: avgStability
    });

    this.storage.addResonanceHistory({
      stability: avgStability,
      score: score
    });

    // Award XP
    const xpResult = this.gamification.awardXP(3, score);

    // Check achievements
    const achievements = [];

    if (avgStability < 10 && !this.storage.getProgress().section3Stats.completed) {
      const ach = this.gamification.checkAchievement('resonanceMaster');
      if (ach) achievements.push(ach);
      this.storage.updateProgress(3, { completed: true });
    }

    // Track consecutive successes for unlocking Section 4
    const progress = this.storage.getProgress();
    const passedThreshold = avgStability < 10;

    if (passedThreshold) {
      // Success! Increment consecutive counter
      const newConsecutive = progress.section3Stats.consecutiveSuccesses + 1;
      this.storage.updateProgress(3, { consecutiveSuccesses: newConsecutive });

      console.log(`✅ Passed! Consecutive successes: ${newConsecutive}/3`);

      // Check if we've hit the required number
      if (newConsecutive >= 3 && !progress.section4Unlocked) {
        this.storage.unlockSection(4);
        alert('🎉 Congratulations! You\'ve passed 3 times in a row!\n\nSection IV: Word Practice is now unlocked!');
        this.loadProgress();
      } else if (newConsecutive < 3) {
        alert(`Excellent! 🔮\n\nConsecutive successes: ${newConsecutive}/3\n\nKeep going - ${3 - newConsecutive} more to unlock Section IV!`);
      }
    } else {
      // Failed - reset counter
      if (progress.section3Stats.consecutiveSuccesses > 0) {
        console.log(`❌ Didn't pass (${avgStability.toFixed(1)}% stability). Resetting consecutive counter.`);
        this.storage.updateProgress(3, { consecutiveSuccesses: 0 });
        alert(`Keep practicing! 💪\n\nYour resonance stability was ${avgStability.toFixed(1)}% (need <10%).\n\nConsecutive successes reset to 0/3.`);
      }
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

  // Section 2: Practice Mode (no time limit, no failure)
  async startResonancePractice() {
    document.getElementById('startResonancePracticeBtn').style.display = 'none';
    document.getElementById('startResonanceTestBtn').style.display = 'none';
    document.getElementById('stopResonancePracticeBtn').style.display = 'inline-block';
    document.getElementById('resonanceResultsSection').style.display = 'none';

    const indicator = document.getElementById('resonanceModeIndicator');
    indicator.style.display = 'block';
    indicator.textContent = '🔮 PRACTICE MODE - Engage the Silent K posture!';
    indicator.style.color = '#00d9ff';

    this.currentExercise = 'resonance-practice';
    this.exerciseStartTime = Date.now();

    this.formantAnalyzer.clearHistory();
    this.pitchDetector.clearHistory();

    // Start recording and analyzing
    this.audioManager.startRecording((audioData) => {
      const formants = this.formantAnalyzer.analyzeFormants(audioData.timeDomainData);
      const pitch = this.pitchDetector.detectPitch(audioData.timeDomainData);

      if (formants && pitch) {
        const avgFormants = this.formantAnalyzer.getAverageFormants(5);
        const stability = this.formantAnalyzer.getResonanceStability(10);
        const brightness = this.formantAnalyzer.getBrightnessRatio();

        // Update UI
        document.getElementById('f1Display').textContent = `${avgFormants.F1.toFixed(0)} Hz`;
        document.getElementById('f2Display').textContent = `${avgFormants.F2.toFixed(0)} Hz`;
        document.getElementById('brightnessDisplay').textContent = brightness ? brightness.toFixed(2) : '--';

        // Color code the stability based on thresholds
        const stabilityEl = document.getElementById('resonanceStability');

        if (stability > 15) {
          stabilityEl.textContent = `${stability.toFixed(1)}% ❌ TOO HIGH`;
          stabilityEl.style.color = '#ff4757';
        } else if (stability < 10) {
          stabilityEl.textContent = `${stability.toFixed(1)}% ✅ EXCELLENT`;
          stabilityEl.style.color = '#2ed573';
        } else {
          stabilityEl.textContent = `${stability.toFixed(1)}% ⚠️ CLOSE`;
          stabilityEl.style.color = '#ffa502';
        }
      } else {
        document.getElementById('resonanceStability').textContent = 'No sound detected';
        document.getElementById('resonanceStability').style.color = '#a4b0be';
      }
    });
  }

  stopResonancePractice() {
    this.audioManager.stopRecording();

    document.getElementById('startResonancePracticeBtn').style.display = 'inline-block';
    document.getElementById('startResonanceTestBtn').style.display = 'inline-block';
    document.getElementById('stopResonancePracticeBtn').style.display = 'none';
    document.getElementById('resonanceModeIndicator').style.display = 'none';

    // Reset displays
    document.getElementById('f1Display').textContent = '-- Hz';
    document.getElementById('f2Display').textContent = '-- Hz';
    document.getElementById('brightnessDisplay').textContent = '--';
    document.getElementById('resonanceStability').textContent = '-- %';
    document.getElementById('resonanceStability').style.color = '';
  }

  // Section 4: Word Practice
  renderSection4() {
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
    const progress = this.storage.getProgress().section4Stats;
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
      const progress = this.storage.getProgress().section4Stats;
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

      this.storage.updateProgress(4, progress);
      this.renderCompletedWords();
    }

    // Award XP
    const xpResult = this.gamification.awardXP(4, score);

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
      { label: 'Section II Sessions', value: progress.section2Stats.completedSessions },
      { label: 'Section III Attempts', value: progress.section3Stats.attempts },
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
