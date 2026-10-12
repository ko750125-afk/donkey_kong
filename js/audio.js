/**
 * Donkey Kong (1981) Arcade Clone — Web Audio API 8-Bit Chiptune Synthesizer
 * 카네오카 유키오(兼岡行男) 원작 아케이드 사운드 및 '해머 상태' 팡파레 BGM 합성기
 */
(function (global) {
  'use strict';

  class ArcadeAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.bgmTimer = null;
      this.bgmMode = 'none'; // 'none' | 'stage' | 'hammer'
      this.bgmStep = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (!this.enabled) {
        this.stopBgm();
      }
      return this.enabled;
    }

    playTone(freq, duration, type = 'square', volume = 0.12, delay = 0, slideTo = null) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) {
        osc.frequency.linearRampToValueAtTime(slideTo, now + duration);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    // 점프맨 걸음걸이 특유의 아케이드 효과음
    playWalk(stepIndex) {
      const freqs = [196, 220, 174, 207];
      const f = freqs[stepIndex % freqs.length];
      this.playTone(f, 0.045, 'triangle', 0.1, 0, f * 1.15);
    }

    // 사다리 오르내리기 효과음
    playClimb(stepIndex) {
      const f = stepIndex % 2 === 0 ? 150 : 185;
      this.playTone(f, 0.04, 'square', 0.07);
    }

    // 점프 효과음 (스프링 피치 스윕)
    playJump() {
      this.playTone(180, 0.18, 'square', 0.12, 0, 520);
      this.playTone(520, 0.12, 'square', 0.1, 0.16, 340);
    }

    // 장애물 점프 회피 100점 / 300점 보너스 사운드
    playScoreBonus(isMulti = false) {
      if (isMulti) {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, i) => this.playTone(n, 0.09, 'square', 0.13, i * 0.07));
      } else {
        this.playTone(587.33, 0.08, 'square', 0.12, 0);
        this.playTone(880.0, 0.14, 'square', 0.12, 0.08);
      }
    }

    // 폴린 소지품(양산, 모자) 획득 사운드
    playItemPickup() {
      const notes = [659.25, 783.99, 987.77, 1318.5];
      notes.forEach((n, i) => this.playTone(n, 0.08, 'square', 0.13, i * 0.06));
    }

    // 황금 열쇠 획득 & 폴린 쇠창살 개방 효과음
    playCageUnlock() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      notes.forEach((n, i) => this.playTone(n, 0.09, 'square', 0.15, i * 0.065));
    }

    // 열쇠 없이 쇠창살 접근 시 경고음
    playLockedWarning() {
      this.playTone(150, 0.12, 'sawtooth', 0.12, 0);
      this.playTone(120, 0.16, 'sawtooth', 0.12, 0.13);
    }

    // 무적 해머로 적/나무통 격파 시 타격음
    playHammerSmash() {
      this.playTone(140, 0.1, 'sawtooth', 0.18, 0, 60);
      this.playTone(523.25, 0.08, 'square', 0.15, 0.08);
      this.playTone(783.99, 0.12, 'square', 0.15, 0.15);
    }

    // 100m 스테이지 노란 철근 나사(리벳) 뽑기 사운드
    playRivetPull() {
      this.playTone(440, 0.07, 'square', 0.14, 0, 880);
      this.playTone(880, 0.12, 'triangle', 0.14, 0.07, 1174.66);
    }

    // 75m 스테이지 스프링 통통 튀는 소리 & 낙하 소리
    playSpringBounce(isDrop = false) {
      if (isDrop) {
        this.playTone(160, 0.16, 'sawtooth', 0.1, 0, 55);
      } else {
        this.playTone(220, 0.09, 'triangle', 0.08, 0, 480);
      }
    }

    // "HOW HIGH CAN YOU GET?" 인트로 팡파레
    playStageIntro() {
      const notes = [
        { f: 130.81, d: 0.16, t: 0.0 },
        { f: 146.83, d: 0.16, t: 0.18 },
        { f: 164.81, d: 0.16, t: 0.36 },
        { f: 174.61, d: 0.16, t: 0.54 },
        { f: 196.0, d: 0.38, t: 0.72 },
        { f: 392.0, d: 0.25, t: 1.12 }
      ];
      notes.forEach((n) => this.playTone(n.f, n.d, 'square', 0.14, n.t));
    }

    // 스테이지 클리어 팡파레 (25m, 50m, 75m)
    playStageClear() {
      this.stopBgm();
      const notes = [
        { f: 261.63, d: 0.12, t: 0.0 },
        { f: 329.63, d: 0.12, t: 0.13 },
        { f: 392.0, d: 0.12, t: 0.26 },
        { f: 523.25, d: 0.24, t: 0.39 },
        { f: 440.0, d: 0.14, t: 0.65 },
        { f: 523.25, d: 0.38, t: 0.81 }
      ];
      notes.forEach((n) => this.playTone(n.f, n.d, 'square', 0.14, n.t));
    }

    // 100m 최종 스테이지 클리어 (동키콩 추락 & 폴린 하트 재회 팡파레)
    playLevelComplete() {
      this.stopBgm();
      const notes = [
        { f: 392.0, d: 0.14, t: 0.0 },
        { f: 523.25, d: 0.14, t: 0.15 },
        { f: 659.25, d: 0.14, t: 0.3 },
        { f: 783.99, d: 0.25, t: 0.45 },
        { f: 659.25, d: 0.14, t: 0.72 },
        { f: 783.99, d: 0.45, t: 0.88 },
        { f: 1046.5, d: 0.5, t: 1.38 }
      ];
      notes.forEach((n) => this.playTone(n.f, n.d, 'square', 0.15, n.t));
    }

    // 점프맨 미스(사망) 효과음
    playDeath() {
      this.stopBgm();
      const notes = [
        { f: 493.88, d: 0.14, t: 0.0 },
        { f: 466.16, d: 0.14, t: 0.15 },
        { f: 440.0, d: 0.14, t: 0.3 },
        { f: 392.0, d: 0.2, t: 0.45 },
        { f: 293.66, d: 0.22, t: 0.68 },
        { f: 196.0, d: 0.45, t: 0.92 }
      ];
      notes.forEach((n) => this.playTone(n.f, n.d, 'sawtooth', 0.14, n.t));
    }

    // 배경음악 루프 시작 ('stage' 기본 워킹 베이스 | 'hammer' 무적 해머 상태 팡파레!)
    startBgm(mode = 'stage') {
      if (!this.enabled) return;
      if (this.bgmMode === mode && this.bgmTimer) return;
      this.stopBgm();
      this.bgmMode = mode;
      this.bgmStep = 0;

      if (mode === 'hammer') {
        // 나무위키에 언급된 유명한 '해머 상태' 팡파레 BGM 루프
        const hammerNotes = [
          523.25, 659.25, 783.99, 659.25,
          587.33, 698.46, 880.0, 698.46,
          523.25, 659.25, 783.99, 1046.5,
          987.77, 783.99, 587.33, 493.88
        ];
        this.bgmTimer = setInterval(() => {
          if (!this.enabled) return;
          const note = hammerNotes[this.bgmStep % hammerNotes.length];
          this.playTone(note, 0.1, 'square', 0.12);
          this.bgmStep++;
        }, 115);
      } else if (mode === 'stage') {
        // 1981 아케이드 특유의 긴장감 넘치는 워킹 베이스라인 루프
        const bassNotes = [130.81, 164.81, 174.61, 185.0, 196.0, 185.0, 174.61, 164.81];
        this.bgmTimer = setInterval(() => {
          if (!this.enabled) return;
          const note = bassNotes[this.bgmStep % bassNotes.length];
          this.playTone(note, 0.11, 'triangle', 0.09);
          this.bgmStep++;
        }, 260);
      }
    }

    stopBgm() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      this.bgmMode = 'none';
    }
  }

  global.DKAudio = new ArcadeAudio();
})(window);
