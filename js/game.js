/**
 * Donkey Kong (1981) Arcade Clone — Core 60FPS Game Engine
 * 나무위키(동키콩 1981) 문서의 4대 스테이지, 캐릭터/아이템/적 기믹, 점수 및 물리 판정 완벽 구현
 */
(function (global) {
  'use strict';

  const CANVAS_W = 448;
  const CANVAS_H = 512;
  const GRAVITY = 0.24;
  const JUMP_VEL = -4.55;
  const MOVE_SPEED = 1.55;
  const CLIMB_SPEED = 1.25;
  const MAX_SAFE_FALL = 76; // 이륙한 바닥 기준 한 층 이상 추락할 때만 낙사 판정

  const DIFFICULTY_PRESETS = {
    beginner: {
      label: '초보',
      speedMult: 0.75,
      intervalMult: 1.35
    },
    intermediate: {
      label: '중급',
      speedMult: 1.05,
      intervalMult: 1.0
    },
    advanced: {
      label: '고급',
      speedMult: 1.5,
      intervalMult: 0.7
    }
  };

  class DonkeyKongGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');

      this.state = 'TITLE'; // 'TITLE' | 'HOW_HIGH' | 'PLAYING' | 'STAGE_CLEAR' | 'LEVEL_COMPLETE' | 'DYING' | 'GAME_OVER'
      this.paused = false;
      this.tick = 0;
      this.stateTimer = 0;

      // 점수, 레벨 및 장애물 속도 난이도 상태
      this.score = 0;
      this.highScore = Number(localStorage.getItem('dk1981_high_score') || 7650);
      this.lives = 3;
      this.level = 1; // L=01, L=02...
      this.stageNum = 1; // 1(25m), 2(50m), 3(75m), 4(100m)
      this.bonus = 5000;
      this.bonusTick = 0;
      this.difficulty = localStorage.getItem('dk1981_difficulty') || 'beginner';
      if (!DIFFICULTY_PRESETS[this.difficulty]) {
        this.difficulty = 'beginner';
      }

      // 입력 상태 (키보드 + 모바일 가상 패드 통합)
      this.keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false
      };
      this.jumpPressedOnce = false;

      // 엔티티 컨테이너
      this.stage = null;
      this.player = null;
      this.dk = null;
      this.pauline = null;
      this.barrels = [];
      this.fireballs = [];
      this.cementPans = [];
      this.springs = [];
      this.floatingTexts = [];
      this.sparks = [];

      this.bindEvents();
      this.updateDifficultyButtons();
      this.loadStage(1, false);
      this.state = 'TITLE';

      // 60FPS 고정 타임스텝 루프
      this.lastTime = performance.now();
      this.accumulator = 0;
      this.stepMs = 1000 / 60;
      requestAnimationFrame((t) => this.loop(t));
    }

    getSpeedMult() {
      return (DIFFICULTY_PRESETS[this.difficulty] || DIFFICULTY_PRESETS.beginner).speedMult;
    }

    getIntervalMult() {
      return (DIFFICULTY_PRESETS[this.difficulty] || DIFFICULTY_PRESETS.beginner).intervalMult;
    }

    setDifficulty(diff) {
      if (!DIFFICULTY_PRESETS[diff]) return;
      const prevMult = this.getSpeedMult();
      this.difficulty = diff;
      localStorage.setItem('dk1981_difficulty', diff);
      this.updateDifficultyButtons();

      // 이미 필드에 나와 있는 장애물 속도도 즉시 비율에 맞춰 갱신
      const ratio = this.getSpeedMult() / prevMult;
      for (const b of this.barrels) {
        b.vx *= ratio;
        if (b.throwDirect) b.vy *= ratio;
      }
      for (const fb of this.fireballs) {
        fb.vx *= ratio;
      }
      for (const sp of this.springs) {
        sp.vx *= ratio;
      }
    }

    updateDifficultyButtons() {
      document.querySelectorAll('.diff-btn').forEach((btn) => {
        const isCurrent = btn.getAttribute('data-difficulty') === this.difficulty;
        btn.classList.toggle('active', isCurrent);
      });
    }

    bindEvents() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }

        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = true;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = true;
        if (e.code === 'Space' || e.code === 'KeyZ') {
          if (!this.keys.jump) this.jumpPressedOnce = true;
          this.keys.jump = true;
        }

        if (e.code === 'Enter' || e.code === 'Space') {
          if (this.state === 'TITLE' || this.state === 'GAME_OVER') {
            this.triggerStart();
          }
        }

        if (e.code === 'KeyP' || e.code === 'Escape') {
          this.toggleSettingsModal();
        }

        if (e.code === 'KeyM') {
          this.toggleSoundUI();
        }

        // 숫자키 1~4로 언제든 원하는 스테이지(25m/50m/75m/100m) 즉시 이동 테스트 지원
        if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
          const targetStage = Number(e.code.replace('Digit', ''));
          this.warpToStage(targetStage);
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.up = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keys.down = false;
        if (e.code === 'Space' || e.code === 'KeyZ') this.keys.jump = false;
      });

      // 설정 버튼 및 모달 바인딩
      const settingsModal = document.getElementById('settingsModal');
      const btnSettings = document.getElementById('btnSettings');
      const btnCloseSettings = document.getElementById('btnCloseSettings');
      const btnRestartGame = document.getElementById('btnRestartGame');

      if (btnSettings) {
        btnSettings.addEventListener('click', () => {
          this.toggleSettingsModal(true);
          btnSettings.blur();
        });
      }
      if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
          this.toggleSettingsModal(false);
        });
      }
      if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
          if (e.target === settingsModal) {
            this.toggleSettingsModal(false);
          }
        });
      }
      if (btnRestartGame) {
        btnRestartGame.addEventListener('click', () => {
          this.toggleSettingsModal(false);
          this.triggerStart();
        });
      }

      document.querySelectorAll('.diff-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const diff = btn.getAttribute('data-difficulty');
          this.setDifficulty(diff);
          btn.blur();
        });
      });

      document.querySelectorAll('.stage-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const st = Number(btn.getAttribute('data-stage'));
          this.toggleSettingsModal(false);
          this.warpToStage(st);
          btn.blur();
        });
      });

      const btnSound = document.getElementById('btnSound');
      if (btnSound) {
        btnSound.addEventListener('click', () => {
          this.toggleSoundUI();
          btnSound.blur();
        });
      }

      const btnCrt = document.getElementById('btnCrt');
      const crtScreen = document.getElementById('crtScreen');
      if (btnCrt && crtScreen) {
        btnCrt.addEventListener('click', () => {
          const isOn = crtScreen.classList.toggle('scanlines');
          btnCrt.classList.toggle('active', isOn);
          btnCrt.textContent = isOn ? '📺 CRT ON' : '📺 CRT OFF';
          btnCrt.blur();
        });
      }

      this.canvas.addEventListener('click', () => {
        if (this.state === 'TITLE' || this.state === 'GAME_OVER') {
          this.triggerStart();
        }
      });
    }

    toggleSettingsModal(forceOpen) {
      const settingsModal = document.getElementById('settingsModal');
      if (!settingsModal) return;
      const shouldOpen = forceOpen !== undefined ? forceOpen : settingsModal.classList.contains('hidden');
      if (shouldOpen) {
        settingsModal.classList.remove('hidden');
        if (this.state === 'PLAYING' && !this.paused) {
          this.paused = true;
          global.DKAudio.stopBgm();
        }
      } else {
        settingsModal.classList.add('hidden');
        if (this.state === 'PLAYING' && this.paused) {
          this.paused = false;
          global.DKAudio.startBgm(this.player && this.player.hammerTimer > 0 ? 'hammer' : 'stage');
        }
      }
    }

    setVirtualKey(code, pressed) {
      if (code === 'ArrowLeft') this.keys.left = pressed;
      if (code === 'ArrowRight') this.keys.right = pressed;
      if (code === 'ArrowUp') this.keys.up = pressed;
      if (code === 'ArrowDown') this.keys.down = pressed;
      if (code === 'Space') {
        if (pressed && !this.keys.jump) this.jumpPressedOnce = true;
        this.keys.jump = pressed;
        if (pressed && (this.state === 'TITLE' || this.state === 'GAME_OVER')) {
          this.triggerStart();
        }
      }
    }

    toggleSoundUI() {
      const enabled = global.DKAudio.toggle();
      const btnSound = document.getElementById('btnSound');
      if (btnSound) {
        btnSound.textContent = enabled ? '🔊 사운드 ON' : '🔇 사운드 OFF';
        btnSound.classList.toggle('muted', !enabled);
      }
      if (enabled && this.state === 'PLAYING' && !this.paused) {
        global.DKAudio.startBgm(this.player && this.player.hammerTimer > 0 ? 'hammer' : 'stage');
      }
    }

    togglePause() {
      if (this.state !== 'PLAYING') return;
      this.paused = !this.paused;
      if (this.paused) {
        global.DKAudio.stopBgm();
      } else {
        global.DKAudio.startBgm(this.player && this.player.hammerTimer > 0 ? 'hammer' : 'stage');
      }
    }

    triggerStart() {
      global.DKAudio.init();
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.paused = false;
      this.startStageIntro(1);
    }

    warpToStage(stageNum) {
      global.DKAudio.init();
      if (this.lives <= 0) this.lives = 3;
      this.paused = false;
      this.startStageIntro(stageNum);
    }

    updateStageButtons() {
      document.querySelectorAll('.stage-btn').forEach((btn) => {
        const st = Number(btn.getAttribute('data-stage'));
        btn.classList.toggle('active', st === this.stageNum);
      });
    }

    startStageIntro(stageNum) {
      this.stageNum = stageNum;
      this.updateStageButtons();
      this.loadStage(stageNum, true);
      this.state = 'HOW_HIGH';
      this.stateTimer = 110;
      global.DKAudio.stopBgm();
      global.DKAudio.playStageIntro();
    }

    loadStage(stageNum, resetItems = true) {
      this.stage = global.DKStages.createStageData(stageNum);
      this.barrels = [];
      this.fireballs = [];
      this.cementPans = [];
      this.springs = [];
      this.floatingTexts = [];
      this.sparks = [];

      // 나무위키 고증: 보너스 타이머 공식 (레벨에 따라 5000 ~ 8000)
      this.bonus = Math.min(8000, 4000 + this.level * 1000);
      this.bonusTick = 0;

      this.player = {
        x: this.stage.playerSpawn.x,
        y: this.stage.playerSpawn.y,
        w: 16,
        h: 24,
        vx: 0,
        vy: 0,
        dir: 1,
        onGround: true,
        climbing: false,
        currentLadder: null,
        fallStartY: this.stage.playerSpawn.y,
        animFrame: 0,
        walkSoundTick: 0,
        hammerTimer: 0,
        jumpScoredIds: new Set(),
        jumpScoreCount: 0,
        dead: false,
        deadTimer: 0
      };

      this.dk = {
        x: this.stage.dkSpawn.x,
        y: this.stage.dkSpawn.y,
        w: 56,
        h: 44,
        vx: stageNum === 2 ? 0.75 : 0,
        pose: 'roar',
        actionTimer: 25,
        holdingBlue: true,
        threwFirstOil: false,
        falling: false,
        knockedOut: false
      };

      this.pauline = {
        x: this.stage.paulineSpawn.x,
        y: this.stage.paulineSpawn.y,
        w: 18,
        h: 26,
        rescued: false,
        cageUnlocked: false,
        cageOpenProgress: 0,
        needKeyWarnTimer: 0
      };

      // 스테이지별 초기 적 배치
      if (stageNum === 2) {
        // 50m 중앙 화로에서 시작하는 방해꾼 벌레
        this.spawnFireball(218, 290, false);
      } else if (stageNum === 3) {
        // 75m 엘리베이터 스테이지의 방해꾼 벌레 2마리 및 첫 스프링
        this.spawnFireball(200, 296, false);
        this.spawnFireball(370, 358, false);
        this.spawnSpring();
      } else if (stageNum === 4) {
        // 100m 철근 나사 스테이지의 큰 불꽃(불꽃) 3마리
        this.spawnFireball(80, 376, true);
        this.spawnFireball(340, 290, true);
        this.spawnFireball(180, 204, true);
      }
    }

    addScore(pts, x, y) {
      this.score += pts;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('dk1981_high_score', String(this.highScore));
      }
      if (x !== undefined && y !== undefined) {
        this.floatingTexts.push({
          text: String(pts),
          x,
          y,
          timer: 42
        });
      }
    }

    addSmashSparks(x, y) {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        this.sparks.push({
          x,
          y,
          vx: Math.cos(angle) * 2.2,
          vy: Math.sin(angle) * 2.2,
          timer: 18
        });
      }
    }

    loop(now) {
      const dt = Math.min(100, now - this.lastTime);
      this.lastTime = now;
      this.accumulator += dt;

      while (this.accumulator >= this.stepMs) {
        this.update();
        this.accumulator -= this.stepMs;
      }

      this.render();
      requestAnimationFrame((t) => this.loop(t));
    }

    update() {
      this.tick++;

      if (this.paused) return;

      if (this.state === 'HOW_HIGH') {
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.state = 'PLAYING';
          global.DKAudio.startBgm('stage');
        }
        return;
      }

      if (this.state === 'STAGE_CLEAR') {
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          const nextStage = (this.stageNum % 4) + 1;
          this.startStageIntro(nextStage);
        }
        return;
      }

      if (this.state === 'LEVEL_COMPLETE') {
        // 100m 나사 8개 전부 제거 시 동키콩 추락 애니메이션
        if (this.dk.falling && !this.dk.knockedOut) {
          this.dk.y += 4.2;
          if (this.dk.y >= 432) {
            this.dk.y = 432;
            this.dk.knockedOut = true;
            this.addSmashSparks(this.dk.x + 28, this.dk.y + 20);
          }
        }
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.level++;
          this.startStageIntro(1);
        }
        return;
      }

      if (this.state === 'DYING') {
        this.player.deadTimer--;
        if (this.player.deadTimer <= 0) {
          this.lives--;
          if (this.lives <= 0) {
            this.state = 'GAME_OVER';
          } else {
            this.startStageIntro(this.stageNum);
          }
        }
        return;
      }

      if (this.state !== 'PLAYING') return;

      // 1. 보너스 타이머 카운트다운
      this.bonusTick++;
      if (this.bonusTick >= 90) {
        this.bonusTick = 0;
        this.bonus = Math.max(0, this.bonus - 100);
        if (this.bonus === 0) {
          this.killPlayer();
          return;
        }
      }

      // 2. 무적 해머 타이머 업데이트
      if (this.player.hammerTimer > 0) {
        this.player.hammerTimer--;
        if (this.player.hammerTimer === 0) {
          global.DKAudio.startBgm('stage');
        }
      }

      // 3. 스테이지 기믹 & 플레이어 & 적 업데이트
      this.updateStageGimmicks();
      this.updatePlayer();
      this.updateDonkeyKong();
      this.updateBarrels();
      this.updateFireballs();
      this.updateCementPans();
      this.updateSprings();
      this.updateItemsAndRivets();
      this.updateEffects();
    }

    updateStageGimmicks() {
      // 50m 컨베이어 벨트 주기적 방향 전환 & 신축 사다리
      if (this.stageNum === 2) {
        if (this.tick % 360 === 0) {
          this.stage.girders.forEach((g) => {
            if (g.id === 1 || g.id === 5) {
              g.conveyor = -g.conveyor;
            }
          });
        }
        const retract = Math.sin(this.tick * 0.025) > 0.35;
        this.stage.ladders.forEach((l) => {
          if (l.telescopic) {
            l.broken = retract;
            l.y1 = retract ? 172 : 136;
          }
        });
      }

      // 75m 엘리베이터 상하 이동
      if (this.stageNum === 3) {
        this.stage.elevators.forEach((el) => {
          el.y += el.vy;
          if (el.vy < 0 && el.y < el.minY) {
            el.y = el.maxY;
          } else if (el.vy > 0 && el.y > el.maxY) {
            el.y = el.minY;
          }
        });
      }
    }

    updatePlayer() {
      const p = this.player;
      const hasHammer = p.hammerTimer > 0;

      // 1) 사다리 탑승 중일 때 (해머 보유 중에는 사다리 이용 불가!)
      if (p.climbing && p.currentLadder) {
        const lad = p.currentLadder;
        p.vx = 0;
        p.vy = 0;
        p.x = lad.x - p.w / 2;

        if (this.keys.up) {
          // 끊어진 사다리(broken)는 상단으로 완주 불가
          const minTop = lad.broken ? lad.y1 + 22 : lad.y1 - p.h;
          p.y = Math.max(minTop, p.y - CLIMB_SPEED);
          p.animFrame += 0.16;
          p.walkSoundTick++;
          if (p.walkSoundTick % 10 === 0) global.DKAudio.playClimb(p.walkSoundTick);
        } else if (this.keys.down) {
          p.y = Math.min(lad.y2 - p.h, p.y + CLIMB_SPEED);
          p.animFrame += 0.16;
          p.walkSoundTick++;
          if (p.walkSoundTick % 10 === 0) global.DKAudio.playClimb(p.walkSoundTick);
        }

        // 사다리 상단 도달 판정
        if (!lad.broken && p.y <= lad.y1 - p.h + 1) {
          p.y = lad.y1 - p.h;
          p.climbing = false;
          p.currentLadder = null;
          p.onGround = true;
          p.fallStartY = p.y;

          // 폴린 구출 사다리 완주 시: 열쇠로 쇠창살을 연 상태에서만 구출 가능!
          if (lad.isGoalLadder) {
            if (this.pauline.cageUnlocked) {
              this.triggerStageClear();
              return;
            } else {
              if (!this.pauline.needKeyWarnTimer) {
                global.DKAudio.playLockedWarning();
              }
              this.pauline.needKeyWarnTimer = 75;
            }
          }
        }
        // 사다리 하단 도달 판정
        else if (p.y >= lad.y2 - p.h - 1 && this.keys.down) {
          p.y = lad.y2 - p.h;
          p.climbing = false;
          p.currentLadder = null;
          p.onGround = true;
          p.fallStartY = p.y;
        }

        this.jumpPressedOnce = false;
        return;
      }

      // 2) 지상에서 사다리 진입 체크 (무적 해머 사용 중에는 사다리 불가 - 나무위키 고증!)
      if (!hasHammer && p.onGround && (this.keys.up || this.keys.down)) {
        const pxCenter = p.x + p.w / 2;
        const pyFoot = p.y + p.h;

        for (const lad of this.stage.ladders) {
          if (lad.decorative) continue;
          if (Math.abs(pxCenter - lad.x) <= 10) {
            // 위로 올라가기 시작
            if (this.keys.up && Math.abs(pyFoot - lad.y2) <= 10) {
              p.climbing = true;
              p.currentLadder = lad;
              p.x = lad.x - p.w / 2;
              p.y = lad.y2 - p.h - 2;
              this.jumpPressedOnce = false;
              return;
            }
            // 아래로 내려가기 시작 (끊어진 사다리는 위에서 내려갈 수 없음)
            if (this.keys.down && !lad.broken && Math.abs(pyFoot - lad.y1) <= 10) {
              p.climbing = true;
              p.currentLadder = lad;
              p.x = lad.x - p.w / 2;
              p.y = lad.y1 - p.h + 4;
              this.jumpPressedOnce = false;
              return;
            }
          }
        }
      }

      // 3) 좌우 이동 및 점프 (무적 해머 사용 중에는 점프 불가 - 나무위키 고증!)
      let moveVx = 0;
      if (this.keys.left) {
        moveVx = -MOVE_SPEED;
        p.dir = -1;
      } else if (this.keys.right) {
        moveVx = MOVE_SPEED;
        p.dir = 1;
      }

      if (p.onGround) {
        p.vx = moveVx;
        if (moveVx !== 0) {
          p.animFrame += 0.22;
          p.walkSoundTick++;
          if (p.walkSoundTick % 9 === 0) {
            global.DKAudio.playWalk(Math.floor(p.walkSoundTick / 9));
          }
        } else {
          p.animFrame = 0;
        }

        if (this.jumpPressedOnce && !hasHammer) {
          p.vy = JUMP_VEL;
          p.onGround = false;
          p.fallStartY = p.y;
          p.jumpScoredIds.clear();
          p.jumpScoreCount = 0;
          global.DKAudio.playJump();
        }
      } else {
        // 공중에서도 약간의 이동 보정 허용
        if (moveVx !== 0 && p.vx === 0) {
          p.vx = moveVx * 0.75;
        }
      }
      this.jumpPressedOnce = false;

      // 4) 위치 업데이트 및 중력 적용
      const prevFootY = p.y + p.h;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;

      // 화면 좌우 경계 제한
      p.x = Math.max(16, Math.min(CANVAS_W - 16 - p.w, p.x));

      // 5) 철골(Girder) 및 엘리베이터 착지 판정
      let landedSurface = null;
      let landedY = Infinity;
      const pxCenter = p.x + p.w / 2;
      const currFootY = p.y + p.h;

      if (p.vy >= 0) {
        // 일반 철골 검사
        for (const g of this.stage.girders) {
          if (pxCenter >= g.x1 - 4 && pxCenter <= g.x2 + 4) {
            // 100m 스테이지: 이미 열린 다리(리벳) 위치에는 빈틈이 생겨 다음번부터는 점프 없이 지나가면 아래로 빠짐!
            // (단, 최초 1회 밟아서 다리가 열리는 중인 safePassActive 상태에서는 절대 떨어지지 않음)
            if (this.stageNum === 4 && this.isInsidePulledRivetGap(g.id, pxCenter, true)) {
              continue;
            }
            const gy = global.DKStages.getGirderYAtX(g, pxCenter);
            if (prevFootY <= gy + 8 && currFootY >= gy - 2) {
              if (gy < landedY) {
                landedY = gy;
                landedSurface = g;
              }
            }
          }
        }

        // 75m 엘리베이터 발판 검사
        for (const el of this.stage.elevators) {
          if (pxCenter >= el.x - 4 && pxCenter <= el.x + el.w + 4) {
            if (prevFootY <= el.y + 9 && currFootY >= el.y - 3) {
              if (el.y < landedY) {
                landedY = el.y;
                landedSurface = el;
              }
            }
          }
        }
      }

      if (landedSurface) {
        const dropDist = landedY - p.h - p.fallStartY;
        p.y = landedY - p.h;
        p.vy = 0;

        // 높은 곳에서 떨어졌을 때 낙사 판정 (원작 고증!)
        if (!p.onGround && dropDist > MAX_SAFE_FALL) {
          this.killPlayer();
          return;
        }

        // 점프 착지 시 뛰어넘은 장애물 개수에 따라 100점 / 300점 부여!
        if (!p.onGround && p.jumpScoreCount > 0) {
          const pts = p.jumpScoreCount >= 2 ? 300 : 100;
          this.addScore(pts, p.x, p.y - 8);
          global.DKAudio.playScoreBonus(p.jumpScoreCount >= 2);
          p.jumpScoreCount = 0;
          p.jumpScoredIds.clear();
        }

        p.onGround = true;
        p.fallStartY = p.y;

        // 50m 컨베이어 벨트 위에서 벨트 속도에 밀림
        if (landedSurface.conveyor) {
          p.x += landedSurface.conveyor;
        }

        // 폴린 플랫폼 도달 시: 열쇠로 쇠창살이 열렸을 때만 구출(클리어), 아니면 쇠창살 앞에서 가로막힘!
        if (landedSurface.isGoalPlatform && this.stageNum !== 4) {
          if (this.pauline.cageUnlocked) {
            this.triggerStageClear();
            return;
          } else {
            if (p.x < 234) {
              p.x = 234;
              if (!this.pauline.needKeyWarnTimer) {
                global.DKAudio.playLockedWarning();
              }
              this.pauline.needKeyWarnTimer = 75;
            }
          }
        }
      } else {
        if (p.onGround) {
          p.onGround = false;
          p.fallStartY = p.y;
        }
      }

      // 6) 공중 점프 중 아래에 있는 위험 장애물 뛰어넘기 판정 (100점 / 2개 이상 300점)
      if (!p.onGround) {
        this.checkJumpOverHazards();
      }

      // 7) 화면 하단 밖으로 추락 시 사망
      if (p.y > CANVAS_H) {
        this.killPlayer();
        return;
      }

      // 8) 동키콩 본체와 직접 충돌 시 사망
      if (this.rectsOverlap(p.x + 2, p.y + 2, p.w - 4, p.h - 4, this.dk.x + 8, this.dk.y + 6, this.dk.w - 16, this.dk.h - 8)) {
        this.killPlayer();
        return;
      }

      // 9) 50m 스테이지 중앙 대형 화염 구덩이(불꽃)와 직접 접촉 시 사망
      if (this.stage.firePot) {
        const fp = this.stage.firePot;
        if (this.rectsOverlap(p.x + 3, p.y + 3, p.w - 6, p.h - 4, fp.x - 2, fp.y - 8, fp.w + 4, fp.h + 10)) {
          this.killPlayer();
          return;
        }
      }
    }

    isInsidePulledRivetGap(girderId, x, isPlayer = false) {
      for (const r of this.stage.rivets) {
        if (r.pulled && r.girderId === girderId && Math.abs(x - r.x) < 7) {
          if (isPlayer && r.safePassActive) {
            return false;
          }
          return true;
        }
      }
      return false;
    }

    checkJumpOverHazards() {
      const p = this.player;
      const px = p.x + p.w / 2;
      const pyBottom = p.y + p.h;

      const hazards = [
        ...this.barrels,
        ...this.fireballs,
        ...this.cementPans,
        ...this.springs
      ];

      hazards.forEach((h) => {
        if (!h.uid) h.uid = Math.random();
        if (p.jumpScoredIds.has(h.uid)) return;
        const hx = h.x + (h.w || 14) / 2;
        const hy = h.y;
        if (Math.abs(px - hx) < 16 && hy >= pyBottom && hy - pyBottom <= 36) {
          p.jumpScoredIds.add(h.uid);
          p.jumpScoreCount++;
        }
      });
    }

    // 무적 해머의 타격 히트박스 계산 (점프맨의 정면 또는 머리 위)
    getHammerHitbox() {
      const p = this.player;
      if (p.hammerTimer <= 0 || p.dead) return null;
      const swingDown = Math.floor(this.tick / 5) % 2 === 0;
      if (swingDown) {
        // 정면 강타 히트박스
        return {
          x: p.dir > 0 ? p.x + p.w - 2 : p.x - 22,
          y: p.y + 2,
          w: 24,
          h: 22
        };
      }
      // 머리 위 히트박스
      return {
        x: p.x - 4,
        y: p.y - 20,
        w: p.w + 8,
        h: 20
      };
    }

    updateDonkeyKong() {
      const dk = this.dk;
      const speedMult = this.getSpeedMult();
      const intervalMult = this.getIntervalMult();

      // 50m 및 100m에서 동키콩 좌우 움직임
      if (this.stageNum === 2) {
        dk.x += dk.vx * speedMult;
        if (dk.x < 48 || dk.x > 336) {
          dk.vx = -dk.vx;
        }
      }

      dk.actionTimer--;
      if (dk.actionTimer > 0) return;

      // STAGE 1 (25m): 나무통 & 휘발유통 굴리기 (난이도별 투척 간격 및 속도 적용!)
      if (this.stageNum === 1) {
        if (dk.pose === 'roar' || dk.pose === 'right') {
          dk.pose = 'left';
          dk.actionTimer = Math.round(24 * intervalMult);
        } else if (dk.pose === 'left') {
          dk.pose = 'hold';
          // 첫 번째 통은 반드시 파란 휘발유통! 이후에는 일정 확률로 파란 통 등장
          dk.holdingBlue = !dk.threwFirstOil || Math.random() < 0.22;
          dk.actionTimer = Math.round(26 * intervalMult);
        } else if (dk.pose === 'hold') {
          dk.pose = 'right';
          const baseInterval = Math.max(65, 110 - (this.level - 1) * 10);
          dk.actionTimer = Math.round(baseInterval * intervalMult);

          if (!dk.threwFirstOil) {
            // 게임 시작 직후 동키콩이 휘발유통을 아래 드럼통에 던짐 (난이도 속도 배율 적용)
            dk.threwFirstOil = true;
            this.barrels.push({
              uid: Math.random(),
              x: dk.x + 20,
              y: dk.y + 32,
              w: 14,
              h: 14,
              vx: -0.52 * speedMult,
              vy: 2.2 * speedMult,
              isOil: true,
              throwDirect: true,
              onLadder: false,
              girderId: 5,
              rot: 0
            });
          } else {
            // 가끔 직격으로 던지는 통 vs 철골을 따라 굴리는 통 (난이도 속도 배율 적용)
            const directThrow = Math.random() < 0.14;
            const rollSpeed = (1.45 + (this.level - 1) * 0.1) * speedMult;
            this.barrels.push({
              uid: Math.random(),
              x: dk.x + 48,
              y: dk.y + 30,
              w: 14,
              h: 14,
              vx: directThrow ? (this.player.x - dk.x) * 0.009 * speedMult : rollSpeed,
              vy: directThrow ? 2.0 * speedMult : 0,
              isOil: dk.holdingBlue,
              throwDirect: directThrow,
              onLadder: false,
              girderId: 5,
              rot: 0
            });
          }
        }
      } else {
        // 다른 스테이지에서는 가슴 치기 포효 애니메이션 반복
        dk.pose = dk.pose === 'roar' ? 'idle' : 'roar';
        dk.actionTimer = 45;
      }
    }

    updateBarrels() {
      const hammerBox = this.getHammerHitbox();
      const speedMult = this.getSpeedMult();

      for (let i = this.barrels.length - 1; i >= 0; i--) {
        const b = this.barrels[i];
        b.rot += 0.18 * speedMult;

        // 1) 직선 투척된 통 (시작 시 휘발유통 등)
        if (b.throwDirect) {
          b.x += b.vx;
          b.y += b.vy;
          if (b.y >= 462) {
            // 좌측 하단 OIL 드럼통 점화 후 방해꾼 벌레 생성!
            if (this.stage.oilDrum) {
              this.stage.oilDrum.lit = true;
              if (this.fireballs.length < 4) {
                this.spawnFireball(this.stage.oilDrum.x + 4, this.stage.oilDrum.y - 12, false);
              }
            }
            this.barrels.splice(i, 1);
            continue;
          }
        }
        // 2) 사다리를 타고 내려오는 중인 나무통 (난이도 배율 적용)
        else if (b.onLadder && b.targetLadder) {
          b.y += 1.65 * speedMult;
          if (b.y >= b.targetLadder.y2 - b.h) {
            b.y = b.targetLadder.y2 - b.h;
            b.onLadder = false;
            b.targetLadder = null;
          }
        }
        // 3) 철골 위를 굴러가는 나무통 (난이도 배율 적용)
        else {
          b.x += b.vx;
          b.y += b.vy;
          b.vy += GRAVITY;

          const bxCenter = b.x + b.w / 2;
          let onGirder = null;
          for (const g of this.stage.girders) {
            if (bxCenter >= g.x1 && bxCenter <= g.x2) {
              const gy = global.DKStages.getGirderYAtX(g, bxCenter);
              if (b.y + b.h >= gy - 3 && b.y + b.h <= gy + 9 && b.vy >= 0) {
                onGirder = g;
                b.y = gy - b.h;
                b.vy = 0;
                const speed = (1.45 + (this.level - 1) * 0.1) * speedMult;
                b.vx = (g.rollDir || -1) * speed;
                break;
              }
            }
          }

          // 사다리 상단을 지날 때 일정 확률로 사다리 타고 내려옴
          if (onGirder) {
            for (const lad of this.stage.ladders) {
              if (lad.decorative || lad.isGoalLadder) continue;
              if (Math.abs(bxCenter - lad.x) < 3.0 && Math.abs(b.y + b.h - lad.y1) < 8) {
                const playerBelow = this.player.y > b.y;
                const chance = playerBelow ? 0.32 : 0.15;
                if (Math.random() < chance) {
                  b.onLadder = true;
                  b.targetLadder = lad;
                  b.x = lad.x - b.w / 2;
                  b.vx = 0;
                  break;
                }
              }
            }
          }

          // 좌측 하단 OIL 드럼통에 도달한 통 처리
          if (this.stage.oilDrum && b.y > 445 && b.x < 48) {
            this.stage.oilDrum.lit = true;
            if (b.isOil && this.fireballs.length < 4) {
              this.spawnFireball(this.stage.oilDrum.x + 4, this.stage.oilDrum.y - 12, false);
            }
            this.barrels.splice(i, 1);
            continue;
          }

          if (b.x < -20 || b.x > CANVAS_W + 20 || b.y > CANVAS_H + 20) {
            this.barrels.splice(i, 1);
            continue;
          }
        }

        // 무적 해머 타격 판정
        if (hammerBox && this.rectsOverlap(hammerBox.x, hammerBox.y, hammerBox.w, hammerBox.h, b.x, b.y, b.w, b.h)) {
          const pts = b.isOil ? 500 : 300;
          this.addScore(pts, b.x, b.y);
          this.addSmashSparks(b.x + 7, b.y + 7);
          global.DKAudio.playHammerSmash();
          this.barrels.splice(i, 1);
          continue;
        }

        // 점프맨 본체 피격 판정
        if (this.rectsOverlap(this.player.x + 3, this.player.y + 3, this.player.w - 6, this.player.h - 5, b.x + 2, b.y + 2, b.w - 4, b.h - 4)) {
          this.killPlayer();
          return;
        }
      }
    }

    spawnFireball(x, y, isBig = false) {
      const speedMult = this.getSpeedMult();
      this.fireballs.push({
        uid: Math.random(),
        x,
        y,
        w: isBig ? 16 : 14,
        h: isBig ? 16 : 14,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.85 + (this.level - 1) * 0.08) * speedMult,
        vy: 0,
        isBig,
        onLadder: false,
        targetLadder: null,
        ladderDir: -1
      });
    }

    updateFireballs() {
      const speedMult = this.getSpeedMult();
      const intervalMult = this.getIntervalMult();
      const spawnModulo = Math.max(180, Math.round(310 * intervalMult));

      // 100m 스테이지에서는 주기적으로 불꽃이 최대 5마리까지 충원됨
      if (this.stageNum === 4 && this.tick % spawnModulo === 0 && this.fireballs.length < 5) {
        this.spawnFireball(216, 120, true);
      }

      const hammerBox = this.getHammerHitbox();

      for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];

        if (fb.onLadder && fb.targetLadder) {
          fb.y += fb.ladderDir * 0.95 * speedMult;
          if (fb.ladderDir < 0 && fb.y <= fb.targetLadder.y1 - fb.h) {
            fb.y = fb.targetLadder.y1 - fb.h;
            fb.onLadder = false;
            fb.targetLadder = null;
          } else if (fb.ladderDir > 0 && fb.y >= fb.targetLadder.y2 - fb.h) {
            fb.y = fb.targetLadder.y2 - fb.h;
            fb.onLadder = false;
            fb.targetLadder = null;
          }
        } else {
          fb.x += fb.vx;
          const fxCenter = fb.x + fb.w / 2;

          // 현재 서 있는 철골 찾기
          let currentG = null;
          for (const g of this.stage.girders) {
            if (fxCenter >= g.x1 && fxCenter <= g.x2) {
              const gy = global.DKStages.getGirderYAtX(g, fxCenter);
              if (Math.abs(fb.y + fb.h - gy) <= 10) {
                currentG = g;
                fb.y = gy - fb.h;
                break;
              }
            }
          }

          if (currentG) {
            // 철골 양 끝 또는 뽑힌 리벳 구멍 앞에서 방향 전환
            if (fb.x <= currentG.x1 + 2) fb.vx = Math.abs(fb.vx);
            if (fb.x + fb.w >= currentG.x2 - 2) fb.vx = -Math.abs(fb.vx);
            if (this.stageNum === 4 && this.isInsidePulledRivetGap(currentG.id, fxCenter + Math.sign(fb.vx) * 8)) {
              fb.vx = -fb.vx;
            }

            // 사다리를 만나면 플레이어 높이 방향으로 사다리 타기
            for (const lad of this.stage.ladders) {
              if (lad.decorative || lad.broken) continue;
              if (Math.abs(fxCenter - lad.x) < 3) {
                if (Math.abs(fb.y + fb.h - lad.y2) < 8 && Math.random() < 0.25) {
                  fb.onLadder = true;
                  fb.targetLadder = lad;
                  fb.ladderDir = -1;
                  fb.x = lad.x - fb.w / 2;
                  break;
                }
                if (Math.abs(fb.y + fb.h - lad.y1) < 8 && Math.random() < 0.2) {
                  fb.onLadder = true;
                  fb.targetLadder = lad;
                  fb.ladderDir = 1;
                  fb.x = lad.x - fb.w / 2;
                  break;
                }
              }
            }
          } else {
            fb.vx = -fb.vx;
          }
        }

        // 무적 해머 타격 판정
        if (hammerBox && this.rectsOverlap(hammerBox.x, hammerBox.y, hammerBox.w, hammerBox.h, fb.x, fb.y, fb.w, fb.h)) {
          this.addScore(500, fb.x, fb.y);
          this.addSmashSparks(fb.x + 7, fb.y + 7);
          global.DKAudio.playHammerSmash();
          this.fireballs.splice(i, 1);
          continue;
        }

        // 점프맨 본체 충돌 판정
        if (this.rectsOverlap(this.player.x + 3, this.player.y + 3, this.player.w - 6, this.player.h - 5, fb.x + 2, fb.y + 2, fb.w - 4, fb.h - 4)) {
          this.killPlayer();
          return;
        }
      }
    }

    // 50m 스테이지 시멘트(파이 팬) 업데이트
    updateCementPans() {
      if (this.stageNum !== 2) return;
      const speedMult = this.getSpeedMult();
      const intervalMult = this.getIntervalMult();
      const panInterval = Math.max(85, Math.round(135 * intervalMult));

      if (this.tick % panInterval === 0 && this.cementPans.length < 4) {
        const tier2Left = Math.random() < 0.5;
        if (Math.random() < 0.55) {
          this.cementPans.push({
            uid: Math.random(),
            x: tier2Left ? 20 : 412,
            y: 312 - 13,
            w: 16,
            h: 13,
            girderId: tier2Left ? 2 : 3
          });
        } else {
          const g1 = this.stage.girders[1];
          this.cementPans.push({
            uid: Math.random(),
            x: g1.conveyor > 0 ? 20 : 412,
            y: 398 - 13,
            w: 16,
            h: 13,
            girderId: 1
          });
        }
      }

      const hammerBox = this.getHammerHitbox();

      for (let i = this.cementPans.length - 1; i >= 0; i--) {
        const pan = this.cementPans[i];
        const g = this.stage.girders.find((gr) => gr.id === pan.girderId);
        const speed = (g && g.conveyor ? g.conveyor * 1.35 : 0.9) * speedMult;
        pan.x += speed;

        // 중앙 화로(x: 196..252) 또는 화면 끝에 도달하면 소멸
        if (
          (pan.girderId === 2 && pan.x >= 190) ||
          (pan.girderId === 3 && pan.x <= 246) ||
          pan.x < 12 ||
          pan.x > 424
        ) {
          if ((pan.girderId === 2 || pan.girderId === 3) && this.fireballs.length < 3 && Math.random() < 0.35) {
            this.spawnFireball(218, 290, false);
          }
          this.cementPans.splice(i, 1);
          continue;
        }

        if (hammerBox && this.rectsOverlap(hammerBox.x, hammerBox.y, hammerBox.w, hammerBox.h, pan.x, pan.y, pan.w, pan.h)) {
          this.addScore(300, pan.x, pan.y);
          this.addSmashSparks(pan.x + 8, pan.y + 6);
          global.DKAudio.playHammerSmash();
          this.cementPans.splice(i, 1);
          continue;
        }

        if (this.rectsOverlap(this.player.x + 3, this.player.y + 3, this.player.w - 6, this.player.h - 5, pan.x + 1, pan.y + 1, pan.w - 2, pan.h - 2)) {
          this.killPlayer();
          return;
        }
      }
    }

    // 75m 스테이지 스프링 장애물 업데이트 (난이도 배율 적용)
    spawnSpring() {
      const speedMult = this.getSpeedMult();
      this.springs.push({
        uid: Math.random(),
        x: 20,
        y: 92,
        w: 14,
        h: 16,
        vx: (1.55 + (this.level - 1) * 0.1) * speedMult,
        vy: -2.9,
        fallingShaft: false,
        compressed: false
      });
    }

    updateSprings() {
      if (this.stageNum !== 3) return;
      const speedMult = this.getSpeedMult();
      const intervalMult = this.getIntervalMult();

      const baseSpawnInterval = Math.max(115, 165 - (this.level - 1) * 12);
      const spawnInterval = Math.max(75, Math.round(baseSpawnInterval * intervalMult));
      if (this.tick % spawnInterval === 0) {
        this.spawnSpring();
      }

      for (let i = this.springs.length - 1; i >= 0; i--) {
        const sp = this.springs[i];

        if (!sp.fallingShaft) {
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.18;

          // 최상단 철골(y=134) 위에서 통통 튀며 이동하다가 우측 샤프트(x >= 292)에서 아래로 직하강!
          if (sp.y + sp.h >= 134 && sp.vy > 0) {
            if (sp.x >= 292) {
              sp.fallingShaft = true;
              sp.vx = 0;
              sp.vy = 2.4 * speedMult;
              global.DKAudio.playSpringBounce(true);
            } else {
              sp.y = 134 - sp.h;
              sp.vy = -3.4;
              sp.compressed = true;
              global.DKAudio.playSpringBounce(false);
            }
          } else {
            sp.compressed = false;
          }
        } else {
          sp.y += 2.8 * speedMult;
          if (sp.y > CANVAS_H + 20) {
            this.springs.splice(i, 1);
            continue;
          }
        }

        if (this.rectsOverlap(this.player.x + 3, this.player.y + 3, this.player.w - 6, this.player.h - 5, sp.x + 1, sp.y + 1, sp.w - 2, sp.h - 2)) {
          this.killPlayer();
          return;
        }
      }
    }

    updateItemsAndRivets() {
      const p = this.player;

      // 폴린 쇠창살 오픈 모션 애니메이션 및 경고 타이머 업데이트
      if (this.pauline.cageUnlocked && this.pauline.cageOpenProgress < 1) {
        this.pauline.cageOpenProgress = Math.min(1, this.pauline.cageOpenProgress + 0.025);
      }
      if (this.pauline.needKeyWarnTimer > 0) {
        this.pauline.needKeyWarnTimer--;
      }

      // 1) 아이템(무적 해머, 황금 열쇠, 폴린의 양산/모자) 획득 판정
      for (const item of this.stage.items) {
        if (item.collected) continue;
        if (this.rectsOverlap(p.x, p.y, p.w, p.h, item.x, item.y, item.w, item.h)) {
          item.collected = true;
          if (item.type === 'hammer') {
            p.hammerTimer = 560; // 약 9.3초간 해머 상태!
            global.DKAudio.startBgm('hammer');
          } else if (item.type === 'key') {
            // 황금 열쇠 획득 -> 폴린의 쇠창살이 열리며 사라지는 모션 작동!
            const pts = item.score || 500;
            this.addScore(pts, item.x, item.y);
            this.pauline.cageUnlocked = true;
            this.pauline.needKeyWarnTimer = 0;
            this.floatingTexts.push({
              text: 'UNLOCKED!',
              x: this.pauline.x - 14,
              y: this.pauline.y - 8,
              timer: 65
            });
            this.addSmashSparks(this.pauline.x + 9, this.pauline.y + 10);
            global.DKAudio.playCageUnlock();
          } else {
            const pts = item.score || 300;
            this.addScore(pts, item.x, item.y);
            global.DKAudio.playItemPickup();
          }
        }
      }

      // 2) 100m 스테이지 다리 연결 볼트(리벳) 8개 개폐 판정 (최초 1회 밟을 때는 추락하지 않고 다리만 열림!)
      if (this.stageNum === 4) {
        const pxCenter = p.x + p.w / 2;
        const pyFoot = p.y + p.h;

        let remaining = 0;
        for (const r of this.stage.rivets) {
          if (!r.pulled) {
            if (Math.abs(pxCenter - r.x) <= 9 && pyFoot <= r.y + 8 && pyFoot >= r.y - 26) {
              r.pulled = true;
              r.safePassActive = true; // 최초 1회 밟고 지나가는 동안은 추락 방지 보장!
              r.openProgress = 0;
              this.addScore(100, r.x - 6, r.y - 12);
              this.addSmashSparks(r.x, r.y + 2);
              global.DKAudio.playRivetPull();
            }
          } else {
            // 다리 상판이 아래로 열리는 애니메이션 진행
            if (r.openProgress === undefined) r.openProgress = 1;
            if (r.openProgress < 1) {
              r.openProgress = Math.min(1, r.openProgress + 0.05);
            }
            // 플레이어가 해당 다리 구역을 완전히 벗어나면 안전 통과 보호 해제 -> 다음번부터는 점프해야만 통과 가능!
            if (r.safePassActive && (Math.abs(pxCenter - r.x) > 18 || Math.abs(pyFoot - r.y) > 30)) {
              r.safePassActive = false;
            }
          }
          if (!r.pulled) remaining++;
        }

        if (remaining === 0) {
          if (this.pauline.cageUnlocked) {
            this.triggerLevelComplete();
          } else {
            this.pauline.needKeyWarnTimer = 60;
          }
        }
      }
    }

    updateEffects() {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 0.45;
        ft.timer--;
        if (ft.timer <= 0) this.floatingTexts.splice(i, 1);
      }

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const sp = this.sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.timer--;
        if (sp.timer <= 0) this.sparks.splice(i, 1);
      }
    }

    triggerStageClear() {
      this.state = 'STAGE_CLEAR';
      this.stateTimer = 140;
      this.addScore(this.bonus, 200, 120);
      global.DKAudio.playStageClear();
    }

    triggerLevelComplete() {
      this.state = 'LEVEL_COMPLETE';
      this.stateTimer = 210;
      this.barrels = [];
      this.fireballs = [];
      this.dk.falling = true;
      this.pauline.rescued = true;
      this.pauline.x = 152;
      this.pauline.y = 110;
      this.player.x = 264;
      this.player.y = 112;
      this.player.dir = -1;
      this.player.hammerTimer = 0;
      this.addScore(this.bonus, 210, 90);
      global.DKAudio.playLevelComplete();
    }

    killPlayer() {
      if (this.player.dead) return;
      this.player.dead = true;
      this.player.deadTimer = 95;
      this.player.hammerTimer = 0;
      this.state = 'DYING';
      global.DKAudio.playDeath();
    }

    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
      return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    // =============================================================
    // RENDERING (1981 아케이드 CRT 화면 렌더링)
    // =============================================================
    render() {
      const ctx = this.ctx;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      this.renderArcadeHud(ctx);

      if (this.state === 'TITLE') {
        this.renderTitleScreen(ctx);
        return;
      }

      if (this.state === 'HOW_HIGH') {
        this.renderHowHighScreen(ctx);
        return;
      }

      this.renderStageGeometry(ctx);

      // 아이템 렌더링
      this.stage.items.forEach((item) => global.DKSprites.drawItem(ctx, item));

      // 폴린 & 동키콩 렌더링
      global.DKSprites.drawPauline(ctx, this.pauline, this.tick);
      global.DKSprites.drawDonkeyKong(ctx, this.dk, this.tick);

      // 장애물 및 적 렌더링
      const hammerActive = this.player.hammerTimer > 0;
      this.barrels.forEach((b) => global.DKSprites.drawBarrel(ctx, b));
      this.fireballs.forEach((fb) => global.DKSprites.drawFireball(ctx, fb, this.tick, hammerActive));
      this.cementPans.forEach((pan) => global.DKSprites.drawCementPan(ctx, pan, this.tick));
      this.springs.forEach((sp) => global.DKSprites.drawSpring(ctx, sp));

      // 점프맨 렌더링
      global.DKSprites.drawJumpman(ctx, this.player, this.tick);

      // 스테이지 클리어 / 100m 완료 하트 연출
      if (this.state === 'STAGE_CLEAR') {
        const broken = this.stateTimer < 75;
        global.DKSprites.drawHeart(ctx, 216, 56, broken);
      } else if (this.state === 'LEVEL_COMPLETE') {
        global.DKSprites.drawHeart(ctx, 216, 94, false);
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CONGRATULATIONS! LEVEL CLEAR!', CANVAS_W / 2, 260);
      }

      // 타격 스파크 및 플로팅 점수
      ctx.fillStyle = '#ffff00';
      this.sparks.forEach((sp) => {
        ctx.fillRect(sp.x, sp.y, 3, 3);
      });

      ctx.font = 'bold 9px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      this.floatingTexts.forEach((ft) => {
        ctx.fillStyle = ft.timer % 4 < 2 ? '#00ffff' : '#ffff00';
        ctx.fillText(ft.text, ft.x, ft.y);
      });

      // 일시정지 / 게임오버 오버레이
      if (this.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 210, CANVAS_W, 70);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_W / 2, 252);
      } else if (this.state === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(64, 195, CANVAS_W - 128, 110);
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 2;
        ctx.strokeRect(64, 195, CANVAS_W - 128, 110);

        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W / 2, 238);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.fillText('PRESS ENTER / SPACE TO RETRY', CANVAS_W / 2, 276);
      }
    }

    renderArcadeHud(ctx) {
      ctx.save();
      ctx.font = 'bold 11px "Press Start 2P", monospace';

      // 상단 1UP / HIGH SCORE
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff2222';
      ctx.fillText('1UP', 24, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(this.score).padStart(6, '0'), 18, 34);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2222';
      ctx.fillText('HIGH SCORE', CANVAS_W / 2, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(this.highScore).padStart(6, '0'), CANVAS_W / 2, 34);

      // 잔기(마리오 미니 아이콘) & 레벨 표시 (L=01)
      for (let i = 0; i < Math.min(5, this.lives); i++) {
        const lx = 20 + i * 14;
        const ly = 42;
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(lx, ly, 8, 4);
        ctx.fillStyle = '#f8b878';
        ctx.fillRect(lx + 1, ly + 4, 6, 4);
        ctx.fillStyle = '#2844ff';
        ctx.fillRect(lx, ly + 8, 8, 4);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = '#2868ff';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.fillText(`L=${String(this.level).padStart(2, '0')} (${this.stage ? this.stage.heightLabel : '25m'})`, CANVAS_W - 140, 50);

      // 우측 상단 BONUS 타이머 박스 (오리지널 아케이드 스타일)
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 2;
      ctx.strokeRect(CANVAS_W - 118, 12, 100, 38);
      ctx.fillStyle = '#ff2266';
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px "Press Start 2P", monospace';
      ctx.fillText('BONUS', CANVAS_W - 68, 25);
      ctx.fillStyle = this.bonus <= 1000 && Math.floor(this.tick / 10) % 2 === 0 ? '#ff2222' : '#00ffff';
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillText(String(this.bonus).padStart(4, '0'), CANVAS_W - 68, 43);

      ctx.restore();
    }

    renderStageGeometry(ctx) {
      ctx.save();

      // 1) 75m 엘리베이터 수직 케이블 라인 먼저 렌더링
      if (this.stageNum === 3) {
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        [123, 301].forEach((sx) => {
          ctx.beginPath();
          ctx.moveTo(sx, 134);
          ctx.lineTo(sx, 482);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // 2) 사다리(Ladders) 렌더링
      this.stage.ladders.forEach((lad) => {
        ctx.fillStyle = lad.isGoalLadder ? '#00ffff' : '#00b8e8';
        const lx = lad.x - 6;
        const w = 12;

        if (lad.broken) {
          // 끊어진 사다리: 상단 일부와 하단 일부만 그림
          ctx.fillRect(lx, lad.y1, 2, 14);
          ctx.fillRect(lx + w - 2, lad.y1, 2, 14);
          ctx.fillRect(lx, lad.y1 + 6, w, 2);

          ctx.fillRect(lx, lad.y2 - 18, 2, 18);
          ctx.fillRect(lx + w - 2, lad.y2 - 18, 2, 18);
          ctx.fillRect(lx, lad.y2 - 14, w, 2);
          ctx.fillRect(lx, lad.y2 - 6, w, 2);
        } else {
          ctx.fillRect(lx, lad.y1, 2, lad.y2 - lad.y1);
          ctx.fillRect(lx + w - 2, lad.y1, 2, lad.y2 - lad.y1);
          for (let ry = lad.y1 + 5; ry < lad.y2 - 2; ry += 7) {
            ctx.fillRect(lx, ry, w, 2);
          }
        }
      });

      // 3) 철골(Girders) 트러스 구조 렌더링
      this.stage.girders.forEach((g) => {
        // 100m 레벨 완료 시 중앙 철골 붕괴 연출
        if (this.state === 'LEVEL_COMPLETE' && g.id >= 1 && g.id <= 4) {
          this.drawGirderSegment(ctx, g.x1, g.y1, 130, g.y1, g.color, 0);
          this.drawGirderSegment(ctx, 318, g.y1, g.x2, g.y2, g.color, 0);
          return;
        }
        this.drawGirderSegment(ctx, g.x1, g.y1, g.x2, g.y2, g.color, g.conveyor || 0);
      });

      // 4) 100m 다리 연결 볼트(리벳) 8개 및 다리 개폐 모션 렌더링
      if (this.stageNum === 4) {
        this.stage.rivets.forEach((r) => {
          global.DKSprites.drawBridgeRivet(ctx, r, this.tick);
        });
      }

      // 5) 75m 엘리베이터 발판 렌더링
      this.stage.elevators.forEach((el) => {
        ctx.fillStyle = '#f8b800';
        ctx.fillRect(el.x, el.y, el.w, el.h);
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(el.x + 2, el.y + 2, el.w - 4, 4);
      });

      // 6) 25m 좌측 하단 OIL 드럼통 렌더링
      if (this.stage.oilDrum) {
        global.DKSprites.drawOilDrum(ctx, this.stage.oilDrum.x, this.stage.oilDrum.y, this.stage.oilDrum.lit, this.tick);
      }

      // 7) 50m 중앙 대형 화염 구덩이(활활 타오르는 불꽃) 렌더링
      if (this.stage.firePot) {
        global.DKSprites.drawFirePit(ctx, this.stage.firePot, this.tick);
      }

      ctx.restore();
    }

    drawGirderSegment(ctx, x1, y1, x2, y2, color, conveyorSpeed) {
      const steps = Math.max(1, Math.floor((x2 - x1) / 8));
      for (let i = 0; i < steps; i++) {
        const sx = x1 + i * 8;
        const t = i / steps;
        const sy = Math.round(y1 + t * (y2 - y1));

        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, 8, 2);
        ctx.fillRect(sx, sy + 7, 8, 2);

        // 지그재그 트러스 또는 컨베이어 롤러 무늬
        ctx.fillStyle = conveyorSpeed !== 0 ? '#ffff00' : '#ff9eb5';
        const offset = conveyorSpeed !== 0 ? Math.floor(this.tick * Math.sign(conveyorSpeed) * 0.3 + i) % 2 : i % 2;
        if (offset === 0) {
          ctx.fillRect(sx + 2, sy + 2, 3, 3);
        } else {
          ctx.fillRect(sx + 2, sy + 4, 3, 3);
        }
      }
    }

    renderTitleScreen(ctx) {
      ctx.save();

      // 클래식 아케이드 타이틀 프레임
      ctx.fillStyle = '#00d8ff';
      ctx.font = 'bold 26px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DONKEY KONG', CANVAS_W / 2, 108);

      ctx.fillStyle = '#ffb800';
      ctx.font = 'bold 9px "Press Start 2P", monospace';
      ctx.fillText('1981 NINTENDO ARCADE CLASSIC (PWA)', CANVAS_W / 2, 132);

      // 중앙 시그니처 일러스트 (동키콩 + 폴린 + 점프맨)
      this.drawGirderSegment(ctx, 88, 236, 360, 236, '#d82848', 0);
      global.DKSprites.drawDonkeyKong(ctx, { x: 196, y: 192, w: 56, h: 44, pose: 'roar' }, this.tick);
      global.DKSprites.drawPauline(ctx, { x: 136, y: 210, rescued: false }, this.tick);
      global.DKSprites.drawJumpman(
        ctx,
        { x: 300, y: 212, w: 16, h: 24, dir: -1, onGround: true, animFrame: this.tick * 0.1, hammerTimer: 100 },
        this.tick
      );

      // 4대 스테이지 안내
      const stagesInfo = [
        'STAGE 1 :  25m  GIRDERS & OIL DRUM',
        'STAGE 2 :  50m  CONVEYOR BELTS',
        'STAGE 3 :  75m  ELEVATORS & SPRINGS',
        'STAGE 4 : 100m  8 YELLOW RIVETS'
      ];
      ctx.font = 'bold 9px "Press Start 2P", monospace';
      stagesInfo.forEach((line, idx) => {
        ctx.fillStyle = idx + 1 === this.stageNum ? '#ffff00' : '#ffffff';
        ctx.fillText(line, CANVAS_W / 2, 286 + idx * 24);
      });

      // 깜빡이는 시작 안내
      if (Math.floor(this.tick / 25) % 2 === 0) {
        ctx.fillStyle = '#ff2266';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillText('PUSH START (ENTER / SPACE)', CANVAS_W / 2, 416);
      }

      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.fillText('KEYS 1-4: INSTANT STAGE WARP', CANVAS_W / 2, 456);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('© 1981 NINTENDO / NAMUWIKI TRIBUTE CLONE', CANVAS_W / 2, 484);

      ctx.restore();
    }

    /**
     * 원작 시그니처 화면: "HOW HIGH CAN YOU GET?" (25m / 50m / 75m / 100m 높이 표시)
     */
    renderHowHighScreen(ctx) {
      ctx.save();

      const heights = ['25m', '50m', '75m', '100m'];
      for (let i = 0; i < this.stageNum; i++) {
        const rowY = 360 - i * 74;
        this.drawGirderSegment(ctx, 112, rowY + 44, 336, rowY + 44, '#d82848', 0);
        global.DKSprites.drawDonkeyKong(ctx, { x: 196, y: rowY, w: 56, h: 44, pose: 'idle' }, this.tick);

        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(heights[i], 102, rowY + 32);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOW HIGH CAN YOU GET ?', CANVAS_W / 2, 464);

      ctx.restore();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    global.DKGame = new DonkeyKongGame();
  });
})(window);
