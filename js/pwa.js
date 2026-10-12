/**
 * Donkey Kong (1981) Arcade Clone — PWA Service Worker & Install Prompt Manager
 */
(function () {
  'use strict';

  let deferredInstallPrompt = null;
  const pwaInstallRow = document.getElementById('pwaInstallRow');
  const btnInstallPwa = document.getElementById('btnInstallPwa');

  // 1. 서비스 워커 등록 (http/https 로컬호스트 환경에서 동작)
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

  // 2. PWA 앱 설치 가능 시 설정 모달 내 설치 항목 표시
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (pwaInstallRow) {
      pwaInstallRow.classList.remove('hidden');
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted' && pwaInstallRow) {
        pwaInstallRow.classList.add('hidden');
      }
      deferredInstallPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (pwaInstallRow) {
      pwaInstallRow.classList.add('hidden');
    }
  });
})();
