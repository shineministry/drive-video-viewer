/**
 * Drive-style Video Viewer
 * - Instant open, no auth
 * - Reads ?v= URL, ?id= Drive ID, or window.VIDEO_URL
 * - Download, copy link, keyboard shortcuts, custom controls
 */

// === Config: change these ===
window.VIDEO_URL = "https://github.com/shineministry/drive-video-viewer/releases/download/v1.0/Trip.to.Morocco.mp4";
window.VIDEO_TITLE = "Trip to Morocco.mp4";

const $ = (s, r=document) => r.querySelector(s);
const video = $('#video');
const loader = $('#loader');
const wrap = $('#videoWrap');
const playBtn = $('#playBtn');
const bigPlay = $('#bigPlay');
const muteBtn = $('#muteBtn');
const fsBtn = $('#fsBtn');
const pipBtn = $('#pipBtn');
const timeLabel = $('#timeLabel');
const progressWrap = $('#progressWrap');
const progressBar = $('#progressBar');
const bufferBar = $('#bufferBar');
const progressThumb = $('#progressThumb');
const controls = $('#controls');
const fileNameEl = $('#fileName');
const detailName = $('#detailName');
const detailSize = $('#detailSize');
const detailDuration = $('#detailDuration');
const errorCard = $('#errorCard');
const errorMsg = $('#errorMsg');
const toastEl = $('#toast');

function toast(msg, ms=2400){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=> toastEl.classList.remove('show'), ms);
}

function parseQuery(){
  const p = new URLSearchParams(location.search);
  let v = p.get('v') || p.get('video') || p.get('src') || "";
  const id = p.get('id');
  const title = p.get('title') || p.get('name');
  if(id && !v){
    // Drive file ID -> try to make direct link (works for public files via lh3 or drive usercontent)
    v = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  // allow hash #v=...
  if(!v && location.hash.includes('v=')){
    try{ v = new URLSearchParams(location.hash.slice(1)).get('v') || ""; }catch{}
  }
  return { v: v ? decodeURIComponent(v) : "", title };
}

function driveLinkToDirect(url){
  // Convert https://drive.google.com/file/d/ID/view -> uc?export=download
  const m = url.match(/\/file\/d\/([^\/]+)/);
  if(m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  const m2 = url.match(/[?&]id=([^&]+)/);
  if(m2 && url.includes('drive.google.com')) return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
  return url;
}

function setTitle(name){
  const n = name || window.VIDEO_TITLE || "Video.mp4";
  fileNameEl.textContent = n;
  fileNameEl.title = n;
  detailName.textContent = n;
  document.title = `${n} — Drive Video Viewer`;
}

function showLoader(show){
  loader.classList.toggle('hide', !show);
}

function showError(msg){
  errorCard.hidden = false;
  if(msg) errorMsg.innerHTML = msg;
  showLoader(false);
  wrap.classList.add('paused');
}

function formatTime(s){
  if(!isFinite(s)) return "0:00";
  s = Math.floor(s);
  const m = Math.floor(s/60), sec = s%60;
  const h = Math.floor(m/60);
  if(h>0) return `${h}:${String(m%60).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

async function probeSize(url){
  try{
    const r = await fetch(url, { method: 'HEAD' });
    const len = r.headers.get('content-length');
    if(len){
      const b = parseInt(len,10);
      if(b < 1024) return `${b} B`;
      if(b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
      if(b < 1024*1024*1024) return `${(b/1024/1024).toFixed(1)} MB`;
      return `${(b/1024/1024/1024).toFixed(2)} GB`;
    }
  }catch{}
  return "—";
}

function attachVideo(url, title){
  if(!url){
    showError();
    return;
  }
  const direct = driveLinkToDirect(url);
  setTitle(title || direct.split('/').pop().split('?')[0] || window.VIDEO_TITLE);
  video.src = direct;
  video.setAttribute('title', detailName.textContent);
  showLoader(true);
  errorCard.hidden = true;

  // Try to get size for details
  probeSize(direct).then(s => detailSize.textContent = s);

  video.addEventListener('loadedmetadata', ()=>{
    showLoader(false);
    detailDuration.textContent = formatTime(video.duration);
    timeLabel.textContent = `${formatTime(0)} / ${formatTime(video.duration)}`;
  }, { once:true });

  video.addEventListener('error', ()=>{
    showError(`Cannot load video. Check link or host. <br><small style="word-break:break-all">${direct}</small>`);
  }, { once:true });
}

// Controls logic
let dragging = false;

function updateProgress(){
  if(!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  progressBar.style.width = pct + '%';
  progressThumb.style.left = pct + '%';
  progressWrap.setAttribute('aria-valuenow', String(Math.round(pct)));
  timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  // buffer
  if(video.buffered.length){
    const end = video.buffered.end(video.buffered.length-1);
    bufferBar.style.width = (end / video.duration * 100) + '%';
  }
}

function seekFromEvent(e){
  const rect = progressWrap.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const pct = Math.max(0, Math.min(1, x / rect.width));
  video.currentTime = pct * video.duration;
  updateProgress();
}

function togglePlay(){
  if(video.paused) video.play().catch(()=>{});
  else video.pause();
}

function syncPlayState(){
  const paused = video.paused;
  wrap.classList.toggle('paused', paused);
  bigPlay.classList.toggle('hide', !paused ? true : false);
  // swap icons
  const p = playBtn.querySelector('.icon-play');
  const pa = playBtn.querySelector('.icon-pause');
  if(p && pa){ p.style.display = paused ? '' : 'none'; pa.style.display = paused ? 'none' : '';}
  if(!paused) toastEl.classList.remove('show');
  // autohide controls timer
  resetHideTimer();
}

let hideTimer;
function resetHideTimer(){
  wrap.classList.add('controls-visible');
  clearTimeout(hideTimer);
  if(!video.paused){
    hideTimer = setTimeout(()=> wrap.classList.remove('controls-visible'), 2200);
  }
}

// Events
playBtn.addEventListener('click', togglePlay);
bigPlay.addEventListener('click', togglePlay);
video.addEventListener('click', togglePlay);
video.addEventListener('play', syncPlayState);
video.addEventListener('pause', syncPlayState);
video.addEventListener('timeupdate', updateProgress);
video.addEventListener('progress', updateProgress);
video.addEventListener('ended', ()=>{ wrap.classList.add('paused'); });

muteBtn.addEventListener('click', ()=>{
  video.muted = !video.muted;
  muteBtn.style.opacity = video.muted ? '.6' : '1';
  toast(video.muted ? 'Muted' : 'Unmuted');
});

fsBtn.addEventListener('click', ()=>{
  if(document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen().catch(()=> toast('Fullscreen not allowed'));
});
document.addEventListener('fullscreenchange', ()=>{
  // swap icon could be done here
});

pipBtn.addEventListener('click', async ()=>{
  try{
    if(document.pictureInPictureElement) await document.exitPictureInPicture();
    else if(video.requestPictureInPicture) await video.requestPictureInPicture();
  }catch(e){ toast('Picture-in-picture not supported'); }
});

$('#settingsBtn').addEventListener('click', ()=>{
  // cycle speeds 1x, 1.25x, 1.5x, 2x, 0.75x
  const speeds = [0.75, 1, 1.25, 1.5, 2];
  const idx = speeds.indexOf(video.playbackRate);
  const next = speeds[(idx+1) % speeds.length];
  video.playbackRate = next;
  $('#settingsBtn').textContent = next + '×';
  toast(`Speed: ${next}×`);
});

// Progress drag
progressWrap.addEventListener('mousedown', (e)=>{ dragging=true; seekFromEvent(e); });
progressWrap.addEventListener('touchstart', (e)=>{ dragging=true; seekFromEvent(e); }, {passive:true});
window.addEventListener('mousemove', (e)=>{ if(dragging) seekFromEvent(e); });
window.addEventListener('touchmove', (e)=>{ if(dragging) seekFromEvent(e); }, {passive:true});
window.addEventListener('mouseup', ()=> dragging=false);
window.addEventListener('touchend', ()=> dragging=false);
progressWrap.addEventListener('click', seekFromEvent);
progressWrap.addEventListener('keydown', (e)=>{
  if(!video.duration) return;
  const step = 5;
  if(e.key === 'ArrowRight'){ video.currentTime = Math.min(video.duration, video.currentTime + step); e.preventDefault(); }
  if(e.key === 'ArrowLeft'){ video.currentTime = Math.max(0, video.currentTime - step); e.preventDefault(); }
  if(e.key === 'Home'){ video.currentTime = 0; e.preventDefault(); }
  if(e.key === 'End'){ video.currentTime = video.duration; e.preventDefault(); }
});

// Keyboard shortcuts like Drive/Youtube
document.addEventListener('keydown', (e)=>{
  if(e.target.tagName === 'INPUT') return;
  if(e.code === 'Space'){ e.preventDefault(); togglePlay(); }
  if(e.key === 'k' || e.key === 'K'){ togglePlay(); }
  if(e.key === 'm' || e.key === 'M'){ video.muted = !video.muted; }
  if(e.key === 'f' || e.key === 'F'){ if(document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen().catch(()=>{}); }
  if(e.key === 'd' || e.key === 'D'){ doDownload(); }
});

// Mouse move shows controls
wrap.addEventListener('mousemove', resetHideTimer);
wrap.addEventListener('mouseleave', ()=> wrap.classList.remove('controls-visible'));

// Download
function doDownload(){
  const src = video.currentSrc || video.src;
  if(!src){ toast('No video to download'); return; }
  // Create anchor to force download
  const a = document.createElement('a');
  a.href = src;
  a.download = detailName.textContent || 'video.mp4';
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Downloading…');
  // Fallback: open in new tab if download attribute blocked (cross-origin)
  setTimeout(()=>{
    if(!a.download) window.open(src, '_blank');
  }, 300);
}

$('#downloadBtn').addEventListener('click', doDownload);
$('#drawerDownloadBtn').addEventListener('click', doDownload);
$('#moreBtn').addEventListener('click', (e)=>{
  const m = $('#moreMenu');
  m.hidden = !m.hidden;
  e.stopPropagation();
});
document.addEventListener('click', ()=> $('#moreMenu').hidden = true);
$('#moreMenu').addEventListener('click', (e)=>{
  const act = e.target.dataset.action;
  if(act==='download') doDownload();
  if(act==='copy') copyLink();
  if(act==='print') window.print();
  if(act==='report') toast('Thanks for your feedback');
  $('#moreMenu').hidden = true;
});

// Share / copy link
function copyLink(){
  const url = location.href;
  navigator.clipboard.writeText(url).then(()=> toast('Link copied ✓'), ()=> {
    prompt('Copy link:', url);
  });
}
$('#shareBtn').addEventListener('click', copyLink);
$('#copyLinkBtn').addEventListener('click', copyLink);

// Drawer
const drawer = $('#drawer');
$('#infoBtn').addEventListener('click', ()=> { drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); });
$('#closeDrawer').addEventListener('click', ()=> { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); });

// Local file picker (for testing without hosting)
$('#localFile').addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const url = URL.createObjectURL(f);
  attachVideo(url, f.name);
  video.play().catch(()=>{});
  toast(`Loaded: ${f.name}`);
});

// Init
(function init(){
  const { v, title } = parseQuery();
  const url = v || window.VIDEO_URL;
  const name = title || window.VIDEO_TITLE || (url ? url.split('/').pop().split('?')[0] : "");
  setTitle(name || "Video.mp4");
  if(url){
    attachVideo(url, name);
  }else{
    // No video configured -> show helper but keep page usable
    showError();
    showLoader(false);
    detailSize.textContent = "—";
    detailDuration.textContent = "—";
  }
  // If video element has poster via ?poster=
  const poster = new URLSearchParams(location.search).get('poster');
  if(poster) video.poster = poster;

  // Autoplay attempt (muted autoplay allowed, then unmute on interaction)
  // We try play after metadata to mimic Drive instant preview
  video.addEventListener('loadedmetadata', ()=>{
    // do not force autoplay if user prefers reduced motion
    // Try silent autoplay for instant feel
    const p = video.play();
    if(p) p.catch(()=>{ /* wait for click */ });
  }, { once:true });
})();
