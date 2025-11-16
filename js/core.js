const el = {
  stage: document.getElementById('stage'),
  img: document.getElementById('img'),
  cap: document.getElementById('cap'),
  nav: document.getElementById('nav'),
  scrub: document.getElementById('scrub'),
  badge: document.getElementById('badge'),
  bottomTap: document.getElementById('bottomTap'),
  bgm: document.getElementById('bgm'),
  vol: document.getElementById('vol'),
  mute: document.getElementById('mute'),
  chapterIntro: document.getElementById('chapterIntro'),
  chapterIntroBody: document.getElementById('chapterIntroBody'),
};

let scenes = [];
let i = 0;
let audioPrimed = false;

// 章定義（0始まりの index）
const chapters = [
  {
    id: 1,
    start: 0,
    end: 3,
    html: `
      <div class="chapter-label">🍬 第1章：ハロウィンのはじまり（1〜4）</div>
      <p>カボチャのオレンジが街に弾けた！</p>
      <p>鐘の音、風船、笑顔、ぜんぶが浮かれてる🎈</p>
      <p>「行こう！」の合図で、ふたりのハロウィンデイがスタート！</p>
    `,
  },
  {
    id: 2,
    start: 4,
    end: 8,
    html: `
      <div class="chapter-label">🧙‍♀️ 第2章：コスプレと午後のハロウィン（5〜9）</div>
      <p>午後はまるで仮装フェスティバル！✨</p>
      <p>ステッキ、マント、牙、翼、ぜんぶあり！</p>
      <p>カメラのシャッターが止まらない、最高にフォトジェニックな時間📸</p>
    `,
  },
  {
    id: 3,
    start: 9,
    end: 12,
    html: `
      <div class="chapter-label">☕ 第3章：夜の談笑と食事タイム（10〜13）</div>
      <p>日が沈んでもテンションはそのまま！🌙</p>
      <p>笑い声は止まらない、ハロウィンの夜はまだまだこれから！</p>
      <p>ちょっとだけ休憩しながら、また次のイベントへGO！</p>
    `,
  },
  {
    id: 4,
    start: 13,
    end: 14,
    html: `
      <div class="chapter-label">🎆 第4章：終わりに向けて（14〜15）</div>
      <p>祭りのクライマックス！</p>
      <p>花火が空にドーン、カボチャの光がキラキラ！🎇</p>
      <p>一日の終わりに、また一つ新しい思い出が増えた💛</p>
    `,
  },
  {
    id: 5,
    start: 15,
    end: 15,
    html: `
      <div class="chapter-label">🌅 第5章：最後のあいさつ（16）</div>
      <p>空が明るくなりはじめる。</p>
      <p>ふたりの笑い声が、夜と朝の間に溶けていく。</p>
      <p>「また明日」じゃなく、「また来年」。そんな言葉で締めくくる朝。</p>
    `,
  },
];

const shownChapters = new Set();

// --- simple image cache for preloading ---
const cache = new Map(); // src -> HTMLImageElement
function preload(src){
  if (!src || cache.has(src)) return;
  const im = new Image();
  im.decoding = 'async';
  im.loading = 'eager';
  im.src = src;
  cache.set(src, im);
}
function preloadAround(idx){
  const nxt  = scenes[idx+1]?.src;
  const nxt2 = scenes[idx+2]?.src;
  const prev = scenes[idx-1]?.src;
  const run = () => { preload(nxt); preload(nxt2); preload(prev); };
  (window.requestIdleCallback ? requestIdleCallback(run, {timeout: 300}) : setTimeout(run, 0));
}

async function loadScenes(){
  const res = await fetch('scenes.json');
  scenes = await res.json();
  el.scrub.max = String(scenes.length - 1);
  // 初期表示：まず1枚目の画像を出す
  renderAt(0);
}

// ---- 画像切替アニメ（本体仕様そのまま） ----
let swapToken = 0;
function flashImg(){
  if (!el.img) return;
  el.img.classList.remove('img-swap');
  void el.img.offsetWidth;
  el.img.classList.add('img-swap');
}

// 章まわり
function findChapterForIndex(idx){
  return chapters.find(ch => idx >= ch.start && idx <= ch.end) || null;
}

function isChapterIntroVisible(){
  return el.chapterIntro?.classList.contains('is-visible');
}

function showChapterIntro(chapter){
  if (!el.chapterIntro || !el.chapterIntroBody) return;
  el.chapterIntroBody.innerHTML = chapter.html;
  el.chapterIntro.classList.add('is-visible');
}

function hideChapterIntro(){
  if (!el.chapterIntro) return;
  el.chapterIntro.classList.remove('is-visible');
}

function maybeShowChapterIntro(idx){
  const ch = findChapterForIndex(idx);
  if (!ch) return;
  if (shownChapters.has(ch.id)) return;
  shownChapters.add(ch.id);
  showChapterIntro(ch);
}

// 画像＋キャプション更新 → その後で章イントロを出す
function renderAt(idx){
  idx = Math.max(0, Math.min(scenes.length - 1, idx));
  i = idx;

  const s = scenes[i];
  const nextSrc = s.src;

  el.scrub.value = String(i);
  el.badge.textContent = `${i+1} / ${scenes.length}`;

  // 同一画像ならUIだけ更新して章チェック
  if (el.img.getAttribute('src') === nextSrc){
    el.cap.textContent = s.cap || '';
    preloadAround(i);
    maybeShowChapterIntro(i);  // ← ページが決まった後に章チェック
    return;
  }

  const token = ++swapToken;
  const tmp = new Image();
  tmp.decoding = 'async';
  tmp.loading  = 'eager';
  tmp.src = nextSrc;

  const apply = () => {
    if (token !== swapToken) return;
    el.img.src = nextSrc;
    el.cap.textContent = s.cap || '';
    preloadAround(i);
    flashImg();
    // 画像が切り替わった「後」で章イントロを出す
    maybeShowChapterIntro(i);
  };

  if ('decode' in tmp && typeof tmp.decode === 'function'){
    tmp.decode().catch(()=>{}).finally(apply);
  } else {
    tmp.onload = apply;
    tmp.onerror = apply;
  }
}

function show(delta){ renderAt(i + delta); }
function openNav(){ el.nav.classList.add('is-open'); }
function closeNav(){ el.nav.classList.remove('is-open'); }

function primeAudio(){
  if (audioPrimed) return;
  audioPrimed = true;
  el.bgm.volume = parseFloat(el.vol?.value || '0.8');
  el.bgm.play().catch(()=>{});
}

// events
el.bottomTap.addEventListener('click', ()=>{
  // 章ページが出ているときは、まず閉じるだけ（ページは動かさない）
  if (isChapterIntroVisible()){
    hideChapterIntro();
    return;
  }
  if (!el.nav.classList.contains('is-open')) {
    openNav();
    el.bottomTap.style.pointerEvents = 'none';
    primeAudio();
  }
});

// ナビ内でのクリック/タッチは外へ伝播させない
['click','pointerdown','touchstart'].forEach(type=>{
  el.nav.addEventListener(type, ev=>{
    ev.stopPropagation();
  }, {passive:true});
});

el.scrub.addEventListener('input', e=>{
  const val = parseInt(e.target.value || '0', 10);
  hideChapterIntro(); // スライダーで飛んだら今出ている章ページは閉じる
  renderAt(val);
});

['pointerdown','touchstart','click'].forEach(type=>{
  el.scrub.addEventListener(type, ev=>ev.stopPropagation(), {passive:true});
});

['click','pointerdown','touchstart'].forEach(type=>{
  el.nav.addEventListener(type, ev=>ev.stopPropagation(), {passive:true});
});

el.mute.addEventListener('click', ()=>{
  const pressed = el.mute.getAttribute('aria-pressed') === 'true';
  const next = !pressed;
  el.mute.setAttribute('aria-pressed', String(next));
  el.bgm.muted = next;
  el.mute.textContent = next ? '🔇' : '🔊';
});

el.vol?.addEventListener('input', ()=>{
  el.bgm.volume = parseFloat(el.vol.value || '0.8');
});

// Left/right click when nav closed
el.stage.addEventListener('click', (e)=>{
  primeAudio();

  // 章ページ表示中なら、まず閉じるだけ
  if (isChapterIntroVisible()){
    hideChapterIntro();
    return;
  }

  if (el.nav.classList.contains('is-open')){
    const navTop = window.innerHeight - el.nav.offsetHeight;
    if (e.clientY < navTop) {
      closeNav();
      el.bottomTap.style.pointerEvents = 'auto';
    }
    return;
  }

  (e.clientX < window.innerWidth*0.5) ? show(-1) : show(+1);
});

// Keyboard
document.addEventListener('keydown', (e)=>{
  // 章ページが出ているときは、最初の入力は「閉じるだけ」
  if (isChapterIntroVisible()){
    if (['ArrowRight','ArrowLeft',' ','Spacebar'].includes(e.key) || e.key.toLowerCase() === 'd'){
      hideChapterIntro();
      return;
    }
  }

  if (e.key === 'ArrowRight' || e.key === ' ') show(+1);
  if (e.key === 'ArrowLeft') show(-1);
  if (e.key.toLowerCase() === 'd') { openNav(); primeAudio(); }
  if (e.key.toLowerCase() === 's' || e.key === 'Escape') closeNav();
});

loadScenes();
