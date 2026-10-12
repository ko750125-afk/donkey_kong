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

  // 2. 모바일 360° 원형 아날로그 조이스틱 & 멀티터치 점프 버튼 바인딩
  const joystickZone = document.getElementById('joystickZone');
  const joystickBase = document.getElementById('joystickBase');
  const joystickKnob = document.getElementById('joystickKnob');
  const btnMobileJump = document.getElementById('btnMobileJump');
  const joyDirLabels = {
    up: document.querySelector('.joy-dir-up'),
    down: document.querySelector('.joy-dir-down'),
    left: document.querySelector('.joy-dir-left'),
    right: document.querySelector('.joy-dir-right')
  };

  let joyTouchId = null;
  let joyMouseDown = false;
  let jumpPressedState = false;

  function applyJoystickClientPos(clientX, clientY) {
    if (!joystickBase || !joystickKnob) return;
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = Math.max(28, rect.width * 0.31);

    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = clampedDist * Math.cos(angle);
    const ky = clampedDist * Math.sin(angle);

    // 썸스틱 노브를 손가락 위치로 부드럽게 이동
    joystickKnob.style.transform = `translate(calc(-50% + ${kx.toFixed(1)}px), calc(-50% + ${ky.toFixed(1)}px))`;
    joystickBase.classList.add('active');
    joystickKnob.classList.add('active');

    // 정규화된 벡터 (-1.0 ~ +1.0)
    const nx = kx / maxRadius;
    const ny = ky / maxRadius;

    if (window.DKGame && typeof window.DKGame.setJoystickVector === 'function') {
      window.DKGame.setJoystickVector(nx, ny);
    }

    // 원형 테두리 4방향 발광 인디케이터 업데이트 (대각선 이동 시 2개 동시 점등)
    if (joyDirLabels.left) joyDirLabels.left.classList.toggle('lit', nx < -0.18);
    if (joyDirLabels.right) joyDirLabels.right.classList.toggle('lit', nx > 0.18);
    if (joyDirLabels.up) joyDirLabels.up.classList.toggle('lit', ny < -0.24);
    if (joyDirLabels.down) joyDirLabels.down.classList.toggle('lit', ny > 0.24);
  }

  function resetJoystick() {
    joyTouchId = null;
    joyMouseDown = false;
    if (joystickKnob) {
      joystickKnob.style.transform = 'translate(-50%, -50%)';
      joystickKnob.classList.remove('active');
    }
    if (joystickBase) {
      joystickBase.classList.remove('active');
    }
    Object.values(joyDirLabels).forEach((el) => {
      if (el) el.classList.remove('lit');
    });
    if (window.DKGame && typeof window.DKGame.setJoystickVector === 'function') {
      window.DKGame.setJoystickVector(0, 0);
    }
  }

  function setJumpPressed(pressed) {
    if (pressed === jumpPressedState) return;
    jumpPressedState = pressed;
    if (btnMobileJump) {
      btnMobileJump.classList.toggle('pressed', pressed);
    }
    if (pressed) {
      if (window.DKAudio) window.DKAudio.init();
      if (navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch (_) {}
      }
    }
    if (window.DKGame) {
      window.DKGame.setVirtualKey('Space', pressed);
    }
  }

  function handleTouchEvent(e) {
    if (!mobileControls) return;
    e.preventDefault();

    // 1) 새로운 터치가 조이스틱 영역에서 시작되었는지 확인
    if (joyTouchId === null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const target = document.elementFromPoint(t.clientX, t.clientY) || t.target;
        if (target && joystickZone && joystickZone.contains(target)) {
          joyTouchId = t.identifier;
          if (window.DKAudio) window.DKAudio.init();
          if (navigator.vibrate) {
            try {
              navigator.vibrate(8);
            } catch (_) {}
          }
          break;
        }
      }
    }

    // 2) 현재 활성 터치 목록에서 조이스틱 터치와 점프 버튼 터치를 독립적으로 추적 (멀티터치 완벽 지원)
    let activeJoyTouch = null;
    let isJumpTouched = false;

    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === joyTouchId) {
        activeJoyTouch = t;
        continue;
      }
      const el = document.elementFromPoint(t.clientX, t.clientY) || t.target;
      if (el && btnMobileJump && (el === btnMobileJump || btnMobileJump.contains(el))) {
        isJumpTouched = true;
      }
    }

    if (activeJoyTouch) {
      applyJoystickClientPos(activeJoyTouch.clientX, activeJoyTouch.clientY);
    } else if (joyTouchId !== null) {
      resetJoystick();
    }

    setJumpPressed(isJumpTouched);
  }

  if (mobileControls) {
    mobileControls.addEventListener('touchstart', handleTouchEvent, { passive: false });
    mobileControls.addEventListener('touchmove', handleTouchEvent, { passive: false });
    mobileControls.addEventListener('touchend', handleTouchEvent, { passive: false });
    mobileControls.addEventListener('touchcancel', handleTouchEvent, { passive: false });

    // PC 마우스로도 원형 조이스틱 드래그 및 점프 버튼 테스트 가능하도록 지원
    if (joystickBase) {
      joystickBase.addEventListener('mousedown', (e) => {
        e.preventDefault();
        joyMouseDown = true;
        if (window.DKAudio) window.DKAudio.init();
        applyJoystickClientPos(e.clientX, e.clientY);
      });
    }

    window.addEventListener('mousemove', (e) => {
      if (joyMouseDown) {
        applyJoystickClientPos(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (joyMouseDown) {
        resetJoystick();
      }
      if (jumpPressedState) {
        setJumpPressed(false);
      }
    });

    if (btnMobileJump) {
      btnMobileJump.addEventListener('mousedown', (e) => {
        e.preventDefault();
        setJumpPressed(true);
      });
    }

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
