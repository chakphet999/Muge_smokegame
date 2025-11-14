// Breath Better — game logic (updated full version)
const DEFAULT = {
  health: 80,//สุขภาพ
  mind: 30,//ความเครียด
  craving: 40,//ความอยากสูบ
  motivation: 50,//แรงจูงใจ
  day: 1,
  badges: []
};

let state = {};

const activities = [
  {id:'exercise', name:'🏃 ออกกำลังกาย', effect: s => ({health: +6, craving: -8, mind: -6, motivation: +5}), desc:'ลดความอยาก เพิ่มสุขภาพ'},
  {id:'coffee', name:'☕ ดื่มกาแฟ', effect: s => ({craving: +6, mind: +4}), desc:'เพิ่มความอยากเล็กน้อย'},
  {id:'breathe', name:'🧘 ฝึกหายใจ', effect: s => ({mind: -10, motivation: +6}), desc:'ลดความเครียด เพิ่มแรงจูงใจ'},
  {id:'media', name:'📱 ดูสื่อรณรงค์', effect: s => ({motivation: +8, craving: -3}), desc:'เพิ่มความรู้และแรงจูงใจ'},
  {id:'talk', name:'💬 คุยเพื่อน/ครอบครัว', effect: s => ({motivation: +6, mind: -4}), desc:'รับการสนับสนุนทางใจ'}
];

const randomEvents = [
  {id:'peer', name:'เพื่อนชวนสูบ', options:['ปฏิเสธ','หลีกเลี่ยง','ยอม'], apply: (opt,s)=> {
    if(opt==='ปฏิเสธ') return {motivation:+4,craving:+2,mind:-2};
    if(opt==='หลีกเลี่ยง') return {craving:-4,mind:+0};
    return {craving:+10,motivation:-6,health:-6};
  }},
  {id:'stress', name:'งานเครียด', options:['ควบคุม','พัก','ปล่อย'], apply:(opt,s)=>{
    if(opt==='ควบคุม') return {mind:-6,motivation:-2,craving:+3};
    if(opt==='พัก') return {mind:-8,motivation:+3,craving:-2};
    return {mind:+6,craving:+8};
  }},
  {id:'public', name:'เจอคนสูบข้างหน้า', options:['เดินหนี','ยืนเฉย','เข้าสื่อ'], apply:(opt,s)=>{
    if(opt==='เดินหนี') return {craving:-6,mind:-2};
    if(opt==='ยืนเฉย') return {craving:+4,health:-7};
    return {motivation:+5};
  }},
  {id:'stress', name:'ความเครียดสูง', options:['ควบคุม','ดูดบุหรี่','ปล่อย'], apply:(opt,s)=>{
    if(opt==='ควบคุม') return {mind:-6,motivation:-2,craving:+3};
    if(opt==='ดูดบุหรี่') return {mind:-15,motivation:+8,craving:-2,health:-15};
    return {mind:+8,craving:+12};
  }}
];

const challenges = [
  {id:'3days', name:'ไม่แตะบุหรี่ 3 วัน', check: st => st.noSmokeDays >= 3, reward: s=>({motivation:+10, badges: '3days'})},
  {id:'surviveStress', name:'เอาตัวรอดจากงานเครียด', check: st => st.survivedStress, reward: s=>({health:+5, badges: 'surviveStress'})},
  {id:'health80', name:'รักษาสุขภาพ > 80%', check: st => st.health > 80, reward: s=>({motivation:+8, badges: 'health80'})}
];

// DOM refs
const healthEl = document.getElementById('health');
const mindEl = document.getElementById('mind');
const cravingEl = document.getElementById('craving');
const motivationEl = document.getElementById('motivation');
const healthVal = document.getElementById('healthVal');
const mindVal = document.getElementById('mindVal');
const cravingVal = document.getElementById('cravingVal');
const motivationVal = document.getElementById('motivationVal');
const choicesEl = document.getElementById('choices');
const logEl = document.getElementById('log');
const daySummary = document.getElementById('daySummary');
const chList = document.getElementById('chList');
const badgesEl = document.getElementById('badges');

// init
function init(){
  loadState();
  renderChoices();
  renderState();
  renderChallenges();
  renderBadges();
  writeLog('ยินดีต้อนรับสู่ Breath Better — เริ่มเล่นได้เลย');
}

function loadState(){
  const raw = localStorage.getItem('breathbetter');
  if(raw){ state = JSON.parse(raw); writeLog('โหลดสถานะจากเครื่อง'); }
  else{ state = Object.assign({}, DEFAULT, {noSmokeDays:0, survivedStress:false}); }
}

function saveState(){ localStorage.setItem('breathbetter', JSON.stringify(state)); writeLog('บันทึกสถานะแล้ว'); }

function resetState(){ if(confirm('ต้องการรีเซ็ตเกมใช่หรือไม่?')){ localStorage.removeItem('breathbetter'); location.reload(); } }

function renderChoices(){
  choicesEl.innerHTML = '';
  activities.forEach(act=>{
    const el = document.createElement('div'); el.className='choice'; el.dataset.id=act.id; el.innerHTML = `<strong>${act.name}</strong><div class="muted">${act.desc}</div>`;
    el.addEventListener('click', ()=> toggleChoice(el));
    choicesEl.appendChild(el);
  });
}

function toggleChoice(el){
  const selected = [...choicesEl.querySelectorAll('.choice.selected')];
  if(el.classList.contains('selected')) el.classList.remove('selected');
  else{
    if(selected.length >= 3){ alert('เลือกได้แค่ 3 กิจกรรมต่อวัน'); return; }
    el.classList.add('selected');
  }
}

function getSelectedActivities(){
  return [...choicesEl.querySelectorAll('.choice.selected')].map(el=> activities.find(a=>a.id===el.dataset.id));
}

function applyDay(){
  const chosen = getSelectedActivities();
  if(chosen.length !== 3){ alert('โปรดเลือกกิจกรรม 3 อย่าง'); return; }
  writeLog(`วัน ${state.day}: คุณเลือก ${chosen.map(c=>c.name).join(', ')}`);
  chosen.forEach(c => applyEffect(c.effect));
  const evt = randomEvents[Math.floor(Math.random()*randomEvents.length)];
  askEvent(evt);
  updateDaySummary();
  checkChallenges();
  renderState();
  saveState();
}

function applyEffect(effect){
  const delta = effect(state);
  applyDeltas(delta);
}

function applyDeltas(delta){
  state.health = clamp(state.health + (delta.health||0));
  state.mind = clamp(state.mind + (delta.mind||0));
  state.craving = clamp(state.craving + (delta.craving||0));
  state.motivation = clamp(state.motivation + (delta.motivation||0));
}

function clamp(v){ return Math.max(0, Math.min(100, Math.round(v))); }

function writeLog(txt){
  const p = document.createElement('div'); p.textContent = `[${new Date().toLocaleTimeString()}] ${txt}`; logEl.prepend(p);
}

function updateDaySummary(){
  daySummary.textContent = `สรุปวัน ${state.day}: สุขภาพ ${state.health}, ความเครียด ${state.mind}, ความอยาก ${state.craving}, แรงจูงใจ ${state.motivation}`;
  state.day++;
}

function checkChallenges(){
  challenges.forEach(ch => {
    if(!state.badges.includes(ch.id) && ch.check(state)){
      const rew = ch.reward(state);
      applyDeltas(rew);
      if(rew.badges) state.badges.push(ch.id);
      writeLog(`🎖️ คุณได้รางวัลจาก: ${ch.name}`);
    }
  });
}

function renderState(){
  healthEl.value = state.health; healthVal.textContent = state.health;
  mindEl.value = state.mind; mindVal.textContent = state.mind;
  cravingEl.value = state.craving; cravingVal.textContent = state.craving;
  motivationEl.value = state.motivation; motivationVal.textContent = state.motivation;
}

function renderChallenges(){
  chList.innerHTML = '';
  challenges.forEach(ch =>{
    const li = document.createElement('li'); li.textContent = ch.name + (state.badges.includes(ch.id) ? ' — สำเร็จ' : '');
    chList.appendChild(li);
  });
}

function renderBadges(){
  badgesEl.innerHTML = '';
  state.badges.forEach(b=>{
    const d = document.createElement('div'); d.className='badge'; d.textContent = b; badgesEl.appendChild(d);
  });
}

function askEvent(evt){
  const opt = prompt(`เหตุการณ์: ${evt.name}\nตัวเลือก: ${evt.options.join(' | ')}\nพิมพ์ตัวเลือกที่ต้องการ`, evt.options[0]);
  if(!opt) { writeLog('ไม่มีการตอบกลับ เหตุการณ์ผ่านไป'); return; }
  const delta = evt.apply(opt,state);
  applyDeltas(delta);
  if(evt.id==='stress' && opt!=='ปล่อย') state.survivedStress = true;
  if(evt.id==='peer' && opt!=='ยอม') state.noSmokeDays = (state.noSmokeDays||0)+1;
  else if(evt.id==='peer' && opt==='ยอม') state.noSmokeDays=0;
  writeLog(`เหตุการณ์: ${evt.name} — เลือก ${opt}`);
}

// Event listeners
document.getElementById('confirmDay').addEventListener('click', applyDay);
document.getElementById('nextDay').addEventListener('click', ()=>{ writeLog('วันใหม่เริ่มขึ้น — เลือกกิจกรรมต่อ'); renderState(); });
document.getElementById('saveBtn').addEventListener('click', saveState);
document.getElementById('resetBtn').addEventListener('click', resetState);
document.getElementById('btnNewGame').addEventListener('click', ()=>{ if(confirm('เริ่มเกมใหม่?')){ localStorage.removeItem('breathbetter'); location.reload(); }});
document.getElementById('btnLoad').addEventListener('click', ()=>{ loadState(); renderState(); renderChallenges(); renderBadges(); writeLog('โหลดสถานะ'); });
document.getElementById('showBadges').addEventListener('click', ()=> alert('Badges: '+state.badges.join(', ')));

init();
