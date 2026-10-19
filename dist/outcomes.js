'use strict';
(() => {
  const fixtures = Object.freeze([
    {id:'zero',group:'Gameplay',title:'No loot boxes',description:'Four X symbols. £1 preview cost, £0 returned and a £1 net loss. No win celebration.'},
    {id:'one',group:'Gameplay',title:'One loot box',description:'A loot box counts on any reel. £0.20 returned on a £1 preview stake: a partial return with an £0.80 net loss.'},
    {id:'two',group:'Gameplay',title:'Two loot boxes',description:'Separated loot boxes still count. £1 returned on a £1 preview stake: break even.'},
    {id:'normal',group:'Features',title:'Shooting Spree',description:'Three boxes enter the real native bonus presentation. Fixed award: 5× (£5), with the native extraction-five winning film. The film cannot change it.'},
    {id:'mega',group:'Features',title:'Mega Shooting Spree',description:'Four boxes enter the Mega presentation. Fixed award: 1,000× (£1,000), with the native extraction-max winning film.'},
    {id:'result',group:'Results',title:'Bonus result',description:'Accepted preview award, total returned credits and net result shown separately. Settlement is represented once.'},
    {id:'media-error',group:'Recovery & errors',title:'Film unavailable',description:'Media failure preserves the accepted preview award. Exercise the visible recovery or collect control.'},
    {id:'paused',group:'Controls',title:'Pause and resume',description:'Bonus playback begins paused. Resume continues the same preview award; no second draw or extra credit.'}
  ].map(Object.freeze));
  const $ = id => document.getElementById(id);
  let frame = $('reviewFrame');
  let selected = -1, paused = false, generation = 0, loadTimer = null;
  const groups = [...new Set(fixtures.map(f => f.group))];
  for (const group of groups) {
    const section = document.createElement('div'); section.className = 'fixture-group';
    const heading = document.createElement('h3'); heading.textContent = group; section.append(heading);
    fixtures.forEach((fixture,index) => {
      if (fixture.group !== group) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'fixture-choice';
      button.dataset.fixture = fixture.id; button.setAttribute('aria-pressed','false');
      const number = document.createElement('span'); number.className = 'fixture-number'; number.textContent = String(index + 1).padStart(2,'0');
      const label = document.createElement('span'); label.textContent = fixture.title; button.append(number,label);
      button.addEventListener('click',() => select(index)); section.append(button);
    });
    $('fixtureIndex').append(section);
  }
  function setPaused(value) {
    paused = value; $('pauseFixture').textContent = value ? 'Resume' : 'Pause';
    $('pauseFixture').setAttribute('aria-pressed',String(value));
  }
  function command(value) {
    if (selected < 0 || !frame.contentWindow) return;
    frame.contentWindow.postMessage({type:'cashfire-review-command',command:value},location.origin);
  }
  function select(index) {
    selected = Math.max(0,Math.min(fixtures.length-1,index));
    const fixture = fixtures[selected]; generation++;
    clearTimeout(loadTimer); setPaused(fixture.id === 'paused');
    $('welcome').hidden = true; $('previewContainer').hidden = false;
    document.querySelector('.review-layout').classList.remove('index-visible');
    $('fixtureGroup').textContent = fixture.group.toUpperCase(); $('fixtureTitle').textContent = fixture.title;
    $('fixtureDescription').textContent = fixture.description; $('previewStatus').textContent = 'Loading isolated preview…';
    $('fixturePosition').textContent = (selected+1)+' / '+fixtures.length+' · '+fixture.title;
    $('previousFixture').disabled = selected === 0; $('nextFixture').disabled = selected === fixtures.length-1;
    $('replayFixture').disabled = false; $('pauseFixture').disabled = !['normal','mega','paused','media-error'].includes(fixture.id);
    document.querySelectorAll('[data-fixture]').forEach(button => {
      const active = button.dataset.fixture === fixture.id; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
    });
    history.replaceState(null,'','#'+fixture.id);
    // A fragment-only src change can reuse the previous document. Replace the
    // iframe so every fixture gets a fresh isolated presentation and clock.
    const freshFrame=frame.cloneNode(false);
    freshFrame.src = 'review.html#fixture='+encodeURIComponent(fixture.id)+'&run='+generation;
    frame.replaceWith(freshFrame);frame=freshFrame;
    loadTimer = setTimeout(() => { $('previewStatus').textContent = 'Preview is taking longer to load. Replay to retry; the playable game is unaffected.'; },12000);
  }
  function index() {
    if (selected>=0 && ['normal','mega','paused','media-error'].includes(fixtures[selected].id)) { command('pause'); setPaused(true); }
    document.querySelector('.review-layout').classList.add('index-visible');
    const choice = document.querySelector('[data-fixture="'+(fixtures[selected]?.id || fixtures[0].id)+'"]'); choice?.focus();
    if (matchMedia('(min-width:761px)').matches) $('previewStatus').textContent = 'Select any outcome from the index. Current playback is held; the preview remains independent.';
  }
  window.addEventListener('message',event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin || selected < 0) return;
    const data = event.data;
    if (!data || data.type !== 'cashfire-review-status' || data.fixture !== fixtures[selected].id) return;
    clearTimeout(loadTimer);
    $('previewStatus').textContent = typeof data.message === 'string' ? data.message.slice(0,500) : 'Preview ready.';
    if (data.phase === 'paused') setPaused(true);
    if (data.phase === 'playing' || data.phase === 'complete') setPaused(false);
  });
  $('previousFixture').addEventListener('click',() => select(selected-1));
  $('nextFixture').addEventListener('click',() => select(selected+1));
  $('replayFixture').addEventListener('click',() => select(selected));
  $('pauseFixture').addEventListener('click',() => { setPaused(!paused); command(paused ? 'pause' : 'resume'); });
  $('resetReview').addEventListener('click',() => select(0));
  $('returnIndex').addEventListener('click',index);
  $('startFlow').addEventListener('click',() => select(0));
  document.addEventListener('keydown',event => {
    if (['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowRight' && selected < fixtures.length-1) {event.preventDefault();select(selected+1);}
    if (event.key === 'ArrowLeft' && selected > 0) {event.preventDefault();select(selected-1);}
    if (event.key === 'Escape') index();
  });
  const requested = decodeURIComponent(location.hash.slice(1));
  const initial = fixtures.findIndex(fixture => fixture.id === requested);
  if (initial >= 0) select(initial);
  else if (matchMedia('(max-width:760px)').matches) document.querySelector('.review-layout').classList.add('index-visible');
})();
