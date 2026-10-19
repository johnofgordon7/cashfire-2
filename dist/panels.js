'use strict';
(() => {
  const panel = document.getElementById('betPanel');
  const amounts = document.getElementById('betOptions');
  document.getElementById('betToggle').addEventListener('click', () => {
    if (!panel.open) return;
    document.documentElement.classList.add('bet-open');
    const selected = amounts.querySelector('[aria-pressed="true"]');
    if (selected) {
      // Scroll this list only. scrollIntoView can also move the outer viewer.
      amounts.scrollTop = Math.max(0, selected.offsetTop - (amounts.clientHeight - selected.offsetHeight) / 2);
      selected.focus({preventScroll: true});
    }
  });
  panel.addEventListener('close', () => document.documentElement.classList.remove('bet-open'));
  const tabs = [...document.querySelectorAll('.help-tabs [role="tab"]')];
  function selectTab(selected) {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.onclick = () => selectTab(tab);
    tab.onkeydown = event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();selectTab(tabs[next]);tabs[next].focus();
    };
  });
})();
