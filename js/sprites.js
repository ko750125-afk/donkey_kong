/**
 * Donkey Kong (1981) Arcade Clone — Procedural Pixel-Art Sprite Renderer
 * 나무위키 고증 반영:
 * - 점프맨(초기 마리오): 파란 셔츠(#2038ec) + 빨간 멜빵/모자(#ff1a1a) 반대 배색
 * - 클래식 동키콩, 레이디(폴린), 나무통, 휘발유통(파란 통), 방해꾼 벌레(불씨), 시멘트, 스프링, 해머, 소지품
 */
(function (global) {
  'use strict';

  const DKSprites = {
    /**
     * 점프맨(초기 마리오) 렌더링
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} player
     * @param {number} tick
     */
    drawJumpman(ctx, player, tick) {
      ctx.save();
      const cx = Math.round(player.x + player.w / 2);
      const cy = Math.round(player.y + player.h / 2);
      ctx.translate(cx, cy);

      if (player.dead) {
        // 사망 시 회전 연출 후 기절
        if (player.deadTimer > 45) {
          const angle = Math.floor((player.deadTimer - 45) / 5) * (Math.PI / 2);
          ctx.rotate(angle);
        } else {
          // 링(헤일로) 표시
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, -14, 7, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (player.dir < 0 && !player.climbing) {
        ctx.scale(-1, 1);
      }

      const ox = -10;
      const oy = -12;

      // 색상 팔레트 (1981 아케이드 고증: 파란 셔츠 + 빨간 멜빵)
      const RED = '#ff1d1d';    // 모자 & 멜빵바지
      const BLUE = '#2844ff';   // 셔츠 & 신발 & 구레나룻
      const SKIN = '#f8b878';   // 피부

      if (player.climbing) {
        // 사다리 등반 뒷모습 (좌우 교차 애니메이션)
        const step = Math.floor(player.animFrame) % 2;
        if (step === 1) ctx.scale(-1, 1);

        // 모자
        ctx.fillStyle = RED;
        ctx.fillRect(ox + 4, oy + 0, 12, 4);
        // 머리 뒷부분
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 4, oy + 4, 12, 4);
        // 파란 셔츠 & 팔 (한쪽 팔 올림)
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 1, oy + 5, 4, 6);
        ctx.fillRect(ox + 15, oy + 8, 4, 6);
        ctx.fillRect(ox + 5, oy + 8, 10, 6);
        // 손
        ctx.fillStyle = SKIN;
        ctx.fillRect(ox + 1, oy + 2, 4, 3);
        ctx.fillRect(ox + 15, oy + 13, 4, 3);
        // 빨간 멜빵바지
        ctx.fillStyle = RED;
        ctx.fillRect(ox + 6, oy + 8, 2, 10);
        ctx.fillRect(ox + 12, oy + 8, 2, 10);
        ctx.fillRect(ox + 5, oy + 13, 10, 5);
        // 다리 교차
        ctx.fillRect(ox + 4, oy + 18, 5, 3);
        ctx.fillRect(ox + 11, oy + 16, 5, 3);
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 3, oy + 21, 6, 3);
        ctx.fillRect(ox + 11, oy + 19, 6, 3);

        ctx.restore();
        return;
      }

      // 1. 모자 (빨강)
      ctx.fillStyle = RED;
      ctx.fillRect(ox + 4, oy + 0, 11, 3);
      ctx.fillRect(ox + 3, oy + 2, 14, 2);

      // 2. 얼굴 & 코 & 수염 (피부색 + 파란 수염/머리카락)
      ctx.fillStyle = SKIN;
      ctx.fillRect(ox + 5, oy + 4, 10, 6);
      ctx.fillRect(ox + 14, oy + 5, 4, 3); // 큰 코
      ctx.fillStyle = BLUE;
      ctx.fillRect(ox + 3, oy + 4, 3, 5);  // 뒷머리
      ctx.fillRect(ox + 11, oy + 5, 2, 2); // 눈
      ctx.fillRect(ox + 10, oy + 8, 6, 2); // 콧수염

      // 3. 상의 (파란 셔츠) + 빨간 멜빵바지
      ctx.fillStyle = BLUE;
      ctx.fillRect(ox + 3, oy + 10, 13, 7);
      ctx.fillStyle = RED;
      ctx.fillRect(ox + 7, oy + 10, 3, 8); // 멜빵 끈
      ctx.fillRect(ox + 5, oy + 14, 10, 5); // 멜빵 바지통

      // 팔 & 손
      const walkStep = player.onGround ? Math.floor(player.animFrame) % 3 : 2;
      ctx.fillStyle = SKIN;
      if (!player.onGround) {
        // 점프 자세
        ctx.fillRect(ox + 14, oy + 8, 4, 4);
        ctx.fillRect(ox + 1, oy + 12, 3, 4);
      } else if (walkStep === 1) {
        ctx.fillRect(ox + 14, oy + 11, 4, 4);
        ctx.fillRect(ox + 2, oy + 11, 3, 4);
      } else {
        ctx.fillRect(ox + 8, oy + 12, 4, 4);
      }

      // 4. 다리 & 파란 신발
      if (!player.onGround) {
        ctx.fillStyle = RED;
        ctx.fillRect(ox + 2, oy + 17, 6, 4);
        ctx.fillRect(ox + 11, oy + 16, 6, 4);
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 0, oy + 20, 6, 3);
        ctx.fillRect(ox + 13, oy + 19, 6, 3);
      } else if (walkStep === 1) {
        ctx.fillStyle = RED;
        ctx.fillRect(ox + 3, oy + 18, 5, 3);
        ctx.fillRect(ox + 11, oy + 18, 5, 3);
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 2, oy + 21, 6, 3);
        ctx.fillRect(ox + 12, oy + 21, 6, 3);
      } else if (walkStep === 2) {
        ctx.fillStyle = RED;
        ctx.fillRect(ox + 5, oy + 18, 8, 3);
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 4, oy + 21, 10, 3);
      } else {
        ctx.fillStyle = RED;
        ctx.fillRect(ox + 5, oy + 18, 4, 3);
        ctx.fillRect(ox + 10, oy + 18, 4, 3);
        ctx.fillStyle = BLUE;
        ctx.fillRect(ox + 4, oy + 21, 5, 3);
        ctx.fillRect(ox + 10, oy + 21, 6, 3);
      }

      // 5. 무적 해머 착용 상태 렌더링 (나무위키 고증: 머리 위 <-> 정면 강타 교차!)
      if (player.hammerTimer > 0 && !player.dead) {
        const swingDown = Math.floor(tick / 5) % 2 === 0;
        const flashColor = player.hammerTimer < 120 && Math.floor(tick / 4) % 2 === 0
          ? '#ff3333'
          : '#e46800';

        ctx.fillStyle = '#f8d870'; // 자루
        if (swingDown) {
          // 정면 타격
          ctx.fillRect(ox + 14, oy + 11, 14, 3);
          ctx.fillStyle = flashColor;
          ctx.fillRect(ox + 24, oy + 4, 10, 16);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox + 25, oy + 6, 8, 2);
          ctx.fillRect(ox + 25, oy + 16, 8, 2);
        } else {
          // 머리 위 들어올림
          ctx.fillRect(ox + 8, oy - 12, 3, 14);
          ctx.fillStyle = flashColor;
          ctx.fillRect(ox + 2, oy - 20, 16, 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox + 4, oy - 19, 2, 8);
          ctx.fillRect(ox + 14, oy - 19, 2, 8);
        }
      }

      ctx.restore();
    },

    /**
     * 클래식 동키콩(크랭키콩) 렌더링
     */
    drawDonkeyKong(ctx, dk, tick) {
      ctx.save();
      const cx = Math.round(dk.x + dk.w / 2);
      const cy = Math.round(dk.y + dk.h / 2);
      ctx.translate(cx, cy);

      if (dk.falling) {
        // 100m 스테이지 나사 8개 전부 제거 시 거꾸로 추락하는 연출!
        ctx.scale(1, -1);
      }

      const ox = -28;
      const oy = -22;
      const FUR = '#a84400';
      const SKIN = '#f8b878';

      // 귀 & 머리
      ctx.fillStyle = FUR;
      ctx.fillRect(ox + 18, oy + 0, 20, 5);
      ctx.fillRect(ox + 14, oy + 4, 28, 12);
      ctx.fillStyle = SKIN;
      ctx.fillRect(ox + 10, oy + 7, 4, 6);
      ctx.fillRect(ox + 42, oy + 7, 4, 6);

      // 얼굴 & 눈 & 특유의 하얀 이빨 웃음
      ctx.fillRect(ox + 16, oy + 6, 24, 10);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ox + 20, oy + 7, 4, 4);
      ctx.fillRect(ox + 32, oy + 7, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + 19, oy + 12, 18, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ox + 24, oy + 12, 2, 3);
      ctx.fillRect(ox + 30, oy + 12, 2, 3);

      // 몸통 & 가슴팍
      ctx.fillStyle = FUR;
      ctx.fillRect(ox + 10, oy + 16, 36, 18);
      ctx.fillStyle = SKIN;
      ctx.fillRect(ox + 18, oy + 18, 20, 13);
      ctx.fillStyle = FUR;
      ctx.fillRect(ox + 27, oy + 18, 2, 11);

      // 팔 동작 (state: 'idle' | 'roar' | 'left' | 'right' | 'hold')
      const beat = Math.floor(tick / 12) % 2;
      ctx.fillStyle = FUR;
      if (dk.pose === 'roar') {
        // 가슴 치며 포효
        ctx.fillRect(ox + 2, oy + (beat ? 6 : 14), 10, 14);
        ctx.fillRect(ox + 44, oy + (beat ? 14 : 6), 10, 14);
        ctx.fillStyle = SKIN;
        ctx.fillRect(ox + 2, oy + (beat ? 3 : 26), 8, 4);
        ctx.fillRect(ox + 46, oy + (beat ? 26 : 3), 8, 4);
      } else if (dk.pose === 'left') {
        ctx.fillRect(ox + 0, oy + 14, 12, 12);
        ctx.fillRect(ox + 42, oy + 16, 10, 12);
      } else if (dk.pose === 'right') {
        ctx.fillRect(ox + 4, oy + 16, 10, 12);
        ctx.fillRect(ox + 44, oy + 14, 12, 12);
      } else {
        ctx.fillRect(ox + 2, oy + 15, 10, 14);
        ctx.fillRect(ox + 44, oy + 15, 10, 14);
        ctx.fillStyle = SKIN;
        ctx.fillRect(ox + 3, oy + 28, 8, 4);
        ctx.fillRect(ox + 45, oy + 28, 8, 4);
      }

      // 다리 & 발
      ctx.fillStyle = FUR;
      ctx.fillRect(ox + 12, oy + 34, 10, 8);
      ctx.fillRect(ox + 34, oy + 34, 10, 8);
      ctx.fillStyle = SKIN;
      ctx.fillRect(ox + 8, oy + 40, 12, 4);
      ctx.fillRect(ox + 36, oy + 40, 12, 4);

      // 통을 들고 있는 포즈일 때 통 그리기
      if (dk.pose === 'hold') {
        this.drawBarrel(ctx, {
          x: -9,
          y: 2,
          w: 18,
          h: 14,
          isOil: dk.holdingBlue,
          onLadder: true,
          rot: 0
        });
      }

      // 추락 후 기절 상태일 때 머리 위 별/헤일로 표시
      if (dk.knockedOut) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -25, 14, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    },

    /**
     * 레이디(폴린) 및 감금 쇠창살(Iron Cage) 렌더링
     */
    drawPauline(ctx, pauline, tick) {
      ctx.save();
      const x = Math.round(pauline.x);
      const y = Math.round(pauline.y);
      const sway = Math.floor(tick / 18) % 2;

      // 금발/주황 머리카락
      ctx.fillStyle = '#ff9c38';
      ctx.fillRect(x + 4, y + 0, 10, 6);
      ctx.fillRect(x + 2, y + 3, 4, 8);

      // 얼굴
      ctx.fillStyle = '#f8b878';
      ctx.fillRect(x + 6, y + 3, 8, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 11, y + 4, 2, 2);

      // 분홍 드레스
      ctx.fillStyle = '#ff66b2';
      ctx.fillRect(x + 5, y + 9, 8, 6);
      ctx.fillRect(x + 3, y + 15, 12, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 3, y + 14, 12, 2);

      // 팔 흔들기
      ctx.fillStyle = '#f8b878';
      ctx.fillRect(x + 1, y + (sway ? 7 : 10), 3, 4);
      ctx.fillRect(x + 14, y + (sway ? 10 : 7), 3, 4);

      // 구두
      ctx.fillStyle = '#ff1d1d';
      ctx.fillRect(x + 5, y + 23, 3, 3);
      ctx.fillRect(x + 10, y + 23, 3, 3);

      // 쇠창살(Iron Cage) 렌더링 (열쇠 획득 시 위로 스르륵 열리며 사라지는 애니메이션!)
      const openProg = pauline.cageOpenProgress || 0;
      if (!pauline.rescued && openProg < 1) {
        const liftY = Math.round(openProg * 30);
        const cageX = x - 6;
        const cageY = y - 4 - liftY;
        const cageW = 30;
        const cageH = Math.max(4, Math.round(30 * (1 - openProg * 0.85)));

        ctx.globalAlpha = Math.max(0, 1 - openProg * 0.9);
        const barColor = openProg > 0 ? (Math.floor(tick / 3) % 2 ? '#ffd000' : '#00ffff') : '#b8c4dc';
        const frameColor = openProg > 0 ? '#ffffff' : '#6c7a96';

        // 상/하단 철제 프레임
        ctx.fillStyle = frameColor;
        ctx.fillRect(cageX - 1, cageY, cageW + 2, 3);
        ctx.fillRect(cageX - 1, cageY + cageH - 2, cageW + 2, 2);

        // 수직 쇠창살 기둥 5개
        ctx.fillStyle = barColor;
        for (let bx = 0; bx <= cageW; bx += 7) {
          ctx.fillRect(cageX + bx, cageY + 2, 2, cageH - 3);
        }

        // 잠금 표시 (열리기 전 전면 황금 자물쇠)
        if (openProg === 0) {
          ctx.fillStyle = '#ffd000';
          ctx.fillRect(cageX + cageW - 4, cageY + 12, 6, 6);
          ctx.fillStyle = '#000000';
          ctx.fillRect(cageX + cageW - 2, cageY + 14, 2, 3);
        }
        ctx.globalAlpha = 1;
      }

      // 상태 말풍선 (열쇠 없이 접근 시 NEED KEY! 강조, 평소엔 HELP!)
      if (!pauline.rescued) {
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        if (pauline.needKeyWarnTimer && pauline.needKeyWarnTimer > 0) {
          ctx.fillStyle = Math.floor(tick / 6) % 2 === 0 ? '#ffff00' : '#ff2244';
          ctx.fillText('NEED KEY!', x + 26, y + 6);
        } else if (Math.floor(tick / 35) % 2 === 0) {
          ctx.fillStyle = pauline.cageUnlocked ? '#00ff88' : '#00ffff';
          ctx.fillText(pauline.cageUnlocked ? 'FREE!' : 'HELP!', x + 28, y + 8);
        }
      }

      ctx.restore();
    },

    /**
     * 나무통 & 휘발유통(파란 통) 렌더링
     */
    drawBarrel(ctx, b) {
      ctx.save();
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      const mainColor = b.isOil ? '#2048ff' : '#e46800';
      const rimColor = b.isOil ? '#ff3355' : '#00d8ff';
      const innerColor = b.isOil ? '#78b8ff' : '#f8b878';

      if (b.onLadder || b.throwDirect) {
        // 사다리를 타고 내려올 때 또는 정면 투척 시 넓은 통 모양
        ctx.fillStyle = mainColor;
        ctx.fillRect(x - 2, y, 18, 12);
        ctx.fillStyle = rimColor;
        ctx.fillRect(x - 2, y + 2, 18, 2);
        ctx.fillRect(x - 2, y + 8, 18, 2);
        ctx.fillStyle = innerColor;
        const stripe = Math.floor(b.rot || 0) % 2;
        ctx.fillRect(x + (stripe ? 2 : 6), y + 5, 6, 2);
      } else {
        // 철골 위를 굴러갈 때 원형 단면 회전
        ctx.fillStyle = mainColor;
        ctx.fillRect(x + 2, y, 10, 14);
        ctx.fillRect(x, y + 2, 14, 10);
        ctx.fillStyle = rimColor;
        ctx.fillRect(x + 2, y + 2, 10, 10);
        ctx.fillStyle = innerColor;
        ctx.fillRect(x + 4, y + 4, 6, 6);

        // 회전 도트 표시
        ctx.fillStyle = '#000000';
        const r = Math.floor(b.rot || 0) % 4;
        if (r === 0) ctx.fillRect(x + 6, y + 4, 2, 3);
        if (r === 1) ctx.fillRect(x + 7, y + 6, 3, 2);
        if (r === 2) ctx.fillRect(x + 6, y + 7, 2, 3);
        if (r === 3) ctx.fillRect(x + 4, y + 6, 3, 2);
      }
      ctx.restore();
    },

    /**
     * 25m 스테이지 좌측 하단 OIL 드럼통 렌더링
     */
    drawOilDrum(ctx, x, y, lit, tick) {
      ctx.save();
      // 파란 드럼통 본체
      ctx.fillStyle = '#1838d8';
      ctx.fillRect(x, y, 22, 26);
      ctx.fillStyle = '#00e8ff';
      ctx.fillRect(x - 1, y + 2, 24, 3);
      ctx.fillRect(x - 1, y + 21, 24, 3);

      // OIL 텍스트
      ctx.fillStyle = '#ff3838';
      ctx.font = 'bold 7px "Press Start 2P", monospace';
      ctx.fillText('OIL', x + 1, y + 16);

      // 불꽃 점화 상태
      if (lit) {
        const f = Math.floor(tick / 6) % 2;
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(x + 3, y - (f ? 10 : 7), 16, f ? 10 : 7);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(x + 6, y - (f ? 7 : 11), 10, f ? 7 : 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 9, y - 4, 4, 4);
      }
      ctx.restore();
    },

    /**
     * 방해꾼 벌레(불씨) & 100m 큰 불꽃 렌더링
     */
    drawFireball(ctx, fb, tick, hammerActive) {
      ctx.save();
      const x = Math.round(fb.x);
      const y = Math.round(fb.y);
      const f = Math.floor(tick / 6) % 2;
      const isBig = fb.isBig; // 100m 스테이지 큰 불꽃

      const outer = hammerActive ? '#2048ff' : '#ff2200';
      const inner = hammerActive ? '#00ffff' : '#ffbb00';

      if (isBig) {
        ctx.fillStyle = outer;
        ctx.fillRect(x, y + 2, 16, 14);
        ctx.fillRect(x + (f ? 2 : 5), y - 3, 5, 6);
        ctx.fillRect(x + (f ? 9 : 11), y - 2, 4, 5);
        ctx.fillStyle = inner;
        ctx.fillRect(x + 3, y + 5, 10, 9);
      } else {
        ctx.fillStyle = outer;
        ctx.fillRect(x + 1, y + 3, 12, 10);
        ctx.fillRect(x + (f ? 2 : 7), y, 5, 4);
        ctx.fillStyle = inner;
        ctx.fillRect(x + 3, y + 5, 8, 7);
      }

      // 눈동자
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 3, y + 6, 3, 3);
      ctx.fillRect(x + 8, y + 6, 3, 3);
      ctx.fillStyle = '#000000';
      const look = fb.vx >= 0 ? 1 : 0;
      ctx.fillRect(x + 3 + look, y + 7, 2, 2);
      ctx.fillRect(x + 8 + look, y + 7, 2, 2);

      ctx.restore();
    },

    /**
     * 50m 스테이지 시멘트(파이 팬) 렌더링
     */
    drawCementPan(ctx, pan) {
      ctx.save();
      const x = Math.round(pan.x);
      const y = Math.round(pan.y);
      // 시멘트 용기(사다리꼴)
      ctx.fillStyle = '#ff2266';
      ctx.fillRect(x, y + 4, 16, 6);
      ctx.fillRect(x + 2, y + 10, 12, 3);
      // 담긴 노란/주황 시멘트
      ctx.fillStyle = '#ffb800';
      ctx.fillRect(x + 2, y + 1, 12, 4);
      ctx.restore();
    },

    /**
     * 75m 스테이지 스프링 장애물 렌더링
     */
    drawSpring(ctx, sp) {
      ctx.save();
      const x = Math.round(sp.x);
      const y = Math.round(sp.y);
      const stretched = sp.vy < 0 || !sp.compressed;

      ctx.fillStyle = '#ff2244';
      ctx.fillRect(x + 1, y, 12, 3);
      ctx.fillRect(x + 1, y + (stretched ? 13 : 9), 12, 3);

      ctx.strokeStyle = '#00e8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (stretched) {
        ctx.moveTo(x + 2, y + 3);
        ctx.lineTo(x + 12, y + 6);
        ctx.lineTo(x + 2, y + 9);
        ctx.lineTo(x + 12, y + 13);
      } else {
        ctx.moveTo(x + 2, y + 3);
        ctx.lineTo(x + 12, y + 5);
        ctx.lineTo(x + 2, y + 7);
        ctx.lineTo(x + 12, y + 9);
      }
      ctx.stroke();
      ctx.restore();
    },

    /**
     * 무적 해머 아이템 & 폴린 소지품(양산, 모자, 핸드백) 렌더링
     */
    drawItem(ctx, item) {
      if (item.collected) return;
      ctx.save();
      const x = Math.round(item.x);
      const y = Math.round(item.y);

      if (item.type === 'hammer') {
        // 무적 해머
        ctx.fillStyle = '#f8d870';
        ctx.fillRect(x + 6, y + 6, 3, 12);
        ctx.fillStyle = '#e46800';
        ctx.fillRect(x + 1, y, 13, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y + 1, 2, 5);
        ctx.fillRect(x + 11, y + 1, 2, 5);
      } else if (item.type === 'parasol') {
        // 폴린의 양산
        ctx.fillStyle = '#ff55b8';
        ctx.beginPath();
        ctx.moveTo(x + 8, y);
        ctx.lineTo(x + 16, y + 9);
        ctx.lineTo(x, y + 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 9, 2, 8);
        ctx.fillRect(x + 5, y + 15, 4, 2);
      } else if (item.type === 'hat') {
        // 폴린의 모자
        ctx.fillStyle = '#ff55b8';
        ctx.fillRect(x + 3, y + 3, 10, 5);
        ctx.fillRect(x, y + 8, 16, 3);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(x + 3, y + 6, 10, 2);
      } else if (item.type === 'key' || item.type === 'purse') {
        // 폴린의 쇠창살을 여는 직관적인 황금 열쇠(Golden Key)
        ctx.fillStyle = '#ffd000';
        // 왼쪽 열쇠 손잡이 고리 (속이 빈 원형/사각 링)
        ctx.fillRect(x, y + 3, 7, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2, y + 5, 3, 4);
        // 열쇠 몸통 기둥 & 우측 열쇠 날 2개
        ctx.fillStyle = '#ffd000';
        ctx.fillRect(x + 7, y + 5, 11, 3);
        ctx.fillRect(x + 12, y + 8, 2, 4);
        ctx.fillRect(x + 15, y + 8, 2, 5);
        // 하이라이트 반짝임
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 3, 5, 1);
        ctx.fillRect(x + 8, y + 5, 8, 1);
      }
      ctx.restore();
    },

    /**
     * 하트(폴린 재회/납치 연출) 렌더링
     */
    drawHeart(ctx, x, y, broken = false) {
      ctx.save();
      ctx.fillStyle = '#ff2266';
      ctx.fillRect(x + 2, y, 5, 4);
      ctx.fillRect(x + 9, y, 5, 4);
      ctx.fillRect(x, y + 3, 16, 6);
      ctx.fillRect(x + 2, y + 9, 12, 3);
      ctx.fillRect(x + 5, y + 12, 6, 3);
      ctx.fillRect(x + 7, y + 15, 2, 2);

      if (broken) {
        ctx.strokeStyle = '#07070c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, y);
        ctx.lineTo(x + 6, y + 6);
        ctx.lineTo(x + 10, y + 11);
        ctx.lineTo(x + 7, y + 17);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  global.DKSprites = DKSprites;
})(window);
