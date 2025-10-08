/**
 * Pitch detection using autocorrelation algorithm
 * Note: This will use the pitchfinder library when loaded
 */
class PitchDetector {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.detector = null;
    this.pitchHistory = [];
    this.maxHistorySize = 50;
  }

  initialize() {
    // Check if Pitchfinder is loaded
    if (typeof Pitchfinder !== 'undefined') {
      try {
        // Use YIN algorithm for better accuracy
        this.detector = Pitchfinder.YIN({ sampleRate: this.sampleRate });
        console.log('✅ Pitchfinder YIN algorithm loaded');
      } catch (e) {
        console.warn('Pitchfinder failed to initialize, using fallback:', e);
        this.detector = this.autocorrelate.bind(this);
      }
    } else {
      console.warn('Pitchfinder library not loaded, using fallback autocorrelation');
      this.detector = this.autocorrelate.bind(this);
    }
  }

  detectPitch(buffer) {
    if (!this.detector) {
      this.initialize();
    }

    let frequency = null;

    try {
      if (typeof this.detector === 'function') {
        frequency = this.detector(buffer);
      }
    } catch (e) {
      console.error('Pitch detection error:', e);
      return null;
    }

    // Filter out unrealistic frequencies (human voice range ~80-1000Hz)
    if (frequency && frequency > 60 && frequency < 1200) {
      this.pitchHistory.push(frequency);
      if (this.pitchHistory.length > this.maxHistorySize) {
        this.pitchHistory.shift();
      }
      return frequency;
    }

    return null;
  }

  getAveragePitch(samples = 10) {
    if (this.pitchHistory.length === 0) return null;

    const recentPitches = this.pitchHistory.slice(-samples);
    const sum = recentPitches.reduce((a, b) => a + b, 0);
    return sum / recentPitches.length;
  }

  getStandardDeviation(samples = 10) {
    if (this.pitchHistory.length < 2) return 0;

    const recentPitches = this.pitchHistory.slice(-samples);
    const avg = recentPitches.reduce((a, b) => a + b, 0) / recentPitches.length;

    const squareDiffs = recentPitches.map(pitch => Math.pow(pitch - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;

    return Math.sqrt(avgSquareDiff);
  }

  clearHistory() {
    this.pitchHistory = [];
  }

  // Improved autocorrelation algorithm
  autocorrelate(buffer) {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let best_offset = -1;
    let best_correlation = 0;
    let rms = 0;

    // Calculate RMS (root mean square) to detect if there's enough signal
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // Not enough signal (lowered threshold for better sensitivity)
    if (rms < 0.005) return null;

    // Autocorrelation
    const correlations = new Array(MAX_SAMPLES);
    for (let lag = 0; lag < MAX_SAMPLES; lag++) {
      let sum = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = sum;
    }

    // Normalize correlations
    const normalizedCorr = correlations.map(c => c / correlations[0]);

    // Find the first peak after lag of at least 20 (to avoid octave errors)
    // For human voice (80-1000Hz), this corresponds to reasonable pitch range
    const minLag = Math.floor(this.sampleRate / 1000); // 1000Hz max
    const maxLag = Math.floor(this.sampleRate / 80);   // 80Hz min

    for (let lag = minLag; lag < maxLag && lag < MAX_SAMPLES; lag++) {
      // Look for positive peak
      if (normalizedCorr[lag] > 0.5 && normalizedCorr[lag] > best_correlation) {
        // Check if it's actually a peak
        const isPeak = normalizedCorr[lag] > normalizedCorr[lag - 1] &&
                      normalizedCorr[lag] > normalizedCorr[lag + 1];
        if (isPeak) {
          best_correlation = normalizedCorr[lag];
          best_offset = lag;
        }
      }
    }

    if (best_offset === -1 || best_correlation < 0.5) return null;

    // Parabolic interpolation for more accurate frequency
    let delta = 0;
    if (best_offset > 0 && best_offset < MAX_SAMPLES - 1) {
      const alpha = normalizedCorr[best_offset - 1];
      const beta = normalizedCorr[best_offset];
      const gamma = normalizedCorr[best_offset + 1];
      delta = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
    }

    const fundamental_freq = this.sampleRate / (best_offset + delta);
    return fundamental_freq;
  }

  frequencyToNote(frequency) {
    const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const noteIndex = Math.round(noteNum) + 69;
    const octave = Math.floor(noteIndex / 12) - 1;
    const noteName = noteStrings[noteIndex % 12];
    const cents = Math.floor((noteNum - Math.round(noteNum)) * 100);

    return {
      note: noteName + octave,
      cents: cents,
      frequency: frequency
    };
  }

  noteToFrequency(note, octave) {
    const notes = {
      'C': -9, 'C#': -8, 'D': -7, 'D#': -6,
      'E': -5, 'F': -4, 'F#': -3, 'G': -2,
      'G#': -1, 'A': 0, 'A#': 1, 'B': 2
    };

    const semitones = notes[note] + (octave - 4) * 12;
    return 440 * Math.pow(2, semitones / 12);
  }

  isOnTarget(currentFreq, targetFreq, threshold = 5) {
    if (!currentFreq) return false;
    return Math.abs(currentFreq - targetFreq) <= threshold;
  }
}

// Export for use in other modules
window.PitchDetector = PitchDetector;
