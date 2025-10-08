/**
 * Charts and visualization for progress tracking
 * Uses Canvas API for lightweight charting
 */
class Charts {
  constructor() {
    this.colors = {
      primary: '#e94560',
      secondary: '#0f3460',
      success: '#16c79a',
      background: '#1a1a2e',
      text: '#f1f1f1',
      grid: '#333'
    };
  }

  drawStreakCalendar(canvas, dailyPracticeMinutes, currentStreak) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate days to show (last 90 days)
    const today = new Date();
    const daysToShow = 90;
    const cellSize = Math.floor(width / 15);
    const cellPadding = 2;

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // Draw title
    ctx.fillStyle = this.colors.text;
    ctx.fillText(`${currentStreak} day streak 🔥`, width / 2, 20);

    // Draw calendar grid (GitHub-style)
    let x = 10;
    let y = 40;
    let col = 0;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();

      const minutes = dailyPracticeMinutes[dateStr] || 0;

      // Color based on practice time
      if (minutes === 0) {
        ctx.fillStyle = this.colors.grid;
      } else if (minutes < 5) {
        ctx.fillStyle = '#0e4429';
      } else if (minutes < 15) {
        ctx.fillStyle = '#006d32';
      } else if (minutes < 30) {
        ctx.fillStyle = '#26a641';
      } else {
        ctx.fillStyle = '#39d353';
      }

      ctx.fillRect(x, y, cellSize - cellPadding, cellSize - cellPadding);

      col++;
      if (col >= 15) {
        col = 0;
        x = 10;
        y += cellSize;
      } else {
        x += cellSize;
      }
    }
  }

  drawLineChart(canvas, data, label, targetValue = null) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) {
      ctx.fillStyle = this.colors.text;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet', width / 2, height / 2);
      return;
    }

    // Find min/max for scaling
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw title
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding, 20);

    // Draw grid
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * (height - 2 * padding) / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxValue - (i * valueRange / 5);
      ctx.fillStyle = this.colors.text;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1), padding - 5, y + 3);
    }

    // Draw target line if provided
    if (targetValue !== null && targetValue >= minValue && targetValue <= maxValue) {
      const targetY = padding + ((maxValue - targetValue) / valueRange) * (height - 2 * padding);
      ctx.strokeStyle = this.colors.success;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, targetY);
      ctx.lineTo(width - padding, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw line
    ctx.strokeStyle = this.colors.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const xStep = (width - 2 * padding) / (data.length - 1 || 1);

    data.forEach((point, index) => {
      const x = padding + (index * xStep);
      const y = padding + ((maxValue - point.value) / valueRange) * (height - 2 * padding);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = this.colors.primary;
    data.forEach((point, index) => {
      const x = padding + (index * xStep);
      const y = padding + ((maxValue - point.value) / valueRange) * (height - 2 * padding);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  drawProgressBar(canvas, current, max, label) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const percentage = (current / max) * 100;

    // Draw label
    ctx.fillStyle = this.colors.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 10, 15);

    // Draw percentage
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(percentage)}%`, width - 10, 15);

    // Draw background bar
    const barY = 20;
    const barHeight = height - 30;
    ctx.fillStyle = this.colors.grid;
    ctx.fillRect(10, barY, width - 20, barHeight);

    // Draw progress bar
    const progressWidth = ((width - 20) * current) / max;
    const gradient = ctx.createLinearGradient(10, 0, 10 + progressWidth, 0);
    gradient.addColorStop(0, this.colors.secondary);
    gradient.addColorStop(1, this.colors.primary);
    ctx.fillStyle = gradient;
    ctx.fillRect(10, barY, progressWidth, barHeight);

    // Draw value text
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${current} / ${max}`, width / 2, barY + barHeight / 2 + 5);
  }

  drawPitchMeter(canvas, currentFreq, targetFreq, threshold = 10) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const meterWidth = width - 40;

    // Draw target zone
    ctx.fillStyle = 'rgba(22, 199, 154, 0.2)';
    ctx.fillRect(20 + meterWidth / 2 - 20, centerY - 30, 40, 60);

    // Draw scale
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    // Draw tick marks
    for (let i = -5; i <= 5; i++) {
      const x = 20 + meterWidth / 2 + (i * meterWidth / 12);
      ctx.beginPath();
      ctx.moveTo(x, centerY - 10);
      ctx.lineTo(x, centerY + 10);
      ctx.stroke();

      if (i !== 0) {
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((i * threshold / 2).toFixed(0), x, centerY + 25);
      }
    }

    // Draw current frequency indicator
    if (currentFreq) {
      const diff = currentFreq - targetFreq;
      const position = (diff / threshold) * (meterWidth / 6);
      const clampedPos = Math.max(-meterWidth / 2, Math.min(meterWidth / 2, position));

      const x = 20 + meterWidth / 2 + clampedPos;

      // Draw indicator
      ctx.fillStyle = Math.abs(diff) <= threshold / 4 ? this.colors.success : this.colors.primary;
      ctx.beginPath();
      ctx.arc(x, centerY, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw frequency text
      ctx.fillStyle = this.colors.text;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentFreq.toFixed(1)} Hz`, width / 2, height - 20);
    }

    // Draw target text
    ctx.fillStyle = this.colors.success;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Target: ${targetFreq.toFixed(1)} Hz`, width / 2, 20);
  }
}

// Export for use in other modules
window.Charts = Charts;
