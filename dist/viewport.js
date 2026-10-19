'use strict';
(() => {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let gesture = null;
  const atNormalScale = () => !viewport || Math.abs(viewport.scale - 1) < .01;
  function resetScroll() {
    if (atNormalScale() && (window.scrollX || window.scrollY)) window.scrollTo(0, 0);
  }
  function syncViewport() {
    if (!atNormalScale()) return;
    const height = Math.floor(Math.min(window.innerHeight, viewport ? viewport.height : window.innerHeight));
    if (height <= 0) return;
    root.style.setProperty('--app-height', height + 'px');
    // The native viewer/browser can already consume the top safe region.
    // Subtract that external space instead of adding another header-sized gap.
    const externalHeight = Math.max(0, (window.screen?.height || window.innerHeight) - height);
    root.style.setProperty('--external-height', externalHeight + 'px');
    const mobile = window.innerWidth <= 650;
    const landscape = window.innerWidth > height && height < 540;
    root.dataset.igCompact = String(window.innerWidth < 390 || height < 620);
    root.dataset.mobile = String(mobile);
    root.dataset.layout = landscape ? 'landscape' : height < 620 ? 'short' : height < 700 ? 'compact' : 'portrait';
    resetScroll();
  }
  function canScroll(scroller, delta) {
    if (!scroller || !delta) return false;
    const max = scroller.scrollHeight - scroller.clientHeight;
    return max > 1 && (delta > 0 ? scroller.scrollTop < max - 1 : scroller.scrollTop > 1);
  }
  document.addEventListener('touchstart', event => {
    const point = event.touches[0];
    gesture = point ? {
      x: point.clientX, y: point.clientY, lastY: point.clientY,
      range: !!event.target.closest?.('input[type="range"]'),
      scroller: event.target.closest?.('[data-scroll-region]')
    } : null;
  }, {passive: true, capture: true});
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1 || !atNormalScale()) return;
    const point = event.touches[0];
    if (gesture && point) {
      const dx = point.clientX - gesture.x, dy = point.clientY - gesture.y;
      const delta = gesture.lastY - point.clientY;
      gesture.lastY = point.clientY;
      if (gesture.scroller && Math.abs(dy) >= Math.abs(dx) && canScroll(gesture.scroller, delta)) return;
      if (gesture.range && Math.abs(dx) > Math.abs(dy)) return;
    }
    // At the list's ends, consume the gesture so it cannot pull the game page.
    if (event.cancelable) event.preventDefault();
  }, {passive: false, capture: true});
  document.addEventListener('touchend', () => {gesture = null;}, {passive: true, capture: true});
  document.addEventListener('touchcancel', () => {gesture = null;}, {passive: true, capture: true});
  document.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    if (canScroll(event.target?.closest?.('[data-scroll-region]'), event.deltaY)) return;
    if (event.cancelable) event.preventDefault();
  }, {passive: false, capture: true});
  document.addEventListener('keydown', event => {
    if (event.target.closest?.('[data-scroll-region]')) return;
    if (['PageUp','PageDown','Home','End','ArrowUp','ArrowDown'].includes(event.key) && !event.target.closest?.('input,button,[role="tab"]')) event.preventDefault();
  });
  window.addEventListener('scroll', resetScroll, {passive: true});
  window.addEventListener('resize', syncViewport, {passive: true});
  window.addEventListener('pageshow', syncViewport, {passive: true});
  if (viewport) {
    viewport.addEventListener('resize', syncViewport, {passive: true});
    viewport.addEventListener('scroll', resetScroll, {passive: true});
  }
  syncViewport();
})();
