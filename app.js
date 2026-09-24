// js/app.js
// Logika aplikasi ProctorOne Client (POC).
// Bergantung pada auth/db/provider yang sudah diinisialisasi di firebase-config.js

let currentUser = null;
let selectedLevel = null;
let currentExam = null;     // {id, title, level, durationSeconds, questions:[{id,text,options,correctIndex}]}
let answers = {};           // qId -> optionIndex
let qIndex = 0;
let strikes = 0;
const MAX_STRIKES = 3;
let timeLeft = 0, timerHandle = null;
let autoSubmitted = false;
let examSessionActive = false;
let lastTabSwitchAt = 0;

const $ = id => document.getElementById(id);
const show = id => { document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); };
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2600); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- login ---------------- */
$('levelPicker').addEventListener('click', e=>{
  const opt = e.target.closest('.level-opt'); if(!opt) return;
  document.querySelectorAll('.level-opt').forEach(o=>o.classList.remove('on'));
  opt.classList.add('on'); selectedLevel = opt.dataset.level;
});

$('btnGoogle').addEventListener('click', async ()=>{
  const msg = $('loginMsg'); msg.style.display='none';
  if(!selectedLevel){ msg.textContent='Pilih jenjang (SD / SMP / SMA-SMK) terlebih dahulu.'; msg.style.display='block'; return; }
  try{
    const res = await auth.signInWithPopup(provider);
    await db.collection('users').doc(res.user.uid).set({
      name: res.user.displayName, email: res.user.email, level: selectedLevel,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
  }catch(err){
    msg.textContent = err.code === 'auth/unauthorized-domain'
      ? 'Domain ini belum diizinkan di Firebase Console (Authentication → Settings → Authorized domains).'
      : 'Gagal login: ' + err.message;
    msg.style.display='block';
  }
});

auth.onAuthStateChanged(async user=>{
  if(!user){ currentUser=null; show('screen-login'); return; }
  currentUser = user;
  const snap = await db.collection('users').doc(user.uid).get();
  const data = snap.data() || {};
  selectedLevel = data.level || selectedLevel || 'SD';
  $('whoName').textContent = user.displayName || user.email;
  $('dashLevel').textContent = selectedLevel === 'SMA' ? 'SMA/SMK' : selectedLevel;
  show('screen-dashboard');
  loadExams();
});

$('btnLogout').addEventListener('click', ()=> auth.signOut());

/* ---------------- dashboard ---------------- */
async function loadExams(){
  const list = $('examList');
  list.innerHTML = '<div class="empty-state">Memuat daftar ujian…</div>';
  try{
    const q = await db.collection('exams').where('level','==',selectedLevel).get();
    if(q.empty){
      list.innerHTML = '<div class="empty-state">Belum ada ujian untuk jenjang ini.<br>Tambahkan dokumen ke koleksi <code>exams</code> di Firestore dengan field <code>level</code> = "'+selectedLevel+'". Lihat README.md.</div>';
      return;
    }
    list.innerHTML = '';
    q.forEach(doc=>{
      const e = doc.data();
      const mins = Math.round((e.durationSeconds||0)/60);
      const div = document.createElement('div');
      div.className='exam-item';
      div.innerHTML = `<div><h3>${escapeHtml(e.title||'Ujian')}</h3>
        <div class="meta"><span>⏱ ${mins} menit</span><span>❓ ${(e.questions||[]).length} soal</span></div></div>
        <button class="btn-start">Mulai</button>`;
      div.querySelector('.btn-start').addEventListener('click', ()=> startExam(doc.id, e));
      list.appendChild(div);
    });
  }catch(err){
    list.innerHTML = '<div class="empty-state">Gagal memuat ujian: '+escapeHtml(err.message)+'</div>';
  }
}

/* ---------------- exam lockdown ---------------- */
async function startExam(id, data){
  currentExam = {id, ...data};
  answers = {}; qIndex = 0; strikes = 0; autoSubmitted = false;
  timeLeft = data.durationSeconds || 1800;
  renderStrikes();
  show('screen-exam');
  try{ await document.documentElement.requestFullscreen(); }catch(e){ toast('Aktifkan layar penuh secara manual untuk melanjutkan.'); }
  examSessionActive = true;
  attachLockListeners();
  startTimer();
  renderQuestion();
}

function renderStrikes(){
  $('strikeWrap').innerHTML = Array.from({length:MAX_STRIKES}).map((_,i)=>`<div class="strike-dot ${i<strikes?'used':''}"></div>`).join('');
}
function registerStrike(reason){
  if(!examSessionActive) return;
  strikes++; renderStrikes();
  toast(`Pelanggaran (${strikes}/${MAX_STRIKES}): ${reason}`);
  if(strikes >= MAX_STRIKES){ submitExam(true); }
}

function attachLockListeners(){
  document.addEventListener('visibilitychange', onVisChange);
  window.addEventListener('blur', onBlur);
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('contextmenu', blockEvt);
  document.addEventListener('copy', blockEvt);
  document.addEventListener('cut', blockEvt);
  document.addEventListener('paste', blockEvt);
  document.addEventListener('keydown', onKeyDown);
  window._devtoolsPoll = setInterval(checkDevtools, 1200);
}
function detachLockListeners(){
  document.removeEventListener('visibilitychange', onVisChange);
  window.removeEventListener('blur', onBlur);
  document.removeEventListener('fullscreenchange', onFsChange);
  document.removeEventListener('contextmenu', blockEvt);
  document.removeEventListener('copy', blockEvt);
  document.removeEventListener('cut', blockEvt);
  document.removeEventListener('paste', blockEvt);
  document.removeEventListener('keydown', onKeyDown);
  clearInterval(window._devtoolsPoll);
}
function blockEvt(e){ if(examSessionActive) e.preventDefault(); }
function onVisChange(){
  if(document.hidden && examSessionActive){
    const now = Date.now();
    if(now - lastTabSwitchAt > 1500){ lastTabSwitchAt = now; registerStrike('berpindah tab'); }
  }
}
function onBlur(){
  const now = Date.now();
  if(examSessionActive && now - lastTabSwitchAt > 1500){ lastTabSwitchAt = now; registerStrike('keluar dari jendela'); }
}
function onFsChange(){
  if(!document.fullscreenElement && examSessionActive){ $('lockOverlay').classList.add('show'); }
  else { $('lockOverlay').classList.remove('show'); }
}
$('btnRefocus').addEventListener('click', async ()=>{
  try{ await document.documentElement.requestFullscreen(); registerStrike('keluar layar penuh'); }catch(e){}
});
function onKeyDown(e){
  const k = e.key.toLowerCase();
  const blocked = e.key==='F12' || (e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(k)) || (e.ctrlKey&&['u','s','p'].includes(k));
  if(blocked && examSessionActive){ e.preventDefault(); registerStrike('mencoba membuka developer tools'); }
}
let dtWarned=false;
function checkDevtools(){
  const wDiff = window.outerWidth - window.innerWidth;
  const hDiff = window.outerHeight - window.innerHeight;
  if((wDiff>170 || hDiff>170) && examSessionActive){
    if(!dtWarned){ dtWarned=true; registerStrike('panel developer tools terdeteksi terbuka'); }
  } else { dtWarned=false; }
}

function startTimer(){
  clearInterval(timerHandle);
  updateTimerUI();
  timerHandle = setInterval(()=>{
    timeLeft--;
    updateTimerUI();
    if(timeLeft<=0){ submitExam(true); }
  },1000);
}
function updateTimerUI(){
  const m = Math.max(0,Math.floor(timeLeft/60)), s = Math.max(0,timeLeft%60);
  $('timerDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  $('timerDisplay').classList.toggle('low', timeLeft<=60);
}

function renderQuestion(){
  const q = currentExam.questions[qIndex];
  $('qProgress').textContent = `Soal ${qIndex+1} dari ${currentExam.questions.length}`;
  $('qText').textContent = q.text;
  $('qOptions').innerHTML = q.options.map((opt,i)=>`
    <div class="opt ${answers[q.id]===i?'on':''}" data-i="${i}">
      <div class="idx">${String.fromCharCode(65+i)}</div><div>${escapeHtml(opt)}</div>
    </div>`).join('');
  $('qOptions').querySelectorAll('.opt').forEach(el=>{
    el.addEventListener('click', ()=>{
      answers[q.id] = parseInt(el.dataset.i);
      saveProgress();
      renderQuestion();
    });
  });
  $('btnPrev').disabled = qIndex===0;
  const last = qIndex === currentExam.questions.length-1;
  $('btnNext').style.display = last ? 'none' : 'block';
  $('btnSubmit').style.display = last ? 'block' : 'none';
}
$('btnPrev').addEventListener('click', ()=>{ if(qIndex>0){ qIndex--; renderQuestion(); }});
$('btnNext').addEventListener('click', ()=>{ if(qIndex<currentExam.questions.length-1){ qIndex++; renderQuestion(); }});
$('btnSubmit').addEventListener('click', ()=> submitExam(false));

function saveProgress(){
  if(!currentUser||!currentExam) return;
  db.collection('submissions').doc(`${currentUser.uid}_${currentExam.id}`).set({
    uid: currentUser.uid, examId: currentExam.id, answers, strikes,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, {merge:true}).catch(()=>{});
}

async function submitExam(auto){
  if(!examSessionActive) return;
  examSessionActive = false;
  autoSubmitted = auto;
  clearInterval(timerHandle);
  detachLockListeners();
  $('lockOverlay').classList.remove('show');
  if(document.fullscreenElement){ try{ await document.exitFullscreen(); }catch(e){} }

  const qs = currentExam.questions;
  let correct = 0;
  qs.forEach(q=>{ if(answers[q.id]===q.correctIndex) correct++; });
  const score = qs.length ? Math.round((correct/qs.length)*100) : 0;

  await db.collection('submissions').doc(`${currentUser.uid}_${currentExam.id}`).set({
    uid: currentUser.uid, examId: currentExam.id, answers, strikes, score,
    autoSubmitted: auto, submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, {merge:true}).catch(()=>{});

  $('resultTitle').textContent = currentExam.title;
  $('resultScore').textContent = score;
  $('resultSub').textContent = `dari 100 poin · ${correct}/${qs.length} benar`;
  $('resultStrikes').textContent = `${strikes} / ${MAX_STRIKES}`;
  $('resultAuto').textContent = auto ? 'Ya' : 'Tidak';
  show('screen-result');
}
$('btnBackDash').addEventListener('click', ()=>{ show('screen-dashboard'); loadExams(); });
