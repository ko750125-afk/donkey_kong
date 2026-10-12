/**
 * Donkey Kong (1981) Arcade Clone — Mobile Multi-Touch Controller, PWA Install & Friend Share Manager
 */
(function () {
  'use strict';

  let deferredInstallPrompt = null;
  const pwaInstallRow = document.getElementById('pwaInstallRow');
  const btnInstallPwa = document.getElementById('btnInstallPwa');
  const btnShareGame = document.getElementById('btnShareGame');
  const btnTouchPad = document.getElementById('btnTouchPad');
  const pwaToastMsg = document.getElementById('pwaToastMsg');
  const mobileControls = document.getElementById('mobileControls');

  function showToast(msg, duration = 4000) {
    if (!pwaToastMsg) return;
    pwaToastMsg.textContent = msg;
    pwaToastMsg.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      pwaToastMsg.classList.add('hidden');
    }, duration);
  }

  // 1. 서비스 워커 등록 (HTTPS 및 localhost 환경)
  if (
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration skipped:', err);
      });
    });
  }

  // 2. 모바일 멀티터치 & 슬라이드 드래그 가상 패드 바인딩
  const VIRTUAL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  const activeKeySet = new Set();

  function syncVirtualKeys(nextKeySet) {
    if (!window.DKGame) return;

    // 새로 눌린 키가 있으면 오디오 잠금 해제 및 짧은 진동 피드백
    let newlyPressed = false;
    nextKeySet.forEach((k) => {
      if (!activeKeySet.has(k)) newlyPressed = true;
    });

    if (newlyPressed) {
      if (window.DKAudio) window.DKAudio.init();
      if (navigator.vibrate) {
        try {
          navigator.vibrate(10);
        } catch (_) {}
      }
    }

    // 모든 가상 키 상태 및 버튼 시각 효과 동기화
    VIRTUAL_KEYS.forEach((code) => {
      const isPressed = nextKeySet.has(code);
      const wasPressed = activeKeySet.has(code);
      if (isPressed !== wasPressed) {
        window.DKGame.setVirtualKey(code, isPressed);
      }
    });

    document.querySelectorAll('[data-key]').forEach((btn) => {
      const code = btn.getAttribute('data-key');
      btn.classList.toggle('pressed', nextKeySet.has(code));
    });

    activeKeySet.clear();
    nextKeySet.forEach((k) => activeKeySet.add(k));
  }

  function handleTouchUpdate(e) {
    if (!mobileControls) return;
    e.preventDefault();

    const nextKeys = new Set();
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (!el) continue;
      const keyBtn = el.closest('[data-key]');
      if (keyBtn) {
        const code = keyBtn.getAttribute('data-key');
        if (code) nextKeys.add(code);
      }
    }
    syncVirtualKeys(nextKeys);
  }

  if (mobileControls) {
    mobileControls.addEventListener('touchstart', handleTouchUpdate, { passive: false });
    mobileControls.addEventListener('touchmove', handleTouchUpdate, { passive: false });
    mobileControls.addEventListener('touchend', handleTouchUpdate, { passive: false });
    mobileControls.addEventListener('touchcancel', handleTouchUpdate, { passive: false });

    // PC 마우스로 가상 패드 클릭 테스트 지원
    let mouseHeldKey = null;
    document.querySelectorAll('[data-key]').forEach((btn) => {
      const code = btn.getAttribute('data-key');
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        mouseHeldKey = code;
        syncVirtualKeys(new Set([code]));
      });
      btn.addEventListener('mouseenter', (e) => {
        if (e.buttons === 1 && mouseHeldKey) {
          mouseHeldKey = code;
          syncVirtualKeys(new Set([code]));
        }
      });
    });

    window.addEventListener('mouseup', () => {
      if (mouseHeldKey) {
        mouseHeldKey = null;
        syncVirtualKeys(new Set());
      }
    });

    // 게임 캔버스 터치 시 타이틀/게임오버 화면에서 즉시 게임 시작 지원
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener(
        'touchstart',
        (e) => {
          if (window.DKAudio) window.DKAudio.init();
          if (window.DKGame && (window.DKGame.state === 'TITLE' || window.DKGame.state === 'GAME_OVER')) {
            e.preventDefault();
            window.DKGame.triggerStart();
          }
        },
        { passive: false }
      );
    }
  }

  // 3. 설정 모달 내 모바일 터치 패드 표시 모드 전환 (자동 / 항상 표시 / 숨김)
  let padMode = localStorage.getItem('dk1981_pad_mode') || 'auto';
  function applyPadMode() {
    document.body.classList.toggle('force-touchpad', padMode === 'always');
    document.body.classList.toggle('hide-touchpad', padMode === 'hide');
    if (btnTouchPad) {
      if (padMode === 'auto') {
        btnTouchPad.textContent = '🎮 자동 (모바일)';
        btnTouchPad.classList.add('active');
      } else if (padMode === 'always') {
        btnTouchPad.textContent = '🎮 항상 표시 ON';
        btnTouchPad.classList.add('active');
      } else {
        btnTouchPad.textContent = '🎮 패드 숨김 OFF';
        btnTouchPad.classList.remove('active');
      }
    }
  }
  applyPadMode();

  if (btnTouchPad) {
    btnTouchPad.addEventListener('click', () => {
      padMode = padMode === 'auto' ? 'always' : padMode === 'always' ? 'hide' : 'auto';
      localStorage.setItem('dk1981_pad_mode', padMode);
      applyPadMode();
    });
  }

  // 4. 친구에게 공유하기 (모바일 카카오톡/문자 공유 시트 또는 링크 복사)
  if (btnShareGame) {
    btnShareGame.addEventListener('click', async () => {
      const shareData = {
        title: '🦍 동키콩 (1981) — 아케이드 클래식 PWA',
        text: '열쇠를 찾아 폴린을 구출하라! 스마트폰·PC에서 바로 플레이하는 1981 오리지널 동키콩 게임 🎮',
        url: window.location.href
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          showToast('✅ 친구에게 공유 창을 열었습니다!');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('✅ 게임 링크가 복사되었습니다! 카톡이나 문자에 붙여넣어 친구에게 보내보세요.');
      } catch (_) {
        showToast(`🔗 주소창의 링크(${window.location.href})를 복사해 친구에게 공유해 주세요!`);
      }
    });
  }

  // 5. PWA 홈 화면 앱 설치 지원 (Android/PC 설치 프롬프트 + iPhone Safari 안내)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (pwaInstallRow) {
      pwaInstallRow.classList.remove('hidden');
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('🎉 홈 화면에 동키콩 앱 설치가 시작되었습니다!');
        }
        deferredInstallPrompt = null;
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

      if (isStandalone) {
        showToast('✅ 이미 홈 화면 앱(PWA) 모드로 실행 중입니다!');
      } else if (isIOS) {
        showToast('📱 아이폰(Safari): 브라우저 하단 [공유(⬆️)] 버튼 ➔ [홈 화면에 추가]를 누르면 앱으로 설치됩니다!', 6000);
      } else {
        showToast('📲 브라우저 우측 상단 메뉴(⋮)에서 [앱 설치] 또는 [홈 화면에 추가]를 눌러 설치할 수 있습니다!', 5000);
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('🎉 동키콩 (1981) PWA 앱 설치가 완료되었습니다!');
  });
})();
