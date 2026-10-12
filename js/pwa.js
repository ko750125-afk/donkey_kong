/**
 * Donkey Kong (1981) Arcade Clone — PWA & Touch Controller Manager
 * 서비스 워커 등록, 앱 설치 프롬프트, 네트워크 배지, 모바일 터치 패드 연동
 */
(function () {
  'use strict';

  let deferredInstallPrompt = null;
  const btnInstallPwa = document.getElementById('btnInstallPwa');
  const networkBadge = document.getElementById('networkBadge');

  // 1. 서비스 워커 등록 (http/https 로컬호스트 환경에서 동작)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then(() => {
          updateNetworkBadge();
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration skipped:', err);
        });
    });
  }

  // 2. PWA 앱 설치 프롬프트 감지 및 버튼 활성화
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstallPwa) {
      btnInstallPwa.classList.remove('hidden');
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        btnInstallPwa.classList.add('hidden');
      }
      deferredInstallPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (btnInstallPwa) {
      btnInstallPwa.classList.add('hidden');
    }
  });

  // 3. 온라인 / 오프라인 네트워크 상태 배지 업데이트
  function updateNetworkBadge() {
    if (!networkBadge) return;
    if (navigator.onLine) {
      networkBadge.textContent = '⚡ PWA READY';
      networkBadge.className = 'network-badge online';
    } else {
      networkBadge.textContent = '📴 OFFLINE PLAY';
      networkBadge.className = 'network-badge offline';
    }
  }

  window.addEventListener('online', updateNetworkBadge);
  window.addEventListener('offline', updateNetworkBadge);
  updateNetworkBadge();

  // 4. 모바일/태블릿 가상 아케이드 조이스틱 터치 이벤트 바인딩
  function bindTouchControls() {
    const touchButtons = document.querySelectorAll('[data-key]');
    touchButtons.forEach((btn) => {
      const keyCode = btn.getAttribute('data-key');

      const press = (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        if (navigator.vibrate) {
          navigator.vibrate(12);
        }
        if (window.DKGame && typeof window.DKGame.setVirtualKey === 'function') {
          window.DKGame.setVirtualKey(keyCode, true);
        }
      };

      const release = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (window.DKGame && typeof window.DKGame.setVirtualKey === 'function') {
          window.DKGame.setVirtualKey(keyCode, false);
        }
      };

      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });

    const btnTouchStart = document.getElementById('btnTouchStart');
    if (btnTouchStart) {
      btnTouchStart.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(20);
        if (window.DKGame && typeof window.DKGame.triggerStart === 'function') {
          window.DKGame.triggerStart();
        }
      });
    }

    const btnTouchPause = document.getElementById('btnTouchPause');
    if (btnTouchPause) {
      btnTouchPause.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(15);
        if (window.DKGame && typeof window.DKGame.togglePause === 'function') {
          window.DKGame.togglePause();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTouchControls);
  } else {
    bindTouchControls();
  }
})();
