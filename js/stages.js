/**
 * Donkey Kong (1981) Arcade Clone — 4 Classic Arcade Stages Data
 * - Stage 1 (25m): 철골 공사장 (Girders & Barrels & Oil Drum)
 * - Stage 2 (50m): 컨베이어 벨트 (Cement/Pie Factory - 패미컴 미수록 아케이드 오리지널 복원)
 * - Stage 3 (75m): 엘리베이터와 스프링 (Elevators & Bouncing Springs)
 * - Stage 4 (100m): 철근 나사(리벳) 8개 뽑기 (Rivets & Final Collapse)
 */
(function (global) {
  'use strict';

  /**
   * 선분(철골)의 특정 x 위치에서의 상단 표면 y 좌표를 선형 보간으로 계산
   */
  function getGirderYAtX(g, x) {
    if (g.x2 === g.x1) return g.y1;
    const t = Math.max(0, Math.min(1, (x - g.x1) / (g.x2 - g.x1)));
    return g.y1 + t * (g.y2 - g.y1);
  }

  function createStageData(stageNum) {
    // -------------------------------------------------------------
    // STAGE 1: 25m (철골 공사장)
    // -------------------------------------------------------------
    if (stageNum === 1) {
      const girders = [
        // Tier 0 (바닥층: 우측으로 완만히 상승)
        { id: 0, x1: 16, y1: 482, x2: 432, y2: 470, color: '#d82848', rollDir: -1 },
        // Tier 1 (우->좌 하강 경사)
        { id: 1, x1: 16, y1: 416, x2: 404, y2: 400, color: '#d82848', rollDir: -1 },
        // Tier 2 (좌->우 하강 경사)
        { id: 2, x1: 44, y1: 332, x2: 432, y2: 348, color: '#d82848', rollDir: 1 },
        // Tier 3 (우->좌 하강 경사)
        { id: 3, x1: 16, y1: 278, x2: 404, y2: 262, color: '#d82848', rollDir: -1 },
        // Tier 4 (좌->우 하강 경사)
        { id: 4, x1: 44, y1: 194, x2: 432, y2: 210, color: '#d82848', rollDir: 1 },
        // Tier 5 (동키콩 층: 좌측 평탄 + 우측 하강 경사)
        { id: 5, x1: 16, y1: 132, x2: 404, y2: 142, color: '#d82848', rollDir: 1 },
        // Tier 6 (레이디 폴린 최상단 플랫폼)
        { id: 6, x1: 172, y1: 88, x2: 272, y2: 88, color: '#d82848', rollDir: 0, isGoalPlatform: true }
      ];

      const ladders = [
        // Tier 0 -> 1
        { x: 368, y1: 401, y2: 472, broken: false },
        { x: 184, y1: 408, y2: 477, broken: true },
        // Tier 1 -> 2
        { x: 72, y1: 333, y2: 413, broken: false },
        { x: 204, y1: 338, y2: 408, broken: false },
        { x: 340, y1: 344, y2: 402, broken: true },
        // Tier 2 -> 3
        { x: 368, y1: 263, y2: 345, broken: false },
        { x: 244, y1: 268, y2: 340, broken: false },
        { x: 116, y1: 274, y2: 335, broken: true },
        // Tier 3 -> 4
        { x: 72, y1: 195, y2: 275, broken: false },
        { x: 168, y1: 199, y2: 271, broken: false },
        { x: 344, y1: 206, y2: 264, broken: true },
        // Tier 4 -> 5
        { x: 368, y1: 141, y2: 207, broken: false },
        { x: 192, y1: 136, y2: 200, broken: true },
        // Tier 5 -> 6 (폴린 구출 사다리 + 장식 사다리)
        { x: 254, y1: 88, y2: 138, broken: false, isGoalLadder: true },
        { x: 140, y1: 88, y2: 132, broken: false, decorative: true },
        { x: 160, y1: 88, y2: 132, broken: false, decorative: true }
      ];

      const items = [
        { type: 'hammer', x: 64, y: 366, w: 16, h: 18, collected: false },
        { type: 'hammer', x: 316, y: 224, w: 16, h: 18, collected: false },
        { type: 'hat', x: 380, y: 326, w: 16, h: 14, score: 300, collected: false },
        { type: 'key', x: 120, y: 174, w: 16, h: 16, score: 500, collected: false }
      ];

      return {
        stageNum: 1,
        heightLabel: '25m',
        title: 'STAGE 1 - 25m (GIRDERS)',
        playerSpawn: { x: 66, y: 454 },
        dkSpawn: { x: 48, y: 88 },
        paulineSpawn: { x: 192, y: 62 },
        oilDrum: { x: 26, y: 455, lit: false },
        girders,
        ladders,
        items,
        elevators: [],
        rivets: []
      };
    }

    // -------------------------------------------------------------
    // STAGE 2: 50m (컨베이어 벨트 / 시멘트 공장)
    // -------------------------------------------------------------
    if (stageNum === 2) {
      const girders = [
        // Tier 0 (바닥층)
        { id: 0, x1: 16, y1: 480, x2: 432, y2: 480, color: '#d82848', conveyor: 0 },
        // Tier 1 (1층 전체 컨베이어 벨트)
        { id: 1, x1: 16, y1: 398, x2: 432, y2: 398, color: '#f8a028', conveyor: 0.65 },
        // Tier 2 좌/우 분리 컨베이어 벨트 (가운데 시멘트 화로로 모임!)
        { id: 2, x1: 16, y1: 312, x2: 198, y2: 312, color: '#f8a028', conveyor: 0.7 },
        { id: 3, x1: 250, y1: 312, x2: 432, y2: 312, color: '#f8a028', conveyor: -0.7 },
        // Tier 3 (3층 철골 플랫폼)
        { id: 4, x1: 16, y1: 224, x2: 432, y2: 224, color: '#d82848', conveyor: 0 },
        // Tier 4 (4층 최상단 컨베이어 벨트: 동키콩이 좌우로 이동)
        { id: 5, x1: 16, y1: 136, x2: 432, y2: 136, color: '#f8a028', conveyor: -0.6 },
        // Tier 5 (폴린 플랫폼)
        { id: 6, x1: 172, y1: 88, x2: 272, y2: 88, color: '#d82848', conveyor: 0, isGoalPlatform: true }
      ];

      const ladders = [
        // Tier 0 -> 1
        { x: 56, y1: 398, y2: 480, broken: false },
        { x: 224, y1: 398, y2: 480, broken: false },
        { x: 392, y1: 398, y2: 480, broken: false },
        // Tier 1 -> 2
        { x: 104, y1: 312, y2: 398, broken: false },
        { x: 344, y1: 312, y2: 398, broken: false },
        // Tier 2 -> 3
        { x: 44, y1: 224, y2: 312, broken: false },
        { x: 164, y1: 224, y2: 312, broken: false },
        { x: 284, y1: 224, y2: 312, broken: false },
        { x: 404, y1: 224, y2: 312, broken: false },
        // Tier 3 -> 4 (양 끝 신축 사다리 + 중앙 보조 사다리)
        { x: 36, y1: 136, y2: 224, broken: false, telescopic: true },
        { x: 412, y1: 136, y2: 224, broken: false, telescopic: true },
        { x: 136, y1: 136, y2: 224, broken: false },
        { x: 312, y1: 136, y2: 224, broken: false },
        // Tier 4 -> 5 (폴린 구출 사다리)
        { x: 254, y1: 88, y2: 136, broken: false, isGoalLadder: true }
      ];

      const items = [
        { type: 'hammer', x: 28, y: 270, w: 16, h: 18, collected: false },
        { type: 'hammer', x: 216, y: 182, w: 16, h: 18, collected: false },
        { type: 'parasol', x: 380, y: 204, w: 16, h: 18, score: 300, collected: false },
        { type: 'hat', x: 68, y: 378, w: 16, h: 14, score: 500, collected: false },
        { type: 'key', x: 368, y: 460, w: 16, h: 16, score: 800, collected: false }
      ];

      return {
        stageNum: 2,
        heightLabel: '50m',
        title: 'STAGE 2 - 50m (CONVEYORS)',
        playerSpawn: { x: 84, y: 454 },
        dkSpawn: { x: 196, y: 92 },
        paulineSpawn: { x: 192, y: 62 },
        firePot: { x: 202, y: 294, w: 44, h: 22 },
        girders,
        ladders,
        items,
        elevators: [],
        rivets: []
      };
    }

    // -------------------------------------------------------------
    // STAGE 3: 75m (엘리베이터 & 스프링)
    // -------------------------------------------------------------
    if (stageNum === 3) {
      const girders = [
        // 좌측 시작 플랫폼들
        { id: 0, x1: 16, y1: 478, x2: 88, y2: 478, color: '#d82848' },
        { id: 1, x1: 16, y1: 356, x2: 88, y2: 356, color: '#d82848' },
        { id: 2, x1: 16, y1: 238, x2: 88, y2: 238, color: '#d82848' },
        // 중앙 섬 플랫폼들
        { id: 3, x1: 160, y1: 416, x2: 262, y2: 416, color: '#d82848' },
        { id: 4, x1: 160, y1: 312, x2: 262, y2: 312, color: '#d82848' },
        { id: 5, x1: 160, y1: 208, x2: 262, y2: 208, color: '#d82848' },
        // 우측 타워 플랫폼들 (계단식으로 올라가 최상단으로 연결)
        { id: 6, x1: 340, y1: 456, x2: 432, y2: 456, color: '#d82848' },
        { id: 7, x1: 340, y1: 374, x2: 432, y2: 374, color: '#d82848' },
        { id: 8, x1: 340, y1: 292, x2: 432, y2: 292, color: '#d82848' },
        { id: 9, x1: 340, y1: 210, x2: 432, y2: 210, color: '#d82848' },
        // 최상단 동키콩 철골 (스프링이 튀어 이동한 뒤 우측 샤프트로 낙하)
        { id: 10, x1: 16, y1: 134, x2: 432, y2: 134, color: '#d82848' },
        // 폴린 플랫폼
        { id: 11, x1: 172, y1: 88, x2: 272, y2: 88, color: '#d82848', isGoalPlatform: true }
      ];

      const ladders = [
        // 좌측 사다리
        { x: 36, y1: 356, y2: 478, broken: false },
        { x: 64, y1: 238, y2: 356, broken: false },
        // 중앙 섬 사다리
        { x: 184, y1: 312, y2: 416, broken: false },
        { x: 232, y1: 208, y2: 312, broken: false },
        // 우측 타워 등반 사다리
        { x: 404, y1: 374, y2: 456, broken: false },
        { x: 360, y1: 292, y2: 374, broken: false },
        { x: 404, y1: 210, y2: 292, broken: false },
        { x: 380, y1: 134, y2: 210, broken: false },
        // 폴린 구출 사다리
        { x: 254, y1: 88, y2: 134, broken: false, isGoalLadder: true }
      ];

      // 상하 순환 엘리베이터 발판 6개 (좌측 열: 상승, 우측 열: 하강)
      const elevators = [
        { x: 102, y: 440, w: 42, h: 8, vy: -0.95, minY: 146, maxY: 476, shaftX: 123 },
        { x: 102, y: 330, w: 42, h: 8, vy: -0.95, minY: 146, maxY: 476, shaftX: 123 },
        { x: 102, y: 220, w: 42, h: 8, vy: -0.95, minY: 146, maxY: 476, shaftX: 123 },
        { x: 280, y: 180, w: 42, h: 8, vy: 0.95, minY: 146, maxY: 476, shaftX: 301 },
        { x: 280, y: 290, w: 42, h: 8, vy: 0.95, minY: 146, maxY: 476, shaftX: 301 },
        { x: 280, y: 400, w: 42, h: 8, vy: 0.95, minY: 146, maxY: 476, shaftX: 301 }
      ];

      const items = [
        { type: 'parasol', x: 44, y: 216, w: 16, h: 18, score: 300, collected: false },
        { type: 'hat', x: 204, y: 188, w: 16, h: 14, score: 500, collected: false },
        { type: 'key', x: 356, y: 436, w: 16, h: 16, score: 800, collected: false }
      ];

      return {
        stageNum: 3,
        heightLabel: '75m',
        title: 'STAGE 3 - 75m (ELEVATORS)',
        playerSpawn: { x: 28, y: 452 },
        dkSpawn: { x: 52, y: 90 },
        paulineSpawn: { x: 192, y: 62 },
        girders,
        ladders,
        items,
        elevators,
        rivets: []
      };
    }

    // -------------------------------------------------------------
    // STAGE 4: 100m (철근 나사 8개 뽑기 / 리벳 스테이지)
    // -------------------------------------------------------------
    const girders = [
      // Tier 0 (바닥층)
      { id: 0, x1: 16, y1: 478, x2: 432, y2: 478, color: '#2858ff', tier: 0 },
      // Tier 1
      { id: 1, x1: 28, y1: 392, x2: 420, y2: 392, color: '#2858ff', tier: 1 },
      // Tier 2
      { id: 2, x1: 40, y1: 306, x2: 408, y2: 306, color: '#2858ff', tier: 2 },
      // Tier 3
      { id: 3, x1: 52, y1: 220, x2: 396, y2: 220, color: '#2858ff', tier: 3 },
      // Tier 4 (최상단 동키콩 층)
      { id: 4, x1: 64, y1: 136, x2: 384, y2: 136, color: '#2858ff', tier: 4 },
      // Tier 5 (폴린 플랫폼)
      { id: 5, x1: 172, y1: 88, x2: 276, y2: 88, color: '#ff55b8', tier: 5, isGoalPlatform: true }
    ];

    // 총 8개의 노란 철근 나사(리벳) — 좌측 열(x=136) 4개, 우측 열(x=312) 4개
    const rivets = [
      { id: 0, x: 136, y: 392, girderId: 1, pulled: false },
      { id: 1, x: 312, y: 392, girderId: 1, pulled: false },
      { id: 2, x: 136, y: 306, girderId: 2, pulled: false },
      { id: 3, x: 312, y: 306, girderId: 2, pulled: false },
      { id: 4, x: 136, y: 220, girderId: 3, pulled: false },
      { id: 5, x: 312, y: 220, girderId: 3, pulled: false },
      { id: 6, x: 136, y: 136, girderId: 4, pulled: false },
      { id: 7, x: 312, y: 136, girderId: 4, pulled: false }
    ];

    const ladders = [
      // Tier 0 -> 1
      { x: 36, y1: 392, y2: 478, broken: false },
      { x: 224, y1: 392, y2: 478, broken: false },
      { x: 404, y1: 392, y2: 478, broken: false },
      // Tier 1 -> 2
      { x: 52, y1: 306, y2: 392, broken: false },
      { x: 176, y1: 306, y2: 392, broken: false },
      { x: 272, y1: 306, y2: 392, broken: false },
      { x: 388, y1: 306, y2: 392, broken: false },
      // Tier 2 -> 3
      { x: 64, y1: 220, y2: 306, broken: false },
      { x: 224, y1: 220, y2: 306, broken: false },
      { x: 376, y1: 220, y2: 306, broken: false },
      // Tier 3 -> 4
      { x: 76, y1: 136, y2: 220, broken: false },
      { x: 364, y1: 136, y2: 220, broken: false },
      // Tier 4 -> 5 (폴린 구출 사다리)
      { x: 262, y1: 88, y2: 136, broken: false, isGoalLadder: true }
    ];

    const items = [
      { type: 'hammer', x: 216, y: 262, w: 16, h: 18, collected: false },
      { type: 'hammer', x: 84, y: 176, w: 16, h: 18, collected: false },
      { type: 'parasol', x: 68, y: 370, w: 16, h: 18, score: 300, collected: false },
      { type: 'hat', x: 356, y: 286, w: 16, h: 14, score: 500, collected: false },
      { type: 'key', x: 344, y: 458, w: 16, h: 16, score: 800, collected: false }
    ];

    return {
      stageNum: 4,
      heightLabel: '100m',
      title: 'STAGE 4 - 100m (RIVETS)',
      playerSpawn: { x: 60, y: 452 },
      dkSpawn: { x: 174, y: 92 },
      paulineSpawn: { x: 196, y: 62 },
      girders,
      ladders,
      items,
      elevators: [],
      rivets
    };
  }

  global.DKStages = {
    createStageData,
    getGirderYAtX
  };
})(window);
