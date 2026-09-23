/**
 * Simple Loud Alarm Sound Service
 * Plays a loud, clear alarm sound when a major problem/critical fault appears.
 */

class SimpleAlarmService {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.alarmTimer = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.9, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(muted ? 0 : 0.9, this.ctx.currentTime);
    }
    if (muted) {
      this.stopAlarm();
    }
  }

  /**
   * Play a loud, clear alarm sound (3 sharp high-pitch beeps repeating)
   */
  playAlarm() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // If already playing, don't overlap timers
    if (this.isPlaying) return;
    this.isPlaying = true;

    const beepSequence = () => {
      if (!this.isPlaying || this.isMuted || !this.ctx) return;

      const now = this.ctx.currentTime;
      // 3 loud warning beeps
      [0, 0.14, 0.28].forEach((timeOffset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square'; // loud, crisp alert waveform
        osc.frequency.setValueAtTime(880, now + timeOffset); // 880 Hz standard alarm pitch
        osc.frequency.setValueAtTime(1046.5, now + timeOffset + 0.05); // jump to C6 for urgent warning

        gain.gain.setValueAtTime(0.001, now + timeOffset);
        gain.gain.linearRampToValueAtTime(0.85, now + timeOffset + 0.01);
        gain.gain.setValueAtTime(0.85, now + timeOffset + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.11);

        osc.connect(gain);
        gain.connect(this.gainNode);

        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.12);
      });
    };

    beepSequence();
    // Repeat the alarm beeps every 1.2 seconds while error persists
    this.alarmTimer = setInterval(beepSequence, 1200);
  }

  /**
   * Stop alarm sound
   */
  stopAlarm() {
    this.isPlaying = false;
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
  }
}

export const audioAlertService = new SimpleAlarmService();
