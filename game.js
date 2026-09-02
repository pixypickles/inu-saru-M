'use strict';


// ===== v1.5 meta game / field map =====
const VERSION='v3.11-AKAGI-SEPARATED-ROADS';
const RACE_LAPS=1;

const CHARACTER_DATA={
 Michael:{jp:'ミカエルさん',color:'#49a94f',wing:'special'},
 Gabriel:{jp:'ガブリエルさん',color:'#3188e6'},
 Plain:{jp:'もぶさん',color:'#78a83c'},
 Raphael:{jp:'ラファエルさん',color:'#e6c83e'},
 Uriel:{jp:'ウリエルさん',color:'#e88735'},
 Lucifer:{jp:'ルシファーさん',color:'#666a70'},
 Lilith:{jp:'リリスさん',color:'#ef78ad'},
 Beelzebub:{jp:'ベルゼブブさん',color:'#101515'},
 Kawazu:{jp:'カワズさん',color:'#329451',wing:'red'},
 Azazel:{jp:'アザゼルさん',color:'#8c5a9e'},
 Leviathan:{jp:'リヴァイアさん',color:'#d65a48'},
 Asmodeus:{jp:'アスモデウスさん',color:'#d64b35'},
 Belial:{jp:'ベリアルさん',color:'#49324f'},
 Takumi:{jp:'タクミさん',color:'#f4f3ec',wing:'special'},
 Bunta:{jp:'ブンタさん',color:'#2456b8',wing:'blue'},
 Inu:{jp:'イヌさん',color:'#c58b52',wing:'special',species:'dog'},
 Saru:{jp:'マコさん',color:'#3188e6',wing:'special',species:'monkey'},
 Nakazato:{jp:'ナカザトさん',color:'#202329',wing:'special',species:'dog'},
 Keisuke:{jp:'ケイスケさん',color:'#f2d13d',wing:'special',species:'frog'},
 Akiyama:{jp:'アキヤマさん',color:'#f4f3ec',wing:'special',species:'dog'},
 Ryosuke:{jp:'リョウスケさん',color:'#ffffff',wing:'special',species:'frog'}
};
const TOURNAMENT_ROSTER=['Gabriel','Raphael','Uriel','Lucifer','Lilith'];
function randomTournamentOpponent(exclude=[]){
 const pool=TOURNAMENT_ROSTER.filter(n=>!exclude.includes(n));
 return pool[Math.floor(Math.random()*pool.length)]||'Gabriel';
}
function buildTournament(place){
 if(place==='akina')return ['Keisuke'];
 if(place==='usui')return ['Saru'];
 if(place==='myogi')return ['Nakazato'];
 if(place==='shomaru')return ['Akiyama'];
 if(place==='akagi')return ['Ryosuke'];
 return ['Inu'];
}
function tournamentKey(place,courseIndex){return place+'_'+TOURNAMENT_LABELS[courseIndex];}

let appState='title';
let currentPlace='field';
let tournament=null;
let saveData={
  started:false,
  selectedCharacter:'Michael',
  michaelSkillA:'burningWing',
  michaelSkillB:'driftFlight',
  kawazuSkillA:'burningWing',
  kawazuSkillB:'highJump',
  unlockedSkills:['punch','bubble'],encountered:['Plain'],
  wins:0,
  arenaWins:0,
  tournamentWins:{},masterUnlocked:false,kawazuUnlocked:false,takumiUnlocked:true,timeLagUnlocked:false,timeStopUnlocked:false
};

function loadSave(){
  try{
    const raw=localStorage.getItem('angelFrogRaceSave');
    if(raw) saveData={...saveData,...JSON.parse(raw)};
    saveData.encountered=saveData.encountered||['Plain'];
    saveData.unlockedSkills=saveData.unlockedSkills||['punch','bubble'];
    if(!saveData.kawazuSkillA||saveData.kawazuSkillA==='airSwim')saveData.kawazuSkillA='burningWing';
    if(!saveData.kawazuSkillB||saveData.kawazuSkillB==='wallKick')saveData.kawazuSkillB='highJump';
    saveData.takumiUnlocked=true;saveData.michaelSkillA='burningWing';saveData.michaelSkillB='driftFlight';saveData.timeLagUnlocked=!!saveData.timeLagUnlocked;saveData.timeStopUnlocked=!!saveData.timeStopUnlocked;
    if(!saveData.timeStopUnlocked)saveData.unlockedSkills=saveData.unlockedSkills.filter(x=>x!=='timeStop');
    if(saveData.timeLagUnlocked&&!saveData.unlockedSkills.includes('timeLag'))saveData.unlockedSkills.push('timeLag');
    if(saveData.timeStopUnlocked&&!saveData.unlockedSkills.includes('timeStop'))saveData.unlockedSkills.push('timeStop');
  }catch(e){}
}
function saveGame(){
  saveData.started=true;
  try{localStorage.setItem('angelFrogRaceSave',JSON.stringify(saveData));}catch(e){}
  const st=document.querySelector('#status'); if(st) st.textContent='セーブしました';
}
function hideAllScreens(){
  ['#titleScreen','#storyScreen','#tutorialScreen','#fieldScreen','#homePanel','#placePanel','#raceUi'].forEach(id=>document.querySelector(id)?.classList.add('hidden'));
}
function showTitle(){
  appState='title';hideAllScreens();document.querySelector('#titleScreen')?.classList.remove('hidden');
  document.querySelector('#versionBadge')?.classList.remove('hidden');
}
function showField(){
  appState='field';hideAllScreens();document.querySelector('#fieldScreen')?.classList.remove('hidden');
  document.querySelector('#versionBadge')?.classList.remove('hidden');updateFieldUi();
}
function updateFieldUi(){
  const n=CHARACTER_DATA[saveData.selectedCharacter]?.jp?.replace('さん','')||saveData.selectedCharacter;
  const el=document.querySelector('#fieldPlayer');if(el)el.textContent='操作：'+n;
}
const MICHAEL_ORIGINAL_SKILLS=[['normalHighJump','ハイジャンプ'],['burningWing','バーニングウィング'],['highJump','バーニングクライム'],['timeLag','タイムラグ'],['timeStop','時間停止']];
const LEARNABLE_SKILLS={
 Gabriel:[['waterBoost','水ブースト'],['waterLaser','水レーザー']],
 Raphael:[['airBarrier','エアバリア'],['airBoost','エアブースト']],
 Uriel:[['tackle','タックル'],['rockFall','ロックフォール']],
 Lucifer:[['smashDown','叩き落とし'],['chargeBoost','チャージブースト']],
 Lilith:[['kick','キック'],['bewitch','惑いの瘴気']],
 Beelzebub:[['poisonShot','毒液'],['poisonBoost','ポイズンブースト']]
};
function skillLabel(id){
 const base={punch:'パンチ',bubble:'泡弾',airSwim:'エアースイム',wallKick:'壁キック',normalHighJump:'ハイジャンプ',burningWing:'バーニングウィング',highJump:'バーニングクライム',timeLag:'タイムラグ（禁断・周囲50% / 6秒）',timeStop:'時間停止（禁断・3秒）',gutterRun:'溝落とし',gutterDrop:'溝落とし',cornerExit:'コーナー脱出加速（基本性能）',driftFlight:'ドリフト飛行'};if(base[id])return base[id];
 for(const [who,list] of Object.entries(LEARNABLE_SKILLS)){let x=list.find(v=>v[0]===id);if(x)return x[1]+'（'+CHARACTER_DATA[who].jp+'）';}
 return id;
}
function rebuildSkillSelects(){
 const a=document.querySelector('#skillASelect'),b=document.querySelector('#skillBSelect');if(!a||!b)return;
 const isTakumi=saveData.selectedCharacter==='Takumi';a.disabled=true;b.disabled=true;
 if(isTakumi){a.innerHTML='<option value="gutterDrop">溝落とし</option>';b.innerHTML='<option value="driftFlight">ドリフト飛行</option>';document.querySelector('#skillSetupTitle').textContent='タクミ 固定スキル';document.querySelector('#skillSetupNote').textContent='A：溝落とし　B：ドリフト飛行。コーナー脱出加速は基本性能。';}
 else{saveData.michaelSkillA='burningWing';saveData.michaelSkillB='driftFlight';a.innerHTML='<option value="burningWing">バーニングウィング</option>';b.innerHTML='<option value="driftFlight">ドリフト飛行</option>';document.querySelector('#skillSetupTitle').textContent='ミカエル 固定スキル';document.querySelector('#skillSetupNote').textContent='A：バーニングウィング（1レース3回）　B：ドリフト飛行。';}
}
function learnFromOpponent(name){
 const list=LEARNABLE_SKILLS[name];if(!list)return false;let learned=[];
 for(const [id,label] of list)if(!saveData.unlockedSkills.includes(id)){saveData.unlockedSkills.push(id);learned.push(label);}
 if(learned.length){saveGame();return learned;}return false;
}

function showHome(){
  appState='home';hideAllScreens();document.querySelector('#fieldScreen')?.classList.remove('hidden');document.querySelector('#homePanel')?.classList.remove('hidden');
  document.querySelector('#kawazuCharBtn')?.classList.add('hidden');document.querySelector('#takumiCharBtn')?.classList.remove('hidden');if(!['Michael','Takumi'].includes(saveData.selectedCharacter))saveData.selectedCharacter='Michael';
  rebuildSkillSelects();
  document.querySelectorAll('.charBtn').forEach(b=>b.classList.toggle('selected',b.dataset.char===saveData.selectedCharacter));
  const a=document.querySelector('#skillASelect'),b=document.querySelector('#skillBSelect'),isK=saveData.selectedCharacter==='Kawazu';
  if(saveData.selectedCharacter!=='Takumi'){if(a)a.value=isK?saveData.kawazuSkillA:saveData.michaelSkillA;if(b)b.value=isK?saveData.kawazuSkillB:saveData.michaelSkillB;}
}
let eventChallenge=null;
function startLearningRace(name,place){
  startCaptureTraining({place,opponent:name,title:(CHARACTER_DATA[name]?.jp||name)+'のスキル'});
}
function showPlace(place){
 appState='place';currentPlace=place;hideAllScreens();document.querySelector('#fieldScreen')?.classList.remove('hidden');document.querySelector('#placePanel')?.classList.remove('hidden');
 const data={practice:['🎯 練習場','ジャンプ、バーニングウィング、ドリフト飛行を自由に練習できます。'],akina:['🍁 アキナ山','黄色いカエルのケイスケさんが待つ一本道の峠。高速ドリフトと極限集中を使います。'],usui:['🌿 ウスイ','40000×40000ワールドの閉ループ峠。近接道路は別区間のまま保持します。'],myogi:['⛰️ 妙義','細長い折り返しと連続S字が続くポイント・トゥ・ポイント峠。ナカザトさんが待っています。'],shomaru:['🛣️ 正丸','細かい切り返しと複合ヘアピンが続くポイント・トゥ・ポイント峠。タクミさんと同系色の犬・アキヤマさんが待っています。ドッカン・ターボとドリフトを使います。'],akagi:['🔴 赤城','右上STARTから左下FINISHへ駆け下りる高速ダウンヒル。START直後は余計な折り返しを入れず高速区間へ入り、近接道路は細いまま分離します。純白のカエル・リョウスケさんは「公道最速理論」と「ゼロ・ミス」を常時発動する最強ライバルです。']}[place]||['峠','準備中のコースです。'];
 document.querySelector('#placeTitle').textContent=data[0];document.querySelector('#placeDesc').textContent=data[1];const actions=document.querySelector('#placeActions');actions.innerHTML='';
 if(place==='practice'){const g=document.createElement('button');g.className='menuBtn';g.textContent='📖 操作説明を見る';g.onclick=()=>showTutorial('practice');actions.appendChild(g);for(const n of ['Inu','Saru']){const q=document.createElement('button');q.className='menuBtn';q.textContent=(CHARACTER_DATA[n]?.jp||n)+'と練習';q.onclick=()=>{tournament=null;currentPlace='practice';startRaceRound(n,true)};actions.appendChild(q);}}
 else if(place==='akina'){const o='Keisuke';const q=document.createElement('button');q.className='menuBtn';q.textContent=(CHARACTER_DATA[o]?.jp||o)+'とアキナバトル';q.onclick=()=>{tournament={place:'akina',round:0,courseIndex:0,opponents:[o]};startRaceRound(o,false)};actions.appendChild(q);}
 else if(place==='usui'){const n='Saru';const q=document.createElement('button');q.className='menuBtn';q.textContent=(CHARACTER_DATA[n]?.jp||n)+'とウスイバトル';q.onclick=()=>{tournament={place:'usui',round:0,courseIndex:0,opponents:[n]};startRaceRound(n,false)};actions.appendChild(q);}
 else if(place==='myogi'){const n='Nakazato';const q=document.createElement('button');q.className='menuBtn';q.textContent=(CHARACTER_DATA[n]?.jp||n)+'と妙義バトル';q.onclick=()=>{tournament={place:'myogi',round:0,courseIndex:0,opponents:[n]};startRaceRound(n,false)};actions.appendChild(q);}
 else if(place==='shomaru'){const n='Akiyama';const q=document.createElement('button');q.className='menuBtn';q.textContent=(CHARACTER_DATA[n]?.jp||n)+'と正丸バトル';q.onclick=()=>{tournament={place:'shomaru',round:0,courseIndex:0,opponents:[n]};startRaceRound(n,false)};actions.appendChild(q);}
 else if(place==='akagi'){const n='Ryosuke';const q=document.createElement('button');q.className='menuBtn';q.textContent=(CHARACTER_DATA[n]?.jp||n)+'と赤城ダウンヒル';q.onclick=()=>{tournament={place:'akagi',round:0,courseIndex:0,opponents:[n]};startRaceRound(n,false)};actions.appendChild(q);}
}

function makeShootingCourse(place){
  const cx=3000,cy=2200,rx=2050,ry=1450,pts=[];
  for(let i=0;i<32;i++){let a=i*Math.PI*2/32;pts.push({x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry});}
  return pts;
}
function makeCaptureCross(){
  // Two full chords through the ring. They make a literal + shaped shortcut:
  // chase around the rim, reverse, or cut through the middle to intercept.
  return [
    [{x:950,y:2200},{x:5050,y:2200}],
    [{x:3000,y:750},{x:3000,y:3650}]
  ];
}
function buildObjectsForPath(pp){
  return {anchors:[],lilies:[]};
}
function capturePointOnRing(q,a){
  return {x:q.cx+Math.cos(a)*q.rx,y:q.cy+Math.sin(a)*q.ry};
}
function startCaptureTraining(opt){
  const place=opt.place,skillId=opt.skillId||null,opponent=opt.opponent||null;
  const forest=place==='forest';
  const enemyName=opponent||(skillId==='timeLag'?'Asmodeus':skillId==='timeStop'?'Belial':forest?'Azazel':'Leviathan');
  const title=opt.title||(skillId==='burningWing'?'バーニングウィング':skillId==='highJump'?'バーニングクライム':skillId==='timeLag'?'タイムラグ':'時間停止');
  const pp=makeShootingCourse(place),cross=makeCaptureCross(),cx=3000,cy=2200,rx=2050,ry=1450;
  const playerName=(skillId==='timeStop'&&saveData.kawazuUnlocked)?'Kawazu':'Michael';
  shootingEvent={
    mode:'capture',place,skillId,opponent,title,enemyName,enemyCreature:!opponent,
    catches:0,need:1,time:48,shots:[],ended:false,bubbleCd:0,tongueCd:0,tongueFx:0,
    slow:0,reverseCd:2.5,enemyDir:Math.random()<.5?1:-1,cx,cy,rx,ry,
    playerAngle:Math.PI,enemyAngle:0,
    path:pp,branches:cross,halfWidth:255,anchors:[],lilies:[],theme:forest?'forest':'water',
    player:makeRacer(playerName,CHARACTER_DATA[playerName].color,0,cx-rx,cy),
    enemy:makeRacer(enemyName,CHARACTER_DATA[enemyName].color,1,cx+rx,cy)
  };
  const q=shootingEvent;
  q.player.ai=false;q.player.flight=3;q.player.onGround=false;q.player.speed=0;q.player.face=0;
  q.enemy.ai=true;q.enemy.flight=3;q.enemy.onGround=false;q.enemy.speed=0;q.enemy.face=Math.PI;
  appState='shooting';hideAllScreens();document.querySelector('#raceUi')?.classList.remove('hidden');
  ui.lap.textContent='CATCH 0/1';ui.who.textContent='操作：'+(CHARACTER_DATA[q.player.name]?.jp||q.player.name);
  ui.a.innerHTML='A<small>泡弾</small>';ui.b.innerHTML='B<small>泡弾</small>';
  ui.jump.innerHTML='泡弾<small>命中で減速</small>';ui.tongue.innerHTML='舌<small>近距離で自動補正</small>';
  msg((CHARACTER_DATA[enemyName]?.jp||enemyName)+'を舌で1回捕まえろ！ 十字路を使って先回りできる');
}
function startShootingSkillEvent(place,skillId){startCaptureTraining({place,skillId});}
function shootingFire(){
  const q=shootingEvent;if(!q||q.ended||q.bubbleCd>0)return;
  q.bubbleCd=.48;const r=q.player,o=q.enemy,aim=Math.atan2(o.y-r.y,o.x-r.x);
  q.shots.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(aim)*1150,vy:Math.sin(aim)*1150,owner:r,t:2});
}
function shootingTongue(){
  const q=shootingEvent;if(!q||q.ended||q.tongueCd>0)return;
  const r=q.player,o=q.enemy,dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy);
  const range=700;
  if(d>range){q.tongueCd=.18;msg('まだ舌が届かない！');return;}
  // Auto-aim assist: within range the tongue always corrects toward the target.
  q.tongueCd=.85;q.tongueFx=.34;q.catches++;
  q.enemyDir*=-1;q.reverseCd=1.6;q.slow=Math.max(q.slow,1.0);
  ui.lap.textContent='CATCH '+q.catches+'/'+q.need;
  if(q.catches>=q.need){endShootingEvent(true);return;}
  msg('舌で捕まえた！ '+q.catches+'/'+q.need+'　相手が切り返した！');
}
function endShootingEvent(ok){
  const q=shootingEvent;if(!q||q.ended)return;q.ended=true;
  if(ok){
    if(q.opponent){
      const got=learnFromOpponent(q.opponent);
      msg(got&&got.length?(got.join('・')+'を習得！'):'習得済み');
    }else{
      if(!saveData.unlockedSkills.includes(q.skillId))saveData.unlockedSkills.push(q.skillId);
      if(q.skillId==='timeLag')saveData.timeLagUnlocked=true;
      if(q.skillId==='timeStop')saveData.timeStopUnlocked=true;
      saveGame();rebuildSkillSelects();msg(q.title+' 習得！');
    }
    setTimeout(()=>{ui.jump.textContent='ジャンプ';ui.tongue.textContent='舌';shootingEvent=null;showPlace(q.place)},950);
  }else{
    msg('時間切れ！ もう一度追いかけよう');
    setTimeout(()=>{ui.jump.textContent='ジャンプ';ui.tongue.textContent='舌';shootingEvent=null;showPlace(q.place)},850);
  }
}
function nearestOnEventPath(q,px,py){
  let best={d:1e9,qx:px,qy:py};
  const scan=(pts,closed)=>{
    const count=closed?pts.length:pts.length-1;
    for(let i=0;i<count;i++){
      let a=pts[i],b=pts[(i+1)%pts.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1;
      let t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);
      if(d<best.d)best={d,qx,qy};
    }
  };
  scan(q.path,true);
  for(const br of (q.branches||[]))scan(br,false);
  return best;
}
function updateShooting(dt){
  const q=shootingEvent;if(!q||q.ended)return;
  q.time-=dt;q.bubbleCd=Math.max(0,q.bubbleCd-dt);q.tongueCd=Math.max(0,q.tongueCd-dt);q.tongueFx=Math.max(0,q.tongueFx-dt);q.slow=Math.max(0,q.slow-dt);q.reverseCd=Math.max(0,q.reverseCd-dt);
  if(q.time<=0){endShootingEvent(false);return;}
  const r=q.player,o=q.enemy;
  let kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0),dx=joy.x||kx,dy=joy.y||ky,m=Math.hypot(dx,dy);
  if(m>.08){dx/=m;dy/=m;r.face=Math.atan2(dy,dx);r.x+=dx*930*dt;r.y+=dy*930*dt;}
  // Keep the player on either the ring or the + shaped inner shortcuts, softly.
  let near=nearestOnEventPath(q,r.x,r.y),lane=360;
  if(near.d>lane){let px=near.qx-r.x,py=near.qy-r.y,pd=Math.hypot(px,py)||1,pull=Math.min(near.d-lane,1450*dt);r.x+=px/pd*pull;r.y+=py/pd*pull;}
  r.x=Math.max(300,Math.min(world.w-300,r.x));r.y=Math.max(300,Math.min(world.h-300,r.y));

  // Target runs around the same ring. It occasionally reverses, especially when the player gets close.
  let pd=Math.hypot(o.x-r.x,o.y-r.y);
  if(q.reverseCd<=0&&pd<1050&&Math.random()<dt*.75){q.enemyDir*=-1;q.reverseCd=2.2;}
  let enemySpeed=(q.slow>0?0.43:1)*(opponentSpeed(q.enemyName));
  q.enemyAngle+=q.enemyDir*enemySpeed*dt;
  let ep=capturePointOnRing(q,q.enemyAngle);o.x=ep.x;o.y=ep.y;
  let tangent=q.enemyAngle+q.enemyDir*Math.PI/2;o.face=tangent;

  for(let i=q.shots.length-1;i>=0;i--){
    let e=q.shots[i];e.x+=e.vx*dt;e.y+=e.vy*dt;e.t-=dt;
    if(Math.hypot(e.x-o.x,e.y-o.y)<115){q.shots.splice(i,1);q.slow=Math.max(q.slow,2.7);msg('泡弾ヒット！ 相手の動きが遅くなった');}
    else if(e.t<=0)q.shots.splice(i,1);
  }
}
function opponentSpeed(name){
  if(name==='Azazel')return .58;if(name==='Belial')return .47;if(name==='Asmodeus')return .43;if(name==='Leviathan')return .52;
  if(name==='Raphael')return .50;if(name==='Uriel')return .46;if(name==='Lucifer'||name==='Lilith'||name==='Beelzebub')return .52;
  return .48;
}
function drawEventCreature(r,name){
 ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.face||0);ctx.lineWidth=5;ctx.strokeStyle='#263c37';
 if(name==='Leviathan'){
   ctx.fillStyle='#e45a4f';ctx.beginPath();ctx.ellipse(0,0,58,37,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(-48,0);ctx.lineTo(-92,-38);ctx.lineTo(-88,38);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(28,-14,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(32,-14,4,0,Math.PI*2);ctx.fill();
 }else if(name==='Asmodeus'){
   ctx.fillStyle='#d64b35';ctx.beginPath();ctx.ellipse(0,0,52,27,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   for(const sy of [-1,1]){ctx.beginPath();ctx.moveTo(35,sy*18);ctx.lineTo(72,sy*42);ctx.lineTo(91,sy*29);ctx.lineTo(78,sy*12);ctx.closePath();ctx.fill();ctx.stroke();}
 }else if(name==='Azazel'){
   ctx.fillStyle='#52a96b';ctx.beginPath();ctx.ellipse(0,0,55,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle='rgba(210,245,255,.9)';for(const sy of [-1,1])for(const bx of [-8,20]){ctx.beginPath();ctx.ellipse(bx,sy*28,37,13,sy*.45,0,Math.PI*2);ctx.fill();ctx.stroke();}
   ctx.fillStyle='#73c95f';ctx.beginPath();ctx.arc(48,0,20,0,Math.PI*2);ctx.fill();ctx.stroke();
 }else{
   ctx.fillStyle='#49324f';ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(38,0,24,0,Math.PI*2);ctx.fill();ctx.stroke();
   for(const sy of [-1,1])for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-18+i*18,sy*22);ctx.lineTo(-35+i*22,sy*(42+i*5));ctx.lineTo(-18+i*25,sy*62);ctx.stroke();}
 }
 ctx.restore();
}
function drawShooting(){
  const q=shootingEvent;if(!q)return;
  const oldPath=path,oldBranches=courseBranches,oldAnchors=anchors,oldLilies=lilies,oldTheme=courseTheme,oldHalf=courseHalfWidth,oldCourse=activeCourse;
  path=q.path;courseBranches=q.branches||[];anchors=[];lilies=[];courseTheme=q.theme;courseHalfWidth=q.halfWidth||255;
  activeCourse={...oldCourse,pointToPoint:false,noWalls:false};
  const viewW=3100,viewH=viewW*(H/W),scale=W/viewW;
  let cx=Math.max(0,Math.min(world.w-viewW,q.player.x-viewW/2));
  let cy=Math.max(0,Math.min(world.h-viewH,q.player.y-viewH/2));
  ctx.clearRect(0,0,W,H);ctx.save();ctx.scale(scale,scale);ctx.translate(-cx,-cy);
  drawWorld();
  for(const e of q.shots)drawEffect(e);
  drawRacer(q.player);
  if(q.enemyCreature)drawEventCreature(q.enemy,q.enemyName);else drawRacer(q.enemy);
  if(q.slow>0){ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle='#83e6ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(q.enemy.x,q.enemy.y,76,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(q.tongueFx>0){
    let m=tongueMouthPoint(q.player),o=q.enemy;
    ctx.save();ctx.strokeStyle='#e86a91';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.quadraticCurveTo((m.x+o.x)/2,(m.y+o.y)/2+18,o.x,o.y);ctx.stroke();ctx.restore();
  }
  ctx.restore();
  path=oldPath;courseBranches=oldBranches;anchors=oldAnchors;lilies=oldLilies;courseTheme=oldTheme;courseHalfWidth=oldHalf;activeCourse=oldCourse;
  ctx.fillStyle='rgba(15,38,34,.86)';ctx.fillRect(W/2-205,14,410,48);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 18px sans-serif';
  ctx.fillText(`CATCH ${q.catches}/${q.need}　TIME ${Math.max(0,q.time).toFixed(1)}${q.slow>0?'　SLOW':''}`,W/2,45);
}
function applySelectedCharacter(){
  controlledIndex=saveData.selectedCharacter==='Michael'?0:1;
  racers.forEach((r,i)=>r.ai=i!==controlledIndex);
}
function applyMichaelSkills(){
  const michael=racers.find(r=>r.name==='Michael');
  if(michael){michael.customSkillA='burningWing';michael.customSkillB='driftFlight';}
  const kawazu=racers.find(r=>r.name==='Kawazu');
  if(kawazu){kawazu.customSkillA=saveData.kawazuSkillA;kawazu.customSkillB=saveData.kawazuSkillB;}
}
function startRace(practice=false,courseIndex=0){
  if(practice){tournament=null;startRaceRound('Plain',true);return;}
  tournament={place:currentPlace,round:0,courseIndex:0,opponents:buildTournament(currentPlace)};
  startRaceRound(tournament.opponents[0],false);
}
function startRaceRound(opponent,practice=false){
  appState='race';hideAllScreens();document.querySelector('#raceUi')?.classList.remove('hidden');
  selectCourse(tournament?.place||eventChallenge?.racePlace||(practice?'practice':'arena1'),tournament?.courseIndex??tournament?.round??0);reset(opponent);applyMichaelSkills();finished=false;
  camera.x=Math.max(0,Math.min(world.w-W,racers[controlledIndex].x-W/2));
  camera.y=Math.max(0,Math.min(world.h-H,racers[controlledIndex].y-H/2));
  raceStartDelay=1.15;
  saveData.encountered=saveData.encountered||['Plain'];if(!saveData.encountered.includes(opponent)){saveData.encountered.push(opponent);saveGame();}
  racers.forEach(r=>{r.lap=1;r.cp=1;r.finished=false;r.speed=0;});if(activeCourse.pointToPoint)ui.lap.textContent='POINT TO POINT';
  const cup=(tournament?.place||'').startsWith('arena')?(TOURNAMENT_LABELS[tournament.courseIndex]+'大会　'):'';
  msg(practice?('練習開始！ '+activeCourse.name):(cup+(tournament.round+1)+'回戦 / '+tournament.opponents.length+'　'+activeCourse.name+'　VS '+(CHARACTER_DATA[opponent]?.jp||opponent)));
}
function showRaceResult(win){
 if(!tournament){msg(win?'練習終了！':'練習終了');setTimeout(()=>showPlace('practice'),550);return;}
 const back=tournament.place;msg(win?'勝利！':'敗北… もう一度挑戦できます。');if(win){saveData.wins=(saveData.wins||0)+1;saveData.tournamentWins=saveData.tournamentWins||{};saveData.tournamentWins[back]=(saveData.tournamentWins[back]||0)+1;saveGame();}tournament=null;setTimeout(()=>showPlace(back),700);
}
function showTutorial(returnTo='field'){
 tutorialReturn=returnTo;appState='tutorial';hideAllScreens();
 document.querySelector('#tutorialScreen')?.classList.remove('hidden');
}
function closeTutorial(){
 document.querySelector('#tutorialScreen')?.classList.add('hidden');
 if(tutorialReturn==='practice')showPlace('practice');else showField();
}
let storyMode='',storyIndex=0;
function playStory(mode){
 storyMode=mode;storyIndex=0;appState='story';hideAllScreens();
 document.querySelector('#storyScreen')?.classList.remove('hidden');showStoryPage();
}
function showStoryPage(){
 const arr=storyMode==='ending'?ENDING_STORY:OPENING_STORY,p=arr[storyIndex];
 document.querySelector('#storyVisual').textContent=p.v;
 document.querySelector('#storyText').textContent=p.t;
 document.querySelector('#storyNext').textContent=storyIndex===arr.length-1?(storyMode==='ending'?'カワズさん解禁！':'妄想の世界へ'):'次へ';
}
function nextStory(){
 const arr=storyMode==='ending'?ENDING_STORY:OPENING_STORY;
 storyIndex++;
 if(storyIndex<arr.length){showStoryPage();return;}
 if(storyMode==='ending'){saveData.kawazuUnlocked=true;saveGame();showField();}
 else showTutorial('field');
}

function setupMetaUi(){
  loadSave();
  document.querySelector('#storyNext')?.addEventListener('click',nextStory);
  document.querySelector('#tutorialClose')?.addEventListener('click',closeTutorial);
  document.querySelector('#continueBtn')?.addEventListener('click',()=>{loadSave();showField();});
  document.querySelector('#newBtn')?.addEventListener('click',()=>{
    saveData={started:true,selectedCharacter:'Michael',michaelSkillA:'burningWing',michaelSkillB:'driftFlight',kawazuSkillA:'burningWing',kawazuSkillB:'highJump',unlockedSkills:['punch','bubble'],encountered:['Plain'],wins:0,arenaWins:0,tournamentWins:{},masterUnlocked:false,kawazuUnlocked:false,takumiUnlocked:true,timeLagUnlocked:false,timeStopUnlocked:false};
    saveGame();playStory('opening');
  });
  document.querySelector('#saveBtn')?.addEventListener('click',saveGame);
  document.querySelectorAll('.mapSpot').forEach(b=>b.addEventListener('click',()=>{
    const p=b.dataset.place;p==='home'?showHome():showPlace(p);
  }));
  document.querySelectorAll('.backFieldBtn').forEach(b=>b.addEventListener('click',showField));
  document.querySelectorAll('.charBtn').forEach(b=>b.addEventListener('click',()=>{
    if(!['Michael','Takumi'].includes(b.dataset.char))return;saveData.selectedCharacter=b.dataset.char;
    document.querySelectorAll('.charBtn').forEach(x=>x.classList.toggle('selected',x===b));
    saveGame();updateFieldUi();rebuildSkillSelects();
  }));
  document.querySelector('#skillASelect')?.addEventListener('change',e=>{if(saveData.selectedCharacter==='Takumi')return;let isK=saveData.selectedCharacter==='Kawazu',ka=isK?'kawazuSkillA':'michaelSkillA',kb=isK?'kawazuSkillB':'michaelSkillB',old=saveData[ka];if(e.target.value===saveData[kb])saveData[kb]=old;saveData[ka]=e.target.value;saveGame();rebuildSkillSelects();});
  document.querySelector('#skillBSelect')?.addEventListener('change',e=>{if(saveData.selectedCharacter==='Takumi')return;let isK=saveData.selectedCharacter==='Kawazu',ka=isK?'kawazuSkillA':'michaelSkillA',kb=isK?'kawazuSkillB':'michaelSkillB',old=saveData[kb];if(e.target.value===saveData[ka])saveData[ka]=old;saveData[kb]=e.target.value;saveGame();rebuildSkillSelects();});
  document.querySelector('#quitRace')?.addEventListener('click',showField);
  showTitle();
}

const C=document.querySelector('#game'),ctx=C.getContext('2d'),W=C.width,H=C.height;
const ui={who:$('#who'),speed:$('#speed'),lap:$('#lap'),status:$('#status'),curve:$('#curveGuide'),jump:$('#jump'),tongue:$('#tongue'),a:$('#skillA'),b:$('#skillB'),stick:$('#stick')};
function $(s){return document.querySelector(s)}
const world={w:6000,h:4400};const DEFAULT_WORLD={w:6000,h:4400};
const COURSE_SETS={
 practice:[{name:'練習場オーバル',theme:'wind',halfWidth:300,path:[[850,850],[2800,520],[4750,850],[5250,2100],[4750,3450],[2800,3800],[850,3450],[450,2100]]}],
 arena1:[
  {name:'風のオーバル',theme:'wind',halfWidth:300,path:[[850,850],[2800,520],[4750,850],[5250,2100],[4750,3450],[2800,3800],[850,3450],[450,2100]]},
  {name:'風切りトライアングル',theme:'wind',halfWidth:210,path:[[650,3550],[2850,450],[5150,3550],[4300,4050],[2850,3350],[1400,4050]]},
  {name:'空原クローバーリング',theme:'wind',halfWidth:190,path:[[650,2100],[900,850],[2000,450],[3000,850],[4000,450],[5100,900],[5250,2100],[5000,3350],[3950,4050],[3000,3650],[2000,4050],[850,3400]]},
  {name:'風のワイドブーメラン',theme:'wind',halfWidth:215,path:[[650,700],[2850,450],[5050,750],[5250,1900],[4300,2500],[3150,2200],[2450,2850],[3450,3500],[5000,3300],[4750,4100],[2500,4250],[700,3650],[500,2250]]}
 ],
 arena2:[
  {name:'水路ツインルート',theme:'water',halfWidth:190,branches:[[[1300,900],[2200,1450],[3300,1450],[4300,900]]],path:[[650,900],[1300,900],[4300,900],[5100,1400],[5100,3350],[4300,3950],[1300,3950],[550,3350],[550,1500]]},
  {name:'蓮の砂時計',theme:'water',halfWidth:185,path:[[650,700],[2300,500],[3000,1400],[3700,500],[5200,850],[4550,1900],[3700,2350],[4550,2850],[5200,3850],[3700,4100],[3000,3200],[2300,4100],[650,3850],[1300,2850],[2300,2350],[1300,1900]]},
  {name:'蓮花スネーク',theme:'water',pointToPoint:true,halfWidth:175,path:[[500,550],[5000,550],[5000,1250],[900,1250],[900,1950],[4850,1950],[4850,2650],[700,2650],[700,3350],[5000,3350],[5000,4050],[1200,4050]]},
  {name:'水上ロングストレート回廊',theme:'water',halfWidth:180,path:[[500,1750],[5250,1750],[5250,2650],[500,2650]]}
 ],
 arena3:[
  {name:'森の三日月',theme:'forest',halfWidth:270,path:[[650,2100],[900,900],[2200,500],[3900,650],[5000,1500],[4300,2100],[5000,2900],[3900,3800],[2100,3900],[900,3350]]},
  {name:'森の牙',theme:'forest',halfWidth:215,path:[[600,650],[2700,500],[5100,650],[3500,1550],[5000,2200],[3300,2850],[5100,3650],[2850,4000],[600,3650],[2200,2800],[650,2200],[2300,1500]]},
  {name:'トンボ原ダウンヒル',theme:'forest',pointToPoint:true,halfWidth:270,path:[[650,600],[1800,950],[900,1450],[2600,1850],[4800,1350],[5100,2200],[3400,2550],[1300,2350],[700,3150],[2500,3550],[5000,3300],[5250,4000]]},
  {name:'巨木ダブルベイ',theme:'forest',halfWidth:210,extraAnchors:[[1600,850],[4200,850],[4200,3500],[1600,3500]],path:[[650,2100],[900,850],[2200,500],[3000,1200],[3850,500],[5100,900],[5000,1900],[4050,2300],[5000,3150],[4200,4050],[3000,3350],[1800,4050],[650,3350],[1550,2300]]}
 ],
 arena4:[
  {name:'雲海ハイスピードリング',theme:'wind',halfWidth:300,path:[[600,1900],[900,800],[2600,450],[4500,700],[5300,1800],[5000,3000],[3600,3900],[1700,3750],[650,3000]]},
  {name:'天使の二択リボン',theme:'wind',halfWidth:235,branches:[[[1450,700],[2100,1450],[3000,2050],[3900,1450],[4550,700]]],extraAnchors:[[2050,1370],[3000,1960],[3950,1370]],path:[[650,700],[1450,700],[4550,700],[5250,1300],[5250,3400],[4550,3950],[1450,3950],[550,3300],[550,1450]]},
  {name:'急降下つづら折り',theme:'wind',pointToPoint:true,halfWidth:215,path:[[600,600],[5000,600],[5000,1150],[900,1150],[900,1700],[4700,1700],[4700,2250],[1200,2250],[1200,2800],[5000,2800],[5000,3400],[650,3950]]},
  {name:'青空ダブルループ',theme:'wind',halfWidth:235,path:[[600,2100],[1200,800],[2600,600],[3000,2000],[4300,600],[5200,1300],[4100,2200],[5200,3300],[4200,3950],[3000,2600],[1800,3950],[600,3300],[1700,2200]]}
 ],
 arena5:[
  {name:'遺跡スクエア・四連直角',theme:'master',halfWidth:245,path:[[650,650],[5100,650],[5100,1750],[3300,1750],[3300,2850],[5100,2850],[5100,3950],[650,3950],[650,2850],[2350,2850],[2350,1750],[650,1750]]},
  {name:'石門トリプルルート',theme:'master',halfWidth:225,branches:[[[1100,700],[1900,1450],[2900,1850],[3900,1450],[4700,700]],[[1100,700],[1500,2550],[2900,3300],[4300,2550],[4700,700]]],extraAnchors:[[1900,1380],[2900,1780],[3900,1380],[2900,3200]],path:[[650,700],[1100,700],[4700,700],[5250,1550],[5000,3500],[3800,4050],[1900,3900],[600,3100],[500,1800]]},
  {name:'崩落ノコギリ',theme:'master',halfWidth:205,path:[[550,700],[1500,500],[2100,1400],[2700,500],[3300,1400],[3900,500],[5000,900],[4400,1900],[5100,2700],[4200,3500],[3000,4000],[2300,3050],[1600,4000],[600,3500],[1200,2550],[500,1800]]},
  {name:'古代迷宮スパイラル',theme:'master',pointToPoint:true,halfWidth:160,path:[[450,450],[5250,450],[5250,4150],[450,4150],[450,1250],[4550,1250],[4550,3350],[1250,3350],[1250,2050],[3850,2050],[3850,2850],[2050,2850],[2050,2450],[3150,2450]]},
  {name:'遺跡ダウンヒル',theme:'master',pointToPoint:true,halfWidth:225,extraAnchors:[[1450,800],[2150,1150],[1700,1600],[2750,1950],[2200,2400],[3400,2750],[2950,3250],[4200,3500]],path:[[650,550],[1500,550],[2200,900],[1650,1250],[2450,1600],[1800,2050],[2900,2350],[2250,2800],[3500,3100],[3000,3550],[4300,3800],[5200,3450]]}
 ],
 akina:[{name:'アキナ山・下り（113点精密稿）',theme:'akina',pointToPoint:true,halfWidth:190,
 worldOverride:{w:40000,h:40000},originBottomLeft:true,courseDraft:true,courseScale:2,
 spline:'centripetal',splineAlpha:.5,splineTension:.38,splineSteps:7,extraAnchors:[],
 path:[
  [2662,1000],[2762,1615],[3609,3078],[3659,3410],[3510,3643],[2712,4274],
  [2197,4906],[2064,5471],[2263,5986],[2446,5903],[2429,5421],[2629,5055],
  [3360,4391],[4191,4058],[4324,3842],[4374,3460],[4524,3443],[4590,3510],
  [4540,4025],[4158,4706],[3925,6285],[4058,6501],[4590,6917],[5139,7848],
  [5288,7947],[5488,7898],[5321,7332],[5504,7332],[8263,9078],[9676,9476],
  [10008,9693],[10125,9875],[10008,10141],[9576,10391],[9443,10740],[9327,10839],
  [8546,10640],[7798,10740],[7183,10573],[6867,10573],[6418,10673],[6069,11072],
  [5837,11172],[5521,11039],[5321,10756],[5155,10839],[5305,11222],[5604,11404],
  [6285,11488],[6784,11720],[7233,11820],[8778,11720],[9643,11920],[10474,11471],
  [11155,11321],[11620,11039],[11853,11055],[11687,11371],[11188,11670],[10424,11953],
  [10224,12119],[10158,12285],[10208,13116],[10091,13283],[8911,13432],[8629,13798],
  [8546,15011],[8596,15593],[8745,15659],[8911,15560],[8994,15859],[9161,15925],
  [9343,15343],[9526,15310],[9576,15593],[9443,16357],[9875,17321],[10125,17338],
  [10141,16789],[10208,16640],[10357,16640],[10623,17371],[11338,18019],[11271,18235],
  [10274,18452],[9842,18668],[9759,18751],[9759,18900],[9925,19000],[10524,19000],
  [13349,18468],[13565,18269],[13648,17870],[13233,17321],[13183,16640],[13266,16307],
  [13399,16224],[13748,16224],[14463,16773],[14795,16740],[15028,16557],[15609,15460],
  [15792,15294],[15942,15310],[16075,15460],[16141,16075],[16640,17105],[16839,17105],
  [17139,15975],[17338,15792],[17488,15776],[17687,15892],[17936,16540]
 ]}],

 myogi:[{name:'妙義・峠',theme:'myogi',pointToPoint:true,halfWidth:200,worldOverride:{w:40000,h:40000},originBottomLeft:true,courseDraft:true,spline:'centripetal',splineAlpha:.5,splineTension:.24,splineSteps:24,extraAnchors:[],path:[[1800,18580],[1930,19360],[2450,20400],[2970,21440],[3360,21960],[4010,21960],[4790,21830],[5700,21830],[6350,21960],[6610,22480],[6610,23260],[6532,24040],[6740,24560],[7260,25080],[7780,25652],[8040,26250],[7910,26770],[7390,27290],[6610,27810],[5960,28200],[5700,28590],[5960,28850],[6480,28668],[7260,28148],[8040,27550],[8820,26900],[9340,26250],[9730,26120],[10120,26328],[10250,26770],[10068,27160],[9340,27810],[8820,28330],[9080,28772],[9600,28590],[10380,27940],[11160,27290],[11940,27030],[12720,27030],[13500,27030],[14020,26770],[14540,26250],[15060,25860],[15580,25600],[16100,25340],[16360,24820],[16100,24040],[16100,23260],[16360,22480],[16880,21960],[17530,21960],[18180,22350],[18830,23000],[19350,23520],[20000,23780],[20650,23780],[21170,23520],[21300,23130],[21040,22740],[20520,22220],[20000,21700],[19480,21050],[18830,20400],[18180,19750],[17660,19230],[17140,18840],[16880,18450],[17140,18190],[17660,18242],[18180,18580],[18700,18970],[19350,19100],[19870,19360],[20520,19880],[21040,20140],[21560,20010],[22080,19620],[22600,18970],[22990,18320],[23250,17540],[23250,16760],[23250,15980],[22860,15460],[22210,15408],[21690,15590],[21170,15460],[20780,15070],[20780,14550],[21040,14160],[21300,13900],[21690,13640],[22080,13250],[22600,13120],[23120,13250],[23510,13640],[23770,14030],[24160,14030],[24550,13770],[24758,13250],[24810,12600],[24888,11820],[25200,11300],[25590,11170],[25928,11430],[25980,12080],[25980,12730],[26240,13120],[26630,12990],[26890,12470],[26968,11820],[27280,11508],[27670,11690],[27800,12210],[27748,12860],[27930,13380],[28450,13432],[28970,13250],[29360,12860],[29620,12470],[30140,12340],[30660,12210],[31180,12210],[31700,12080],[32220,11820],[32740,11430],[33260,11300],[33780,11300],[34300,11560],[34690,11950],[35080,12340],[35600,12600],[35990,12340],[36120,12470],[36510,13380],[36900,14290],[36510,14940],[36120,15460],[35990,16240],[36250,17020],[36640,17800],[36510,18450],[36120,18970],[35990,19620],[36380,20400],[36770,21050],[37030,21700],[36640,22090],[35860,21960],[34950,21570],[34040,21180],[33130,20790],[32480,20400],[31960,20530],[32090,21050],[32480,21570],[33000,22090],[33520,22610],[33780,23260],[33832,24300],[33650,25340],[33260,26120],[32740,26510],[32350,26380],[31960,25860],[31570,25210],[31180,24820],[30660,24820],[30140,25080],[29620,25600],[29100,26250],[28580,26900],[28060,27390],[27540,27780],[28320,28720]]}],
 akagi:[{name:'赤城・ダウンヒル',theme:'akagi',pointToPoint:true,halfWidth:160,worldOverride:{w:40000,h:40000},originBottomLeft:true,courseDraft:true,spline:'centripetal',splineAlpha:.5,splineTension:.08,splineSteps:24,extraAnchors:[],path:[[33900,36700],[33400,35700],[32600,34700],[31700,33750],[30750,32750],[29850,31750],[29200,30750],[28900,29750],[29000,28900],[29500,28300],[30200,28000],[30650,27400],[30850,26500],[30600,25800],[30150,25500],[29800,25850],[29850,26600],[29500,27500],[29500,27500],[28000,28200],[30000,29600],[31600,29150],[32600,29400],[33400,30100],[34000,30400],[34400,30200],[34500,29700],[34100,29300],[33400,29100],[32900,28600],[33200,28200],[33900,28000],[34200,27600],[34000,27200],[33200,27300],[32500,27500],[32100,27100],[32500,26800],[33300,26600],[33800,26100],[33700,25600],[33200,25400],[32700,25900],[32600,26600],[32300,26900],[32000,26500],[32300,25700],[32500,24700],[32400,23600],[32300,22500],[32500,21600],[32400,20700],[32350,19800],[32600,19300],[33300,19100],[34000,19200],[34400,18900],[34100,18400],[33100,18100],[31800,18150],[30900,17700],[30400,17000],[30200,16200],[29600,15500],[28900,14900],[28500,14300],[28200,13600],[27700,13000],[27200,12400],[26700,12700],[26600,13600],[26600,14600],[26300,15100],[25800,15100],[25500,14600],[25300,13700],[25000,13000],[24600,12600],[24300,12900],[24500,13800],[24900,14700],[24400,15100],[23600,14800],[22900,14300],[22100,13700],[21400,13200],[20700,12900],[19800,12900],[19300,12700],[19100,12200],[19300,11600],[19900,11900],[20000,11800],[21800,13600],[20100,13600],[19300,13000],[18600,12200],[17900,11400],[17100,10500],[16600,10100],[16300,10500],[16300,11600],[16000,12100],[15500,12200],[15100,11700],[15400,11000],[15000,10200],[14300,9500],[13500,8900],[12800,8200],[12000,7300],[11200,6600],[10400,6000],[9700,5200],[9000,4700],[8300,4900],[7900,5600],[7500,5500],[7200,4700],[6700,4000],[6100,4300],[5900,5200],[5500,5500],[5200,5000],[4800,4200],[4500,3300],[4100,2700],[3600,2800],[3400,3500],[3700,4300],[4300,4700],[4500,4100]]}],
 shomaru:[{name:'正丸・峠',theme:'shomaru',pointToPoint:true,halfWidth:200,worldOverride:{w:40000,h:40000},originBottomLeft:true,courseDraft:true,spline:'centripetal',splineAlpha:.5,splineTension:.22,splineSteps:24,extraAnchors:[],path:[
[5152,4953],[5715,6242],[6301,7063],[6980,7344],[8902,7227],[8855,8234],[8527,8867],[8621,9195],[9184,9711],[9301,10086],[9137,10438],[8527,10695],[8410,11047],[9301,12148],[9465,12898],[9980,13273],[10121,13930],[10355,14023],[11199,13859],[11691,14094],[11762,14750],[11457,15664],[12113,16555],[11973,16977],[12113,17258],[13426,17703],[13801,18711],[14410,18992],[14855,19719],[15137,19836],[15887,19531],[17363,18289],[17691,18617],[17785,19367],[19168,19297],[18980,20656],[19074,21406],[18816,22133],[19004,23422],[19590,23844],[19801,24406],[20340,24078],[20996,24852],[21395,25109],[21465,25391],[21254,26469],[22098,26727],[23527,25180],[24348,24828],[24840,23469],[25496,23188],[25613,22438],[25895,22180],[26879,22344],[27254,22859],[28098,22930],[28777,23328],[29246,23258],[30043,22859],[30254,22977],[30371,23469],[30863,23844],[31473,23844],[31613,23516],[31848,23211],[32176,22930],[32270,22297],[32645,21969],[33910,21992],[34238,22484],[34285,24219],[33582,25156],[33535,26492],[32949,26961],[32434,27734],[31777,27898],[30910,28812],[31051,29211],[32199,30078],[32387,30430],[32293,31461],[31707,32398],[31660,33125],[31871,33242],[32855,33195],[33652,33664],[33723,34156],[34074,34438],[34121,34859],[34004,35234],[33723,35258]]}],
 usui:[{name:'ウスイ・峠周回',theme:'usui',pointToPoint:false,halfWidth:220,worldOverride:{w:40000,h:40000},originBottomLeft:true,courseDraft:true,spline:'centripetal',splineAlpha:.5,splineTension:.30,splineSteps:24,extraAnchors:[],path:[
[28438,15362],[28438,17206],[28438,19162],[28438,20559],[28243,21676],[27684,22515],[26846,22934],[25868,22794],[24890,22235],[24051,21537],[23074,20838],[22375,20838],[21816,21257],[21537,21956],[21676,22794],[22375,23912],[23213,24890],[23493,25868],[23213,26846],[22515,27963],[21537,29221],[20419,30478],[19581,31735],[18882,32993],[18743,34110],[19022,35368],[19301,36625],[19022,37743],[18324,38581],[17485,38860],[16787,38441],[16228,37603],[15669,36485],[14831,35088],[13993,33691],[13434,32434],[13574,31176],[14132,30059],[14412,29081],[14272,28103],[13713,27125],[12875,26007],[12176,24890],[11618,23772],[11478,22794],[11757,21956],[12316,21537],[13015,21676],[13434,22375],[13853,23353],[14412,23912],[14831,23632],[14971,22934],[14831,21956],[14412,20559],[13993,19162],[13574,17625],[13154,16088],[12596,14551],[12456,13434],[12735,12596],[13434,12037],[14412,11897],[15669,12176],[16926,12735],[18184,13294],[19022,13574],[19441,13154],[19441,12456],[18882,11897],[18044,11338],[17066,10779],[16088,10221],[15110,9382],[14412,8544],[14132,7706],[14412,6868],[15110,6029],[15949,5191],[16787,4353],[17625,3515],[18603,2956],[19860,2816],[21257,2537],[22654,2257],[24191,1978],[25728,1699],[27265,1838],[28243,2537],[28662,3515],[28522,4493],[27963,5191],[26985,5471],[25868,5471],[24750,5243],[24051,5471],[23772,6029],[23912,6728],[24610,7566],[25449,8404],[26426,8824],[27265,9382],[27963,10221],[28382,11199],[28438,12456],[28438,13853]
]}],
 master:[
  {name:'魔王環状路',theme:'master',path:[[2800,500],[3800,520],[5100,900],[5300,1700],[4700,2250],[3600,1900],[2900,2350],[3550,3000],[5000,3000],[5200,3450],[4100,3950],[2600,3850],[1250,3500],[600,2800],[700,1850],[1350,1250],[700,700],[2100,480]]},
  {name:'魔王の二択',theme:'master',branches:[[[1800,650],[2400,1450],[3300,1750],[4200,1150]],[[1800,650],[2100,2500],[3300,3000],[4450,2350],[4200,1150]]],path:[[700,650],[1800,650],[4200,1150],[5200,1800],[5000,3400],[3500,3950],[1600,3700],[600,2600]]}
 ],
 kawazu:[{name:'カワズ水脈',theme:'water',noWalls:true,path:[[700,700],[2700,500],[5000,850],[5150,1800],[4200,2200],[2850,1900],[2400,2450],[3300,2900],[5100,2850],[5000,3650],[3400,3900],[1700,3600],[600,3000],[800,2050],[2100,1650],[700,1300]]}]
};
let activeCourse=COURSE_SETS.arena1[0],courseTheme=activeCourse.theme,courseHalfWidth=activeCourse.halfWidth||195,courseNoWalls=false,courseBranches=[];
let courseControlPath=[];
let path=activeCourse.path.map(([x,y])=>({x,y})),anchors=[],lilies=[],checkpoints=[];
function rebuildCourseObjects(){
 anchors=[];
 const cornerPath=(courseTheme==='akina'&&courseControlPath.length)?courseControlPath:path;
 const start=activeCourse.pointToPoint?1:0,end=activeCourse.pointToPoint?cornerPath.length-1:cornerPath.length;
 let lastAkinaTree=null;
 for(let i=start;i<end;i++){
   let a=cornerPath[(i-1+cornerPath.length)%cornerPath.length],b=cornerPath[i],c=cornerPath[(i+1)%cornerPath.length];
   let ix=b.x-a.x,iy=b.y-a.y,ox=c.x-b.x,oy=c.y-b.y,il=Math.hypot(ix,iy)||1,ol=Math.hypot(ox,oy)||1;
   ix/=il;iy/=il;ox/=ol;oy/=ol;
   let cross=ix*oy-iy*ox,dot=ix*ox+iy*oy,angle=Math.acos(Math.max(-1,Math.min(1,dot)));
   const threshold=(courseTheme==='akina'||courseTheme==='usui'||courseTheme==='myogi'||courseTheme==='shomaru'||courseTheme==='akagi')?.72:.38;
   if(angle>threshold){
     let side=Math.sign(cross)||1;
     // True inside normal of the corner: average the incoming/outgoing LEFT normals,
     // then flip it for a right-hand bend.
     let nx=(-iy-oy)*side,ny=(ix+ox)*side,nl=Math.hypot(nx,ny);
     if(nl<.12){nx=-iy*side;ny=ix*side;nl=1;}
     nx/=nl;ny/=nl;

     let ax,ay;
     if(courseTheme==='akina'||courseTheme==='usui'||courseTheme==='myogi'||courseTheme==='shomaru'||courseTheme==='akagi'){
       // Akina: first try the true corner pocket (inside BOTH road legs), not an arbitrary
       // normal offset.  The previous version could put a tree between nearby switchbacks.
       const leftIn={x:-iy*side,y:ix*side},leftOut={x:-oy*side,y:ox*side};
       let pocketX=leftIn.x+leftOut.x,pocketY=leftIn.y+leftOut.y,pocketL=Math.hypot(pocketX,pocketY);
       if(pocketL<.12){pocketX=nx;pocketY=ny;pocketL=1;}
       pocketX/=pocketL;pocketY/=pocketL;
       const treeR=42,roadClear=courseHalfWidth+treeR+18;
       let found=false,anchorKind='tree';
       // 1) Best case: inner grass, but bias sharp hairpins toward the ENTRANCE side
       // instead of sitting exactly at the apex.
       const apexBack=angle>1.35?Math.min(310,Math.max(150,il*.18)):Math.min(130,il*.08);
       for(let off=courseHalfWidth+treeR+22;off<=courseHalfWidth+520;off+=34){
         const tx=b.x-ix*apexBack+pocketX*off,ty=b.y-iy*apexBack+pocketY*off;
         if(trackDistance(tx,ty)>=roadClear){ax=tx;ay=ty;found=true;break;}
       }
       // 2) If the apex pocket is occupied by a nearby switchback, prefer the ENTRANCE
       // side of the bend. Search backwards along the incoming road and outward from its
       // inside edge before considering any road-edge fallback.
       if(!found){
         // Prefer noticeably earlier on the entrance leg. This keeps the anchor before
         // the apex, where the player naturally wants to throw the tongue while braking.
         const entranceBias=angle>1.35?1.0:.72;
         const backStart=Math.max(150,Math.min(330,il*.20))*entranceBias;
         const backEnd=Math.max(430,Math.min(720,il*.46));
         for(let back=backStart;back<=backEnd&&!found;back+=42){
           for(let off=courseHalfWidth+treeR+18;off<=courseHalfWidth+360;off+=34){
             const tx=b.x-ix*back+leftIn.x*off,ty=b.y-iy*back+leftIn.y*off;
             if(trackDistance(tx,ty)>=roadClear){ax=tx;ay=ty;found=true;break;}
           }
         }
       }
       if(!found){
         // 3) No room for a full tree: use a slim tongue pole at the INSIDE EDGE,
         // biased toward the corner entrance. A pole needs far less lateral space and
         // avoids putting a bulky tree in the racing line.
         const poleR=10,back=Math.min(390,Math.max(170,il*.30));
         const edge=Math.max(35,courseHalfWidth-poleR-6);
         ax=b.x-ix*back+leftIn.x*edge;ay=b.y-iy*back+leftIn.y*edge;
         anchorKind='pole';
       }
     }else{
       // Normal courses: anchor the tree in the INNER pocket of the corner.
       // Average the two inside normals, then place the trunk just beyond the road edge.
       const leftIn={x:-iy*side,y:ix*side},leftOut={x:-oy*side,y:ox*side};
       let px=leftIn.x+leftOut.x,py=leftIn.y+leftOut.y,pl=Math.hypot(px,py);
       if(pl<.12){px=nx;py=ny;pl=1;}
       px/=pl;py/=pl;
       const treeR=42,clear=courseHalfWidth+treeR+14;
       let found=false;
       for(let off=courseHalfWidth+treeR+20;off<=courseHalfWidth+300;off+=24){
         const tx=b.x+px*off,ty=b.y+py*off;
         if(trackDistance(tx,ty)>=clear){ax=tx;ay=ty;found=true;break;}
       }
       if(!found){
         // Tight switchbacks: keep the tree on the inside edge even when there is
         // not enough grass for the ideal apex-pocket position.
         const off=courseHalfWidth+treeR+8;
         ax=b.x+px*off;ay=b.y+py*off;
       }
     }
     if(Math.hypot(ax-path[0].x,ay-path[0].y)>360){
       if(courseTheme!=='akina'||!lastAkinaTree||Math.hypot(ax-lastAkinaTree.x,ay-lastAkinaTree.y)>520){
         anchors.push({x:ax,y:ay,corner:i,kind:(courseTheme==='akina'?(typeof anchorKind!=='undefined'?anchorKind:'tree'):'tree'),sharpCorner:(courseTheme==='usui'&&angle>.82)});if(courseTheme==='akina')lastAkinaTree={x:ax,y:ay};
       }
     }
   }
 }
 if(activeCourse.extraAnchors)for(const [x,y] of activeCourse.extraAnchors)anchors.push({x,y,manual:true});
 lilies=[];
 if(courseTheme!=='akina'){for(let i=0;i<15;i++){let x=350+(i*977)%5300,y=300+(i*613)%3800;if(trackDistance(x,y)>330)lilies.push({x,y,r:48+(i%4)*10});}}
 checkpoints=path.map((q,i)=>({x:q.x,y:q.y,r:240,i}));
}
const COURSE_ORDER={
 arena1:[0,1,3,2],
 arena2:[0,1,2,3],
 arena3:[0,3,1,2],
 arena4:[1,2,0,3],
 arena5:[0,1,4,3,2],
 master:[0,1],
 kawazu:[0],
 akina:[0],
 usui:[0],
 myogi:[0],
 shomaru:[0],
 akagi:[0]
};

function sampleCentripetalPath(ctrl,steps=7,alpha=.5,tension=.38){
  if(!ctrl||ctrl.length<2)return ctrl||[];
  const out=[];
  const distPow=(a,b)=>Math.pow(Math.max(1e-6,Math.hypot(b.x-a.x,b.y-a.y)),alpha);
  const lerpPt=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  for(let i=0;i<ctrl.length-1;i++){
    const p0=ctrl[Math.max(0,i-1)],p1=ctrl[i],p2=ctrl[i+1],p3=ctrl[Math.min(ctrl.length-1,i+2)];
    const t0=0,t1=t0+distPow(p0,p1),t2=t1+distPow(p1,p2),t3=t2+distPow(p2,p3);
    if(i===0)out.push({x:p1.x,y:p1.y});
    for(let k=1;k<=steps;k++){
      const u=k/steps,t=t1+(t2-t1)*u;
      const A1=(t1-t0)<1e-8?{...p1}:lerpPt(p0,p1,(t-t0)/(t1-t0));
      const A2=lerpPt(p1,p2,(t-t1)/(t2-t1));
      const A3=(t3-t2)<1e-8?{...p2}:lerpPt(p2,p3,(t-t2)/(t3-t2));
      const B1=lerpPt(A1,A2,(t-t0)/(t2-t0));
      const B2=lerpPt(A2,A3,(t-t1)/(t3-t1));
      let C=lerpPt(B1,B2,(t-t1)/(t2-t1));
      // Blend back toward the original chord to limit overshoot in tight hairpins.
      const chord=lerpPt(p1,p2,u),blend=Math.max(0,Math.min(1,tension));
      C={x:chord.x+(C.x-chord.x)*blend,y:chord.y+(C.y-chord.y)*blend};
      out.push(C);
    }
  }
  return out;
}
function selectCourse(place,round=0){
 let set=COURSE_SETS[place]||COURSE_SETS.arena1,order=COURSE_ORDER[place]||set.map((_,i)=>i),idx=order[round%order.length]%set.length;
 activeCourse=set[idx];courseTheme=activeCourse.theme;courseHalfWidth=activeCourse.halfWidth||195;courseNoWalls=false;
 world.w=activeCourse.worldOverride?.w||DEFAULT_WORLD.w;world.h=activeCourse.worldOverride?.h||DEFAULT_WORLD.h;
 const cs=activeCourse.courseScale||1,sourceH=activeCourse.originBottomLeft?(world.h/cs):world.h;
 const cv=([x,y])=>({x:x*cs,y:(activeCourse.originBottomLeft?(sourceH-y):y)*cs});
 courseBranches=(activeCourse.branches||[]).map(br=>br.map(cv));
 const control=activeCourse.path.map(cv);
 courseControlPath=control;
 path=activeCourse.spline==='centripetal'
   ?sampleCentripetalPath(control,activeCourse.splineSteps||7,activeCourse.splineAlpha??.5,activeCourse.splineTension??.38)
   :control;
 rebuildCourseObjects();
}
rebuildCourseObjects();
let controlledIndex=0, camera={x:0,y:0}, joy={id:null,x:0,y:0},keys={},tongueHeld=false,last=performance.now(),finished=false,raceStartDelay=0;
const racers=[makeRacer('Michael','#49a94f',0,720,680),makeRacer('Gabriel','#3188e6',1,720,740)];
let globalTimeStop=0,globalTimeLag=0;
function makeRacer(name,color,index,x,y){return {name,color,index,x,y,vx:0,vy:0,face:0,speed:0,r:25,flight:0,glideClock:0,glideGrace:0,glideExtendStock:false,glideExtendUsed:false,onGround:true,tongue:null,cp:1,lap:1,finished:false,hitSlow:0,boost:0,bump:0,skillCdA:0,skillCdB:0,ai:index===1,wing:0,jumpAge:0,flapAge:0,landAge:0,airBarrier:0,airBoostUses:3,power:1,rockImmuneSlow:false,character:name,confuse:0,charge:0,charging:false,burningWing:0,highJump:0,highJumpTotal:0,highJumpDir:0,normalHighJump:0,burnWingUses:3,burnClimbUses:3,startLineLong:null,lapPrevX:null,lapPrevY:null,wallGrace:0,wallEscape:0,courseWalk:0,timeStopUsed:false,takumiCornering:false,takumiPassiveCd:0,aiPathIndex:0,routeIndex:0,aiWallHits:0,aiWallHitTimer:0,aiBend:0,aiAssist:0,wingSnap:0,drifting:false,driftCharge:0,driftMoveFace:0,driftSide:0,driftFxClock:0,driftGhosts:[],gutterPullX:0,gutterPullY:0,treeGrab:null,treeGrabCd:0,extremeFocus:0,extremeFocusCd:0,dokkanTurbo:0,dokkanTurboCd:0,dokkanPhase:0,ryosukeTongue:null,ryosukeTheory:0};}
const maxSpeed=585,groundSpeed=255,flapSpeed=405,glideAccel=690,turnGround=2.85,turnFast=1.05;
function reset(opponentName='Plain'){
 globalTimeStop=0;globalTimeLag=0;
 let playerName=saveData.selectedCharacter||'Michael',pc=CHARACTER_DATA[playerName]?.color||'#49a94f',oc=CHARACTER_DATA[opponentName]?.color||'#78a83c';
 const gate=activeCourse.pointToPoint?startGate():finishGate(),p0=gate.p0;
 let tx=gate.tx,ty=gate.ty;
 if(!activeCourse.pointToPoint){
   let out=path[1],dx=out.x-p0.x,dy=out.y-p0.y,l=Math.hypot(dx,dy)||1;tx=dx/l;ty=dy/l;
 }
 const nx=-ty,ny=tx,a=Math.atan2(ty,tx);
 if(playerName==='Takumi'&&opponentName==='Takumi')oc='#2456b8';
 racers.splice(0,2,
   makeRacer(playerName,pc,0,p0.x+tx*150+nx*34,p0.y+ty*150+ny*34),
   makeRacer(opponentName,oc,1,p0.x+tx*150-nx*34,p0.y+ty*150-ny*34)
 );
 if(playerName==='Takumi'&&opponentName==='Takumi')racers[1].takumiBlue=true;
 if(opponentName==='Bunta')racers[1].takumiBlue=true;
 controlledIndex=0;racers[0].ai=false;racers[1].ai=true;racers[0].face=a;racers[1].face=a;
 // Store the real signed distance from the gate because loop spawns now follow
 // the road tangent rather than the gate's averaged tangent.
 for(const r of racers){
   r.startLineLong=(r.x-gate.p0.x)*gate.tx+(r.y-gate.p0.y)*gate.ty;
   r.aiPathIndex=0;r.routeIndex=0;
 }
 racers[0].lapPrevX=racers[0].x;racers[0].lapPrevY=racers[0].y;racers[1].lapPrevX=racers[1].x;racers[1].lapPrevY=racers[1].y;
 if(playerName==='Uriel')racers[0].power=1.2;if(opponentName==='Uriel')racers[1].power=1.2;
 if(playerName==='Kawazu'){racers[0].burnWingUses=Infinity;racers[0].burnClimbUses=Infinity;racers[0].timeStopUsed=false;}
 if(opponentName==='Kawazu'){racers[1].burnWingUses=Infinity;racers[1].burnClimbUses=Infinity;racers[1].timeStopUsed=false;}
 finished=false;ui.status.textContent='ジャンプ3回で最高速！';
}
function snapWings(r){if(r)r.wingSnap=.19;}
function pressJump(r){if(appState==='race'&&raceStartDelay>0)return;if(r.finished)return;snapWings(r);if(r.flight===0){r.flight=1;r.onGround=false;r.speed=Math.max(r.speed,285);r.wing=.2;r.jumpAge=0;r.flapAge=0;msg('ジャンプ！ もう一度で羽ばたき');}
else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405);r.wing=.55;r.flapAge=0;msg('羽ばたき加速！ もう一度で滑空');}
else if(r.flight===2){r.flight=3;r.glideClock=0;r.glideGrace=0;r.glideExtendStock=false;r.glideExtendUsed=false;r.speed=Math.max(r.speed,520);r.wing=1;r.flapAge=0;msg('滑空！ 最高速へ');}
else {
 // During a glide, Jump can reserve ONE full glide extension.
 // Repeated presses do not stack extra seconds, and the reserve can only be used once
 // until the racer lands and starts a fresh 3-step glide.
 if(!r.glideExtendUsed&&!r.glideExtendStock){
   r.glideExtendStock=true;r.wing=.35;r.flapAge=0;
   msg('滑空延長を1回ストック！');
 }else{
   r.wing=.16;
   msg(r.glideExtendUsed?'この滑空では延長を使用済み':'滑空延長はストック済み');
 }
}}

function aiForwardSegment(r){
  const n=path.length,closed=!activeCourse.pointToPoint,base=Math.max(0,Math.min(n-2,r.aiPathIndex||0));
  let best={i:base,t:0,d:1e9,qx:path[base].x,qy:path[base].y};
  // Search mostly forward. This prevents close parallel roads / forks from making the CPU
  // jump to a geometrically-near but logically-wrong segment.
  for(let off=-2;off<=14;off++){
    let i=base+off;
    if(closed){
      // Never wrap a negative look-behind from segment 0/1 to the end of the
      // previous lap. At race start that old segment is physically nearby and
      // used to make the CPU turn around in circles.
      if(i<0)continue;
      i=i%n;
    }else if(i<0||i>=n-1)continue;
    let a=path[i],b=path[(i+1)%n],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1;
    let t=Math.max(0,Math.min(1,((r.x-a.x)*vx+(r.y-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(r.x-qx,r.y-qy);
    // Small forward bias on ties so progress wins over a nearby old segment.
    let score=d-off*2.5;
    if(score<best.d){best={i,t,d:score,rawD:d,qx,qy};}
  }
  if(activeCourse.pointToPoint)r.aiPathIndex=Math.max(base,best.i);
  else{
    let advance=(best.i-base+n)%n;
    if(advance<=14)r.aiPathIndex=best.i;
    else{
      // Safety fallback: steering must use the same logical segment that the
      // progress state accepts, otherwise the CPU can aim at the road behind it.
      let a=path[base],b=path[(base+1)%n],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1;
      let t=Math.max(0,Math.min(1,((r.x-a.x)*vx+(r.y-a.y)*vy)/l2));
      best={i:base,t,rawD:Math.hypot(r.x-(a.x+t*vx),r.y-(a.y+t*vy)),qx:a.x+t*vx,qy:a.y+t*vy};
    }
  }
  return best;
}
function aiLookTarget(r,seg){
  const n=path.length;
  // Look ahead FROM the racer's current projection on the route. Previously this
  // restarted from the beginning of the segment every frame, so a racer spawned
  // 150 units into segment 0 could steer back toward its own start position and
  // draw circles indefinitely.
  let i=seg.i,remain=150+r.speed*.34,x=seg.qx,y=seg.qy;
  const i1=activeCourse.pointToPoint?Math.min(n-2,seg.i):seg.i;
  const i2=activeCourse.pointToPoint?Math.min(n-2,i1+5):(i1+5)%n;
  const a1=path[i1],b1=path[(i1+1)%n],a2=path[i2],b2=path[(i2+1)%n];
  r.aiBend=Math.abs(norm(Math.atan2(b2.y-a2.y,b2.x-a2.x)-Math.atan2(b1.y-a1.y,b1.x-a1.x)));

  // First consume only the portion of the current segment that lies AHEAD of seg.t.
  let a=path[i],ni=activeCourse.pointToPoint?Math.min(n-1,i+1):(i+1)%n,b=path[ni];
  let segLen=Math.hypot(b.x-a.x,b.y-a.y)||1,forwardLen=segLen*(1-(seg.t||0));
  if(remain<=forwardLen){
    let t=(seg.t||0)+remain/segLen;
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  remain-=forwardLen;i=ni;

  while(remain>0){
    if(activeCourse.pointToPoint&&i>=n-1){x=path[n-1].x;y=path[n-1].y;break;}
    let a=path[i],next=activeCourse.pointToPoint?Math.min(n-1,i+1):(i+1)%n,b=path[next];
    let len=Math.hypot(b.x-a.x,b.y-a.y)||1;
    if(remain<=len){let t=remain/len;x=a.x+(b.x-a.x)*t;y=a.y+(b.y-a.y)*t;break;}
    remain-=len;i=next;
  }
  return {x,y};
}
function desiredInput(r){if(!r.ai){let kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let x=joy.x||kx,y=joy.y||ky;if(r.confuse>0){x=-x;y=-y;}let m=Math.hypot(x,y);return m>.08?{x:x/m,y:y/m,m:Math.min(1,m)}:{x:Math.cos(r.face),y:Math.sin(r.face),m:0};}
 let near=aiForwardSegment(r),target=aiLookTarget(r,near);
 if(activeCourse.pointToPoint&&r.aiPathIndex>=path.length-3){let g=finishGate();target={x:g.p0.x+g.tx*650,y:g.p0.y+g.ty*650};}
 let dx=target.x-r.x,dy=target.y-r.y,m=Math.hypot(dx,dy)||1;return {x:dx/m,y:dy/m,m:1};}
function updateRacer(r,dt){
  if(globalTimeStop>0&&r!==racers[controlledIndex])return;
  r.tongueBoostFx=Math.max(0,(r.tongueBoostFx||0)-dt);
  r.treeGrabCd=Math.max(0,(r.treeGrabCd||0)-dt);if(r.ryosukeTongue){r.ryosukeTongue.t-=dt;if(r.ryosukeTongue.t<=0)r.ryosukeTongue=null;}
  r.extremeFocus=Math.max(0,(r.extremeFocus||0)-dt);r.extremeFocusCd=Math.max(0,(r.extremeFocusCd||0)-dt);
  r.tongueBoostTimer=Math.max(0,(r.tongueBoostTimer||0)-dt);
  if(r.tongueBoostTimer>0)r.speed=Math.min(maxSpeed+130,r.speed+360*dt);
r.takumiPassiveCd=Math.max(0,(r.takumiPassiveCd||0)-dt);r.dokkanTurbo=Math.max(0,(r.dokkanTurbo||0)-dt);r.dokkanTurboCd=Math.max(0,(r.dokkanTurboCd||0)-dt);r.dokkanPhase=(r.dokkanPhase||0)+dt;r.wingSnap=Math.max(0,(r.wingSnap||0)-dt);r.aiWallHitTimer=Math.max(0,(r.aiWallHitTimer||0)-dt);if(r.aiWallHitTimer<=0)r.aiWallHits=0;r.airBarrier=Math.max(0,(r.airBarrier||0)-dt);r.wallGrace=Math.max(0,(r.wallGrace||0)-dt);r.wallEscape=Math.max(0,(r.wallEscape||0)-dt);r.highJump=Math.max(0,(r.highJump||0)-dt);r.normalHighJump=Math.max(0,(r.normalHighJump||0)-dt);r.confuse=Math.max(0,(r.confuse||0)-dt);r.burningWing=Math.max(0,(r.burningWing||0)-dt);if(r.charging)r.charge=Math.min(1.8,(r.charge||0)+dt);if(r.finished)return;r.skillCdA=Math.max(0,r.skillCdA-dt);r.skillCdB=Math.max(0,r.skillCdB-dt);r.hitSlow=Math.max(0,r.hitSlow-dt);r.boost=Math.max(0,r.boost-dt);r.bump=Math.max(0,r.bump-dt);r.wing=Math.max(0,r.wing-dt);r.jumpAge+=dt;r.flapAge+=dt;r.landAge=Math.max(0,r.landAge-dt);
 const inp=desiredInput(r),want=Math.atan2(inp.y,inp.x),diff=norm(want-r.face),ratio=Math.min(1,r.speed/maxSpeed),aiTurn=r.ai?((r.name==='Bunta'?2.25:(r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke')?1.72:1.28)+Math.min(r.name==='Bunta'?1.05:(r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke')?.82:.55,(r.aiBend||0)*(r.name==='Bunta'?.72:(r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke')?.58:.42))):1,driftTurn=(canDrift(r)&&r.drifting)?2.15:1,turn=(turnGround*(1-ratio)+turnFast*ratio)*dt*(r.name==='Raphael'?1.22:1)*(r.highJump>0?.28:1)*aiTurn*driftTurn;
 // Saru special: on Usui, grab a tree on the inside of a sharp corner and swing around it.
 if(r.ai&&r.name==='Saru'&&courseTheme==='usui'&&!r.treeGrab&&r.treeGrabCd<=0&&(r.aiBend||0)>.42){
   let best=null,bd=1e9;
   for(const a of anchors){if(a.kind!=='tree')continue;let d=Math.hypot(a.x-r.x,a.y-r.y);if(d<390&&d<bd){best=a;bd=d;}}
   if(best){let cross=Math.sin(norm(Math.atan2(best.y-r.y,best.x-r.x)-r.face));r.treeGrab={target:best,t:.72,side:cross>0?-1:1};r.treeGrabCd=2.2;}
 }
 if(Math.abs(diff)<turn)r.face=want;else r.face+=Math.sign(diff)*turn;
 if(r.name==='Akiyama'&&r.dokkanTurbo>0){const wob=Math.sin((r.dokkanPhase||0)*15.5)*.055+Math.sin((r.dokkanPhase||0)*27.0)*.022;r.face=norm(r.face+wob*dt*8.5);}
 if(canDrift(r)&&r.drifting){
   let slip=Math.abs(norm(r.face-r.driftMoveFace));
   r.driftCharge=Math.min(1.8,(r.driftCharge||0)+dt*(.55+Math.min(1.1,slip)));
   r.wingSnap=Math.max(r.wingSnap,.06); // rapid little flaps while sliding
   r.driftFxClock=(r.driftFxClock||0)-dt;
   if(r.driftFxClock<=0){
     r.driftFxClock=.075;
     r.driftGhosts=r.driftGhosts||[];
     r.driftGhosts.push({x:r.x,y:r.y,face:r.face,t:.28});
     if(r.driftGhosts.length>5)r.driftGhosts.shift();
   }
 }
 if(r.driftGhosts){
   for(const g of r.driftGhosts)g.t-=dt;
   r.driftGhosts=r.driftGhosts.filter(g=>g.t>0);
 }
 // AI flight rhythm
 if(r.ai){if(r.flight<3&&Math.random()<dt*2.8)pressJumpSilent(r);if(r.flight===3&&r.glideClock>4.55&&r.glideClock<5.45)pressJumpSilent(r);}
 if(r.flight===0){
   const aiBase=r.ai?(r.name==='Plain'?1.035:(r.name==='Bunta'||r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke'||r.name==='Kawazu'?1:1.06)):1;
   r.speed=approach(r.speed,groundSpeed*inp.m*(r.name==='Kawazu'?1.14:r.name==='Takumi'?1.12:aiBase),380*dt);
 }else if(r.flight===1){
   const aiLift=r.ai?(r.name==='Plain'?340:(r.name==='Bunta'||r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke'||r.name==='Kawazu'?330:348)):330;
   r.speed=approach(r.speed,r.name==='Takumi'?355:aiLift,230*dt);
 }else if(r.flight===2){
   const aiFlap=r.ai?(r.name==='Plain'?470:(r.name==='Bunta'||r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke'||r.name==='Kawazu'?455:480)):455;
   r.speed=approach(r.speed,r.name==='Takumi'?485:aiFlap,260*dt);
 }else {
   r.glideClock+=dt;
   if(r.glideClock>=5.65&&r.glideExtendStock&&!r.glideExtendUsed){
     r.glideExtendStock=false;r.glideExtendUsed=true;r.glideClock=0;r.glideGrace=0;
     r.speed=Math.max(r.speed,510);r.wing=Math.max(r.wing,.42);r.flapAge=0;
     if(!r.ai)msg('ストック消費！ 滑空時間を延長');
   }
   if(r.glideClock<5.65){
     const aiCruise=r.ai?(r.name==='Inu'?maxSpeed+95:r.name==='Plain'?600:(r.name==='Bunta'||r.name==='Takumi'||r.name==='Saru'||r.name==='Keisuke'||r.name==='Akiyama'||r.name==='Ryosuke'||r.name==='Kawazu'?maxSpeed:615)):maxSpeed;
     r.speed=approach(r.speed,r.name==='Kawazu'?maxSpeed+65:r.name==='Takumi'?maxSpeed+55:aiCruise,glideAccel*dt);
   }else{
     r.glideGrace+=dt;
     const tiredTarget=(r.ai&&r.name!=='Plain'&&r.name!=='Bunta'&&r.name!=='Kawazu'&&r.name!=='Takumi')?260:245;
     r.speed=approach(r.speed,r.name==='Takumi'?280:tiredTarget,82*dt);
     if(r.speed<300){r.flight=0;r.onGround=true;r.glideClock=0;r.glideExtendStock=false;r.glideExtendUsed=false;r.landAge=.28;}
   }
 }
 if(r.name==='Bunta'){
   // Bunta's raw pace is only a little above Takumi now.
   if(r.flight===0)r.speed=Math.max(r.speed,290);
   else if(r.flight===1)r.speed=Math.max(r.speed,375);
   else if(r.flight===2)r.speed=Math.max(r.speed,505);
   else r.speed=Math.max(r.speed,620);
 }
 if(r.hitSlow>0)r.speed*=Math.pow(.78,dt*4);
 if(r.burningWing>0)r.speed=approach(r.speed,maxSpeed+205,720*dt);
 else if(r.highJump>0)r.speed=approach(r.speed,maxSpeed+70,300*dt);
 else if(r.boost>0)r.speed=Math.min(maxSpeed+(r.name==='Bunta'?145:r.name==='Takumi'?120:45),r.speed+(r.name==='Bunta'?345:r.name==='Takumi'?330:210)*dt);
 if(r.name==='Bunta'&&r.ai&&!r.bump){
   // Secret boss cruising floor. Keep him outrageously fast even after ordinary
   // glide/boost code has tried to settle toward normal character limits.
   const bend=r.aiBend||0,target=bend>.95?540:bend>.62?590:bend>.38?645:720;
   r.speed=approach(r.speed,target,470*dt);
 }
 if(r.name==='Kawazu'&&r.ai&&!r.bump){
   // Post-clear Kawazu challenge: fast on purpose because this course rewards shortcuts.
   const bend=r.aiBend||0,target=bend>.95?545:bend>.62?605:bend>.38?665:705;
   r.speed=approach(r.speed,target,520*dt);
 }
 if(r.bump>0)r.speed=Math.min(r.speed,r.name==='Bunta'?430:360);
 if(r.ai){
   const bend=r.aiBend||0;
   if(r.name==='Bunta'){
     if(bend>.95)r.speed=Math.min(r.speed,540);
     else if(bend>.62)r.speed=Math.min(r.speed,590);
     else if(bend>.38)r.speed=Math.min(r.speed,645);
   }else if(r.name==='Kawazu'){
     if(bend>.95)r.speed=Math.min(r.speed,545);
     else if(bend>.62)r.speed=Math.min(r.speed,605);
     else if(bend>.38)r.speed=Math.min(r.speed,665);
   }else if(r.name==='Ryosuke'){
     // 公道最速理論 + ゼロ・ミス: long look-ahead, near-perfect line, very high minimum corner speed.
     const target=bend>.98?585:bend>.70?625:bend>.42?670:735;
     r.speed=approach(r.speed,target,620*dt);
     r.wallGrace=Math.max(r.wallGrace,.34);
     if(bend>.72){let ti=trackInfo(r.x,r.y);if(ti.d>courseHalfWidth*.48){r.x+=(ti.qx-r.x)*Math.min(1,dt*5.2);r.y+=(ti.qy-r.y)*Math.min(1,dt*5.2);}}
   }else if(r.name==='Keisuke'){
     // High-speed drift + Extreme Focus: Akina specialist. Keeps unusually high corner speed.
     if(bend<.20)r.speed=approach(r.speed,maxSpeed+80,460*dt);
     else if(bend>.98)r.speed=Math.min(r.speed,r.extremeFocus>0?535:500);
     else if(bend>.62)r.speed=Math.min(r.speed,r.extremeFocus>0?590:555);
     else if(bend>.38)r.speed=Math.min(r.speed,625);
   }else if(r.name==='Nakazato'){
     // Black Boost + Late Braking: accelerate hard on straights, hold speed deep into corners.
     if(bend<.20)r.speed=approach(r.speed,maxSpeed+125,520*dt);
     else if(bend>.98)r.speed=Math.min(r.speed,505);
     else if(bend>.70)r.speed=Math.min(r.speed,555);
     else if(bend>.46)r.speed=Math.min(r.speed,625);
   }else if(r.name==='Akiyama'){
     // Dokkan Turbo: explosive straight-line acceleration, offset by a mild weave.
     // He still has to shed speed for Shomaru's tight hairpins and uses drift to finish the turn.
     if(r.dokkanTurbo>0){
       const target=bend<.20?maxSpeed+235:bend<.42?maxSpeed+145:610;
       r.speed=approach(r.speed,target,940*dt);
     }else if(bend<.18)r.speed=approach(r.speed,maxSpeed+35,350*dt);
     else if(bend>.98)r.speed=Math.min(r.speed,420);
     else if(bend>.62)r.speed=Math.min(r.speed,480);
     else if(bend>.38)r.speed=Math.min(r.speed,555);
   }else if(r.name==='Inu'){
     // Inu has the highest raw top speed, but still brakes for the tight Usui hairpins.
     if(bend>.95)r.speed=Math.min(r.speed,425);
     else if(bend>.62)r.speed=Math.min(r.speed,505);
     else if(bend>.38)r.speed=Math.min(r.speed,590);
   }else{
     const plain=r.name==='Plain';
     if(bend>.95)r.speed=Math.min(r.speed,plain?365:385);
     else if(bend>.62)r.speed=Math.min(r.speed,plain?430:450);
     else if(bend>.38)r.speed=Math.min(r.speed,plain?500:520);
   }
 }
 if(r.name==='Takumi'||r.name==='Bunta'){
   let ns=nearestTrackSegment(r.x,r.y),i=ns.i,n1=path[Math.min(path.length-1,i+1)],n2=path[Math.min(path.length-1,i+2)];
   if(!activeCourse.pointToPoint){n1=path[(i+1)%path.length];n2=path[(i+2)%path.length];}
   let bend=Math.abs(norm(Math.atan2(n2.y-n1.y,n2.x-n1.x)-Math.atan2(n1.y-r.y,n1.x-r.x)));
   if(bend>.48)r.takumiCornering=true;
   else if(r.takumiCornering&&bend<.22&&r.takumiPassiveCd<=0){r.takumiCornering=false;r.takumiPassiveCd=.95;r.speed=Math.min(maxSpeed+(r.name==='Bunta'?135:210),Math.max(r.speed+(r.name==='Bunta'?185:185),r.name==='Bunta'?650:645));r.boost=r.name==='Bunta'?.82:.78;if(!r.ai)msg('コーナー脱出加速！');}
 }
 // Monkey tree-grab: no tongue. The hands hook the trunk and the body follows the tangent briefly.
 if(r.treeGrab){
   let a=r.treeGrab.target,dx=a.x-r.x,dy=a.y-r.y,d=Math.hypot(dx,dy)||1;
   let radial=Math.atan2(dy,dx),tan=radial+(r.treeGrab.side>0?Math.PI/2:-Math.PI/2);
   r.face=lerpAngle(r.face,tan,Math.min(1,dt*10));
   r.speed=Math.max(r.speed,500);r.wallGrace=Math.max(r.wallGrace,.22);
   // A gentle inward pull makes the swing readable without teleporting or merging roads.
   let pull=Math.min(70,d*.18)*dt;r.x+=dx/d*pull;r.y+=dy/d*pull;
   r.treeGrab.t-=dt;if(r.treeGrab.t<=0||d>470){r.treeGrab=null;r.treeGrabCd=Math.max(r.treeGrabCd,1.5);r.boost=Math.max(r.boost,.32);}
 }
 // Tongue anchor overrides ordinary turn. Player/rival overlap never affects anchor tongue.
 r.gutterPullX=0;r.gutterPullY=0;
 if(r.tongue&&(r.tongue.kind==='anchor'||r.tongue.kind==='gutter')){
   let a=r.tongue.target,gutter=r.tongue.kind==='gutter';
   if(gutter&&a.slide){
     // 溝落とし v2.66: visual tongue point may slide, but racer coordinates are NEVER
     // modified here. Physics is only a small velocity bias applied later.
     let ns=nearestTrackSegment(r.x,r.y),i=ns.i;
     let ni=activeCourse.pointToPoint?Math.min(path.length-1,i+1):(i+1)%path.length;
     if(ni!==i){
       let p0=path[i],p1=path[ni],fa=Math.atan2(p1.y-p0.y,p1.x-p0.x);
       let side=a.turnSide||1,nx=-Math.sin(fa)*side,ny=Math.cos(fa)*side;
       const edge=Math.max(42,Math.min(courseHalfWidth*.62,150));
       let tx=ns.qx+Math.cos(fa)*82+nx*edge,ty=ns.qy+Math.sin(fa)*82+ny*edge;
       if(!Number.isFinite(tx)||!Number.isFinite(ty)){tx=r.x+Math.cos(fa)*70+nx*edge;ty=r.y+Math.sin(fa)*70+ny*edge;}
       let dd=Math.hypot(tx-r.x,ty-r.y)||1;
       if(dd>220){tx=r.x+(tx-r.x)/dd*220;ty=r.y+(ty-r.y)/dd*220;}
       a.x+=(tx-a.x)*Math.min(1,dt*7);a.y+=(ty-a.y)*Math.min(1,dt*7);

       // Store only a unit inward bias. No direct x/y displacement, no orbiting around
       // the virtual point, and no interaction with wall-recovery coordinates.
       r.gutterPullX=nx;r.gutterPullY=ny;
       r.face=lerpAngle(r.face,fa,Math.min(1,dt*7.2));
       r.wallGrace=Math.max(r.wallGrace,.18);
       r.speed=Math.max(r.speed,500);
     }
   }else{
     let dx=a.x-r.x,dy=a.y-r.y,d=Math.hypot(dx,dy)||1,tan=Math.atan2(dy,dx)+(r.tongue.side>0?Math.PI/2:-Math.PI/2),hold=(performance.now()-r.tongue.started)/1000;
     r.face=lerpAngle(r.face,tan,Math.min(1,dt*7.5));
     if(hold>1.05)r.speed=Math.max(220,r.speed-250*dt);else r.speed=Math.max(r.speed,Math.min(maxSpeed,520));
   }
 }
 let moveFace=r.face;
 if(canDrift(r)&&r.drifting){
   // Body can point into the corner while inertia keeps the frog sliding sideways.
   r.driftMoveFace=lerpAngle(r.driftMoveFace,r.face,Math.min(1,dt*.42));
   moveFace=r.driftMoveFace;r.speed=Math.max(r.speed,430);
 }
 const downhillMul=courseTheme==='akina'?1.12:1;let mvx=Math.cos(moveFace)*r.speed*downhillMul,mvy=Math.sin(moveFace)*r.speed*downhillMul;
 if(r.name==='Takumi'&&(r.gutterPullX||r.gutterPullY)){
   // Equivalent to a mild inward aerodynamic pull: bend velocity by at most ~9 degrees.
   const inward=90;
   mvx+=r.gutterPullX*inward;mvy+=r.gutterPullY*inward;
   let ml=Math.hypot(mvx,mvy)||1;mvx=mvx/ml*r.speed;mvy=mvy/ml*r.speed;
 }
 r.vx=mvx;r.vy=mvy;r.x+=r.vx*dt;r.y+=r.vy*dt;
 if(r.ai){
   let rs=aiForwardSegment(r),dx=rs.qx-r.x,dy=rs.qy-r.y,d=Math.hypot(dx,dy)||1;
   // Secret-boss and Takumi CPUs get stronger lane discipline so they don't
   // throw away corners by clipping the wall.
   const isTakumiCpu=(r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama'),isBunta=r.name==='Bunta';
   const laneFactor=isBunta?.18:(isTakumiCpu?.24:.36);
   const soft=Math.max(0,d-courseHalfWidth*laneFactor);
   const rate=isBunta?8.0:(isTakumiCpu?5.2:1.9),assist=Math.min(d,soft*rate*dt);
   if(assist>0){r.x+=dx/d*assist;r.y+=dy/d*assist;}
 }
 if(r.ai&&r.wallEscape>0){
   let rs=aiForwardSegment(r),dx=rs.qx-r.x,dy=rs.qy-r.y,d=Math.hypot(dx,dy)||1;
   let nudge=Math.min(d,150*dt);r.x+=dx/d*nudge;r.y+=dy/d*nudge;
 }
 // After a wall hit, bias a few frames toward the course center so acute V-corners cannot trap the racer.
 if(r.wallEscape>0&&r.highJump<=0){
   let pre=routeLockedTrackInfo(r),dx=pre.qx-r.x,dy=pre.qy-r.y,d=Math.hypot(dx,dy)||1,pull=Math.min(d,310*dt);
   r.x+=dx/d*pull;r.y+=dy/d*pull;
 }
 // Guard-grass wall.
 let hit=routeLockedTrackInfo(r);
 // Keisuke / Extreme Focus: during the short focus window he reads the wall edge
 // and corrects his line before impact instead of bouncing off the guard.
 if(r.name==='Keisuke'&&r.extremeFocus>0&&hit.d>courseHalfWidth*.62){let rs=aiForwardSegment(r),dx=rs.qx-r.x,dy=rs.qy-r.y,d=Math.hypot(dx,dy)||1,pull=Math.min(d,560*dt);r.x+=dx/d*pull;r.y+=dy/d*pull;r.wallGrace=Math.max(r.wallGrace,.35);hit=routeLockedTrackInfo(r);}

 if(r.ai&&(r.name==='Bunta'||r.name==='Takumi'||r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Keisuke'||r.name==='Akiyama')&&hit.d>courseHalfWidth*(r.name==='Bunta'?.62:.72)){
   let rs=aiForwardSegment(r),dx=rs.qx-r.x,dy=rs.qy-r.y,d=Math.hypot(dx,dy)||1;
   const safeFactor=r.name==='Bunta'?.48:.58;
   let keep=Math.min(d,Math.max(0,hit.d-courseHalfWidth*safeFactor));
   r.x+=dx/d*keep;r.y+=dy/d*keep;hit=routeLockedTrackInfo(r);r.wallGrace=.3;
 }
 if(r.courseWalk>0){
   r.courseWalk-=dt;let a=Math.atan2(hit.qy-r.y,hit.qx-r.x);r.face=a;r.flight=0;r.onGround=true;r.speed=105;
   r.x+=Math.cos(a)*105*dt;r.y+=Math.sin(a)*105*dt;
   if(hit.d<150){r.courseWalk=0;r.x=hit.qx;r.y=hit.qy;r.speed=0;if(!r.ai)msg('コース復帰！ もう一度ジャンプから');}
 }else if(r.highJump<=0&&hit.d>courseHalfWidth+3){
   // A Burning Climb can cross the grass. If it expires outside, walk back as before.
   if((r.wasHighJump||0)>0){
     if(r.ai){
       r.courseWalk=0;r.flight=1;r.onGround=false;r.speed=Math.max(170,Math.min(r.speed,235));r.wallEscape=.7;r.tongue=null;
     }else{
       r.courseWalk=6;r.flight=0;r.onGround=true;r.speed=105;r.tongue=null;msg('コースアウト！ 歩いて復帰…');
     }
   }else{
     let aiSeg=r.ai?aiForwardSegment(r):null;
     const seg=r.ai?aiSeg.i:(hit.i??nearestTrackSegment(hit.qx,hit.qy).i);
     const look=r.ai?aiLookTarget(r,aiSeg):path[activeCourse.pointToPoint?Math.min(path.length-1,seg+2):(seg+2)%path.length],toLook=Math.atan2(look.y-r.y,look.x-r.x);
     if(r.ai){
       r.aiWallHits=(r.aiWallHits||0)+1;r.aiWallHitTimer=.9;
       // Never teleport the CPU back to the route. Steer and pull it smoothly toward the
       // logical forward segment over several frames so recovery remains visible/natural.
       let rdx=aiSeg.qx-r.x,rdy=aiSeg.qy-r.y,rd=Math.hypot(rdx,rdy)||1;
       let pull=Math.min(rd,420*dt);
       r.x+=rdx/rd*pull;r.y+=rdy/rd*pull;
       r.face=lerpAngle(r.face,toLook,Math.min(1,dt*8.5));
       r.wallEscape=.48;
       if(r.aiWallHits>=2){r.speed=Math.min(Math.max(r.speed,175),235);r.flight=1;r.onGround=false;}
       if(r.aiWallHits>=5){r.speed=145;r.aiWallHits=2;} // stubborn corner: slow down rather than warp
     }else{
       // Move only from the penetrated wall edge to a safe position inside the corridor.
       let nx=(r.x-hit.qx)/(hit.d||1),ny=(r.y-hit.qy)/(hit.d||1);
       const safeD=Math.max(105,courseHalfWidth-70);
       r.x=hit.qx+nx*safeD;r.y=hit.qy+ny*safeD;
       r.face=lerpAngle(r.face,toLook,.80);
       r.wallEscape=.42;
     }
     if(r.wallGrace<=0){
       // A hard wall hit kills the airborne momentum. These frogs settle to the ground once speed is lost.
       r.speed=r.ai?Math.max(r.speed,185):70;
       r.flight=r.ai?1:0;r.onGround=!r.ai;r.glideClock=0;r.glideGrace=0;r.landAge=.28;r.tongue=null;
       r.wallGrace=r.ai?.44:.40;r.bump=.08;
       if(!r.ai)msg('ガード草に激突！ 勢いを失って着地');
     }else{
       // While escaping the acute corner, stay slow and grounded instead of rebounding.
       r.speed=Math.min(r.speed,r.ai?220:85);
       r.flight=r.ai?1:0;r.onGround=!r.ai;
     }
   }
 }
 r.wasHighJump=r.highJump;
 r.x=Math.max(90,Math.min(world.w-90,r.x));r.y=Math.max(90,Math.min(world.h-90,r.y));
 if(r.courseWalk<=0)updateCheckpoint(r);
 if(r.ai)aiSkills(r,dt);
}
function pressJumpSilent(r){snapWings(r);if(r.flight===0){r.flight=1;r.speed=Math.max(r.speed,285)}else if(r.flight===1){r.flight=2;r.speed=Math.max(r.speed,405)}else if(r.flight===2){r.flight=3;r.glideClock=0;r.speed=Math.max(r.speed,520)}else if(r.glideClock>3.8){r.glideClock=0;r.speed=Math.max(r.speed,550)}}
function aiSkills(r,dt){if(r.name==='Ryosuke'){let bend=r.aiBend||0,seg=aiForwardSegment(r);if(bend>.58){let j=Math.min(path.length-1,seg.i+2),t=path[j];r.ryosukeTongue={x:t.x,y:t.y,t:.18};r.wallGrace=Math.max(r.wallGrace,.65);}else r.ryosukeTongue=null;return;}if(r.name==='Keisuke'){let ns=aiForwardSegment(r),bend=r.aiBend||0;if(bend>.34&&!r.drifting&&r.skillCdB<=0&&Math.random()<dt*7.5){startTakumiDrift(r);r.speed=Math.max(r.speed,545);}if(r.drifting&&(r.driftCharge>1.15||bend<.16))releaseTakumiDrift(r);if((bend>.62||trackInfo(r.x,r.y).d>courseHalfWidth*.66)&&r.extremeFocusCd<=0){r.extremeFocus=1.65;r.extremeFocusCd=4.2;r.wallGrace=Math.max(r.wallGrace,1.7);}return;}if(r.name==='Akiyama'){
 let bend=r.aiBend||0;
 // Use turbo on straights and just after a corner. The wobble is intentional risk/reward flavor.
 if(bend<.19&&r.dokkanTurboCd<=0&&r.speed>300&&Math.random()<dt*2.7){r.dokkanTurbo=1.55;r.dokkanTurboCd=4.1;r.speed=Math.max(r.speed,560);r.boost=Math.max(r.boost,.22);}
 // Ordinary drift is the second skill: start before medium/tight bends, release on exit.
 if(bend>.40&&!r.drifting&&r.skillCdB<=0&&Math.random()<dt*6.2)startTakumiDrift(r);
 if(r.drifting&&(r.driftCharge>.95||bend<.16))releaseTakumiDrift(r);
 return;}if(r.name==='Inu'||r.name==='Saru'){let ns=nearestTrackSegment(r.x,r.y),i=ns.i,n1=path[(i+1)%path.length],n2=path[(i+2)%path.length],bend=Math.abs(norm(Math.atan2(n2.y-n1.y,n2.x-n1.x)-r.face));if(bend>.42&&!r.drifting&&r.skillCdB<=0&&Math.random()<dt*4.2)startTakumiDrift(r);if(r.drifting&&(r.driftCharge>.9||bend<.18))releaseTakumiDrift(r);return;}if(r.name==='Takumi'||r.name==='Bunta'){let ns=nearestTrackSegment(r.x,r.y),i=ns.i,n1=path[Math.min(path.length-1,i+1)],n2=path[Math.min(path.length-1,i+2)],bend=Math.abs(norm(Math.atan2(n2.y-n1.y,n2.x-n1.x)-r.face));if(bend>.62&&r.skillCdA<=0&&Math.random()<dt*(r.name==='Bunta'?8:3.2))useA(r);if(bend>.48&&!r.drifting&&r.skillCdB<=0&&Math.random()<dt*(r.name==='Bunta'?6:2.2))startTakumiDrift(r);if(r.drifting&&(r.driftCharge>1.05||bend<.2))releaseTakumiDrift(r);return;}if(r.name!=='Gabriel')return;let ns=nearestTrackSegment(r.x,r.y),t=path[(ns.i+2)%path.length],to=Math.atan2(t.y-r.y,t.x-r.x),bend=Math.abs(norm(to-r.face));if(bend>.56&&r.skillCdB<=0&&Math.random()<dt*3){waterSkill(r,true,true)}else if(bend>.3&&r.skillCdA<=0&&Math.random()<dt*2){waterBoost(r,true)}}
function nearestTrackSegment(px,py){
 let best={i:0,t:0,d:1e9};for(let i=0;i<(activeCourse.pointToPoint?path.length-1:path.length);i++){let a=path[i],b=path[(i+1)%path.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={i,t,d};}return best;
}
function startGate(){const p0=path[0],next=path[1];let tx=next.x-p0.x,ty=next.y-p0.y,l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;return {p0,tx,ty,nx:-ty,ny:tx};}
function finishGate(){
 if(activeCourse.pointToPoint){const p0=path[path.length-1],prev=path[path.length-2];let tx=p0.x-prev.x,ty=p0.y-prev.y,l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;return {p0,tx,ty,nx:-ty,ny:tx};}
 const p0=path[0],prev=path[path.length-1],next=path[1];let inx=p0.x-prev.x,iny=p0.y-prev.y,outx=next.x-p0.x,outy=next.y-p0.y;let il=Math.hypot(inx,iny)||1,ol=Math.hypot(outx,outy)||1;inx/=il;iny/=il;outx/=ol;outy/=ol;let tx=inx+outx,ty=iny+outy,tl=Math.hypot(tx,ty);if(tl<.2){tx=outx;ty=outy;tl=1}tx/=tl;ty/=tl;return {p0,tx,ty,nx:-ty,ny:tx};
}
function updateCheckpoint(r){
 const g=finishGate(),p0=g.p0,tx=g.tx,ty=g.ty,nx=g.nx,ny=g.ny,x0=r.lapPrevX??r.x,y0=r.lapPrevY??r.y,x1=r.x,y1=r.y;r.lapPrevX=x1;r.lapPrevY=y1;
 const long0=(x0-p0.x)*tx+(y0-p0.y)*ty,long1=(x1-p0.x)*tx+(y1-p0.y)*ty;
 if(activeCourse.pointToPoint){
   let crossed=false;
   const near=nearestTrackSegment(r.x,r.y);
   // A geometric finish-line crossing is valid ONLY after reaching the final route section.
   // Nearby parallel lanes can therefore never finish the race early.
   const finalProgress=near.i>=Math.max(0,path.length-3);
   if(finalProgress&&long0<=0&&long1>0){
     let den=long1-long0,u=Math.abs(den)<1e-6?0:-long0/den,cx=x0+(x1-x0)*u,cy=y0+(y1-y0)*u,lat=(cx-p0.x)*nx+(cy-p0.y)*ny;
     crossed=Math.abs(lat)<=Math.max(300,courseHalfWidth+90);
   }
   // CPU tolerance is also restricted to the actual final route section.
   if(r.ai&&!crossed&&r.aiPathIndex>=path.length-3&&near.i>=path.length-4&&Math.hypot(r.x-p0.x,r.y-p0.y)<Math.max(420,courseHalfWidth*1.8))crossed=true;
   if(crossed){r.finished=true;r.speed=0;if(!finished){finished=true;msg((r===racers[controlledIndex]?'YOU WIN! ':'')+(CHARACTER_DATA[r.name]?.jp||r.name)+' ゴール！');setTimeout(()=>showRaceResult(r===racers[controlledIndex]),1300);}}
   return;
 }
 if((long0<=0&&long1>0)||(long0>=0&&long1<0)){const denom=long1-long0,u=Math.abs(denom)<1e-6?0:(-long0/denom),crossX=x0+(x1-x0)*u,crossY=y0+(y1-y0)*u,lateral=(crossX-p0.x)*nx+(crossY-p0.y)*ny,gateHalf=Math.max(520,courseHalfWidth+260);if(Math.abs(lateral)<=gateHalf){if(long0<=0&&long1>0){r.lap++;if(r.lap>RACE_LAPS){r.finished=true;r.speed=0;if(!finished){finished=true;msg((r===racers[controlledIndex]?'YOU WIN! ':'')+(CHARACTER_DATA[r.name]?.jp||r.name)+' ゴール！');setTimeout(()=>showRaceResult(r===racers[controlledIndex]),1300);}}else if(r===racers[controlledIndex])msg('LAP '+r.lap+' / '+RACE_LAPS);}else{const before=r.lap;r.lap=Math.max(1,r.lap-1);if(r===racers[controlledIndex]&&r.lap<before)msg('逆走でゴール通過：LAP -1 → '+r.lap+'/'+RACE_LAPS);}}}r.startLineLong=long1;
}
function startTongue(r){if(appState==='race'&&raceStartDelay>0)return;if(r.finished)return;if(r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Akiyama'){msg('犬と猿は舌を使えない！ 翼と旋回性能で曲がろう');return;}const TONGUE_ANCHOR_RANGE=330;let anchor=nearestAnchor(r,TONGUE_ANCHOR_RANGE);if(anchor){let cross=Math.sin(norm(Math.atan2(anchor.y-r.y,anchor.x-r.x)-r.face));r.tongue={kind:'anchor',target:anchor,started:performance.now(),side:cross>0?-1:1};msg('アンカーに舌！ 離すタイミングで脱出');return;}
 let other=racers[1-r.index],d=Math.hypot(other.x-r.x,other.y-r.y);if(d<((r.name==='Lilith'||r.name==='Beelzebub')?390:270)){if(other.highJump>0){msg('バーニングクライム！ 舌が届かない');return;}
 if(other.burningWing>0){r.hitSlow=.45;msg('熱い！ バーニングウィングで舌を弾かれた');return;}
 if(other.airBarrier>0){msg('エアバリア！ 舌を弾かれた');return;}r.tongue={kind:'rival',target:other,started:performance.now()};let behind=Math.cos(norm(r.face-other.face))>.35;if(!(other.name==='Uriel'&&behind))other.hitSlow=.55;tongueSlipstreamBoost(r);msg(other.name==='Uriel'&&behind?'舌ヒット！ ウリエルは減速しない':'舌ヒット！ スリップ加速！');return;}
 let near=nearestAnchor(r,560);if(near){msg('アンカーが遠い！ 外へ膨らみすぎて舌が届かない');}else msg('舌を伸ばしたが対象なし');}
function endTongue(r){if(!r.tongue)return;if(r.tongue.kind==='anchor'){let held=(performance.now()-r.tongue.started)/1000;if(held<.35)msg('舌を離すのが早い！ 外へ膨らむ');else if(held>.98){r.speed*=.82;msg('離すのが遅い！ 木に引かれて減速');}else{r.boost=.18;msg('ナイス舌ターン！');}}r.tongue=null;}
function nearestAnchor(r,range){let best=null,bd=1e9;for(const a of anchors){let d=Math.hypot(a.x-r.x,a.y-r.y),front=Math.cos(norm(Math.atan2(a.y-r.y,a.x-r.x)-r.face));if(d<range&&d<bd&&front>-.25){best=a;bd=d}}return best;}
function forceFall(o){forceFall(o);}
function useMichaelSkill(r,id,slot){
 let cdKey=slot==='A'?'skillCdA':'skillCdB';if(r[cdKey]>0)return true;
 let o=racers[1-r.index];
 if(id==='punch'){r[cdKey]=1.35;let d=Math.hypot(o.x-r.x,o.y-r.y);if(d<90){pushRival(o,r.face,78);msg('パンチ！ 相手を横へ弾いた');}else msg('パンチ！');return true;}
 if(id==='bubble'){r[cdKey]=.9;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(aim)*1250,vy:Math.sin(aim)*1250,owner:r,t:1.65});msg('泡弾！ 自動照準');return true;}
 if(id==='burningWing'){if(r.name!=='Kawazu'){if(r.burnWingUses<=0){msg('バーニングウィングは1レース3回まで！');return true;}r.burnWingUses--;}r[cdKey]=.45;r.burningWing=1.8;r.speed=Math.min(maxSpeed+230,Math.max(r.speed+265,maxSpeed+85));r.boost=1.35;msg(r.name==='Kawazu'?'バーニングウィング！':'バーニングウィング！ 残り '+r.burnWingUses+'/3');return true;}
 if(id==='highJump'){if(r.name!=='Kawazu'){if(r.burnClimbUses<=0){msg('バーニングクライムは1レース3回まで！');return true;}r.burnClimbUses--;}r[cdKey]=.45;r.highJump=1.05;r.highJumpTotal=1.05;r.highJumpDir=r.face;r.tongue=null;r.flight=3;r.onGround=false;r.speed=Math.max(535,Math.min(r.speed+90,610));msg(r.name==='Kawazu'?'バーニングクライム！':'バーニングクライム！ 残り '+r.burnClimbUses+'/3');return true;} 
 if(id==='normalHighJump'){r[cdKey]=1.15;r.normalHighJump=.72;r.tongue=null;r.flight=2;r.onGround=false;r.speed=Math.max(r.speed,420);msg('ハイジャンプ！');return true;} 
 if(id==='airSwim'){r[cdKey]=1.15;r.speed=Math.min(maxSpeed+155,r.speed+105);r.boost=.42;effects.push({kind:'airball',x:r.x-Math.cos(r.face)*20,y:r.y-Math.sin(r.face)*20,vx:-Math.cos(r.face)*850,vy:-Math.sin(r.face)*850,owner:r,t:.9,age:0});msg('エアースイム！');return true;}
 if(id==='wallKick'){r[cdKey]=1.25;let ti=trackInfo(r.x,r.y);if(ti.d>150){let seg=ti.i??nearestTrackSegment(r.x,r.y).i,next=path[(seg+1)%path.length],a=Math.atan2(next.y-r.y,next.x-r.x);r.face=a;r.speed=Math.min(maxSpeed+170,Math.max(r.speed+155,520));r.flight=2;r.onGround=false;r.wallEscape=.18;msg('壁キック！ 壁を蹴って再加速！');}else{let o=racers[1-r.index],dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);r.speed=Math.min(maxSpeed+90,r.speed+70);}msg('エアキック！');}return true;}
 if(id==='timeLag'){r[cdKey]=8;globalTimeLag=6;msg('タイムラグ！ 6秒間、周囲の時間が半分に！');return true;}
 if(id==='timeStop'){if(r.name!=='Kawazu'&&r.timeStopUsed){msg('時間停止は1レースに一度だけ！');return true;}if(r.name!=='Kawazu')r.timeStopUsed=true;r[cdKey]=r.name==='Kawazu'?4.0:99;globalTimeStop=3;msg(r.name==='Kawazu'?'時間停止！ 3秒！':'禁断スキル――時間停止！ 3秒！');return true;}
 if(id==='waterBoost'){r[cdKey]=1.15;r.speed=Math.min(maxSpeed+65,r.speed+58);r.boost=Math.max(r.boost||0,.34);effects.push({kind:'waterBoost',x:r.x-Math.cos(r.face)*18,y:r.y-Math.sin(r.face)*18,a:r.face+Math.PI,t:.32,max:.32,owner:r});msg('後方放水ブースト！');return true;}
 if(id==='waterLaser'){r[cdKey]=2.25;let inp=desiredInput(r),desired=Math.atan2(inp.y,inp.x),side=Math.sign(norm(desired-r.face)||1),recoil=r.face+side*Math.PI/2;r.face=norm(r.face+side*.62);r.x+=Math.cos(recoil)*48;r.y+=Math.sin(recoil)*48;r.speed=Math.min(maxSpeed+20,r.speed+36);effects.push({kind:'laser',x:r.x,y:r.y,a:recoil+Math.PI,t:.23,max:.23,owner:r});msg('水レーザー反動！');return true;}
 if(id==='airBarrier'){r[cdKey]=4.2;r.airBarrier=2;msg('エアバリア！');return true;}
 if(id==='airBoost'){r[cdKey]=1.2;r.speed=Math.min(maxSpeed+150,r.speed+150);r.boost=.7;msg('エアブースト！');return true;}
 if(id==='tackle'){r[cdKey]=2.4;let inp=desiredInput(r),side=Math.sign(Math.sin(norm(Math.atan2(inp.y,inp.x)-r.face))||1),a=r.face+side*Math.PI/2;r.x+=Math.cos(a)*82;r.y+=Math.sin(a)*82;if(Math.hypot(o.x-r.x,o.y-r.y)<105)pushRival(o,a,145);msg('タックル！');return true;}
 if(id==='rockFall'){r[cdKey]=2.1;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'rock',x:r.x,y:r.y,vx:Math.cos(aim)*760,vy:Math.sin(aim)*760,owner:r,t:1.4,age:0});msg('ロックフォール！');return true;}
 if(id==='smashDown'){r[cdKey]=2.1;if(Math.hypot(o.x-r.x,o.y-r.y)<105){forceFall(o);msg('叩き落とし！')}else msg('叩き落とし！');return true;}
 if(id==='chargeBoost'){startChargeBoost(r);return true;}
 if(id==='kick'){r[cdKey]=1.8;let dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);o.hitSlow=.55;r.speed=Math.min(maxSpeed+85,r.speed+95);r.boost=.4;msg('キック！')}else msg('キック！');return true;}
 if(id==='bewitch'){r[cdKey]=2;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bewitch',x:r.x,y:r.y,vx:Math.cos(aim)*900,vy:Math.sin(aim)*900,owner:r,t:1.55,age:0});msg('惑いの瘴気！');return true;}
 if(id==='poisonShot'){r[cdKey]=1.45;let aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'poison',x:r.x,y:r.y,vx:Math.cos(aim)*980,vy:Math.sin(aim)*980,owner:r,t:1.65,age:0});msg('毒液！');return true;}
 if(id==='poisonBoost'){r[cdKey]=2.5;r.speed=Math.min(maxSpeed+155,r.speed+150);r.boost=.72;effects.push({kind:'poisonMist',x:r.x-Math.cos(r.face)*35,y:r.y-Math.sin(r.face)*35,owner:r,t:4,max:4});msg('ポイズンブースト！');return true;}
 return false;
}
function useA(r){if(appState==='race'&&raceStartDelay>0)return;if(r.name==='Takumi'||r.name==='Bunta'){if(r.skillCdA>0)return;
   // 溝落とし: ALWAYS create a local tongue grip.  Bend detection is used only
   // to decide which side is "inside"; it must never be allowed to cancel the skill.
   let ns=nearestTrackSegment(r.x,r.y),n=path.length,i=ns.i;
   let ni=activeCourse.pointToPoint?Math.min(n-1,i+1):(i+1)%n;
   let p0=path[i],p1=path[ni];
   if(!p0||!p1)return;
   let entryAng=Math.atan2(p1.y-p0.y,p1.x-p0.x);
   let totalTurn=0,travel=0,lastAng=entryAng,lastPt={x:ns.qx,y:ns.qy};

   // Accumulate many tiny spline turns. This works on both ordinary courses and
   // Akina's very dense Catmull-Rom samples.
   for(let step=0;step<72&&travel<1400;step++){
     let si=activeCourse.pointToPoint?Math.min(n-2,i+step):(i+step)%n;
     if(activeCourse.pointToPoint&&si>=n-1)break;
     let a0=path[si],sj=activeCourse.pointToPoint?Math.min(n-1,si+1):(si+1)%n,b0=path[sj];
     if(!a0||!b0)break;
     let ang=Math.atan2(b0.y-a0.y,b0.x-a0.x);
     if(step>0)totalTurn+=norm(ang-lastAng);
     travel+=Math.hypot(a0.x-lastPt.x,a0.y-lastPt.y);
     lastAng=ang;lastPt=a0;
     if(Math.abs(totalTurn)>.28&&travel>120)break;
   }

   let side=Math.sign(totalTurn);
   if(!side){
     // On a nearly straight section, use the player's intended steering side so
     // pressing A still visibly responds instead of feeling broken.
     let inp=desiredInput(r),want=Math.atan2(inp.y,inp.x),steer=norm(want-entryAng);
     side=Math.sign(steer)||1;
   }

   const nx=-Math.sin(entryAng)*side,ny=Math.cos(entryAng)*side;
   const edge=Math.max(36,Math.min(courseHalfWidth*.54,126));
   let tx=r.x+Math.cos(entryAng)*70+nx*edge;
   let ty=r.y+Math.sin(entryAng)*70+ny*edge;
   let td=Math.hypot(tx-r.x,ty-r.y)||1;
   if(td>185){tx=r.x+(tx-r.x)/td*185;ty=r.y+(ty-r.y)/td*185;}

   let target={x:tx,y:ty,virtualWall:true,slide:true,turnSide:side};
   r.skillCdA=.70;
   r.tongue={kind:'gutter',target,started:performance.now()-180,side:side>0?-1:1};
   r.speed=Math.max(r.speed,480);
   r.wallGrace=Math.max(r.wallGrace,.20);
   msg('溝落とし！ 内側を舌で滑らせる！');

   setTimeout(()=>{
     if(r.tongue?.kind==='gutter'&&r.tongue.target===target){
       r.boost=.26;r.tongue=null;
     }
   },720);
   return;}if(r.name==='Michael'||r.name==='Kawazu'){useMichaelSkill(r,r.customSkillA||(r.name==='Kawazu'?'airSwim':'punch'),'A');return;}if(r.skillCdA>0)return;if(r.name==='Beelzebub'){let o=racers[1-r.index];if(o.tongue?.kind==='rival'&&o.tongue.target===r){forceFall(o);o.tongue=null;msg('毒反撃！ 舌を掴んだ相手が落下');}}
 if(r.name==='Gabriel'){waterBoost(r,false);return;}
 if(r.name==='Beelzebub'){r.skillCdA=1.45;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'poison',x:r.x,y:r.y,vx:Math.cos(aim)*980,vy:Math.sin(aim)*980,owner:r,t:1.65,age:0});msg('毒液！');return;}
 if(r.name==='Kawazu'){r.skillCdA=1.15;r.speed=Math.min(maxSpeed+155,r.speed+105);r.boost=.42;effects.push({kind:'airball',x:r.x-Math.cos(r.face)*20,y:r.y-Math.sin(r.face)*20,vx:-Math.cos(r.face)*850,vy:-Math.sin(r.face)*850,owner:r,t:.9,age:0});msg('エアースイム！');return;}
 if(r.name==='Raphael'){r.skillCdA=4.2;r.airBarrier=2.0;msg('エアバリア！ 舌・壁減速を無効');return;}
 if(r.name==='Lucifer'){r.skillCdA=2.1;let o=racers[1-r.index];if(o.burningWing>0){pushRival(r,o.face,115);msg('炎に弾かれた！');return;}let d=Math.hypot(o.x-r.x,o.y-r.y);if(d<105){o.flight=0;o.onGround=true;o.glideClock=0;o.speed=Math.min(o.speed,300);o.landAge=.28;msg('叩き落とし！ 相手を地上へ！')}else msg('叩き落とし！');return;}
 if(r.name==='Lilith'){r.skillCdA=1.8;let o=racers[1-r.index];if(o.burningWing>0){pushRival(r,o.face,115);msg('炎に弾かれた！');return;}let dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);o.hitSlow=.55;r.speed=Math.min(maxSpeed+85,r.speed+95);r.boost=.4;msg('キック！ 蹴って加速！')}else msg('キック！ 後ろの相手を狙う');return;}
 if(r.name==='Uriel'){r.skillCdA=2.4;let o=racers[1-r.index];if(o.burningWing>0){pushRival(r,o.face,130);msg('炎に弾かれた！');return;}let inp=desiredInput(r),side=Math.sign(Math.sin(norm(Math.atan2(inp.y,inp.x)-r.face))||1),a=r.face+side*Math.PI/2;r.x+=Math.cos(a)*82;r.y+=Math.sin(a)*82;if(Math.hypot(o.x-r.x,o.y-r.y)<105)pushRival(o,a,145);msg('タックル！ 横へ強く踏み込む');return;}
 if(r.name==='Michael'&&r.customSkillA!=='punch'){let id=r.customSkillA;if(id==='burningWing'){r.skillCdA=3.0;r.burningWing=1.25;r.speed=Math.min(maxSpeed+145,r.speed+150);r.boost=1.0;msg('バーニングウィング！');return;}
 if(id==='waterBoost'){waterBoost(r,false);return;}if(id==='airBarrier'){r.skillCdA=4.2;r.airBarrier=2;msg('エアバリア！');return;}
 if(id==='tackle'){r.skillCdA=2.4;let inp=desiredInput(r),side=Math.sign(Math.sin(norm(Math.atan2(inp.y,inp.x)-r.face))||1),a=r.face+side*Math.PI/2;r.x+=Math.cos(a)*82;r.y+=Math.sin(a)*82;msg('タックル！');return;}
 if(id==='smashDown'){r.skillCdA=2.1;let o=racers[1-r.index];if(Math.hypot(o.x-r.x,o.y-r.y)<105)forceFall(o);msg('叩き落とし！');return;}
 if(id==='kick'){r.skillCdA=1.8;r.speed=Math.min(maxSpeed+85,r.speed+80);msg('キック！');return;}
 if(id==='poisonShot'){r.skillCdA=1.45;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'poison',x:r.x,y:r.y,vx:Math.cos(aim)*980,vy:Math.sin(aim)*980,owner:r,t:1.65,age:0});msg('毒液！');return;}
 }
 if(r.customSkillA==='dash'&&r.name==='Michael'){r.skillCdA=2.6;r.speed=Math.min(maxSpeed+105,r.speed+105);r.boost=.45;msg('天使ダッシュ！');return;}
 r.skillCdA=1.35;let o=racers[1-r.index],d=Math.hypot(o.x-r.x,o.y-r.y);if(d<90){pushRival(o,r.face,78*(r.power||1));msg('パンチ！ 相手を横へ弾いた');}else msg('パンチ！');
}
function canDrift(r){return ['Michael','Takumi','Bunta','Inu','Saru','Nakazato','Keisuke','Akiyama'].includes(r.name);}
function startTakumiDrift(r){
 if(!canDrift(r)||r.drifting||r.skillCdB>0)return;
 r.drifting=true;r.driftCharge=0;r.driftMoveFace=r.face;r.driftSide=0;r.driftFxClock=0;r.driftGhosts=[];r.skillCdB=.12;
 r.flight=Math.max(2,r.flight);r.onGround=false;r.speed=Math.max(r.speed,455);
 msg('ドリフト飛行！ B長押しで横滑り、離して加速');
}
function releaseTakumiDrift(r){
 if(!r||!canDrift(r)||!r.drifting)return;
 let p=Math.min(1,(r.driftCharge||0)/1.35);
 r.drifting=false;r.skillCdB=.65;r.driftFxClock=0;
 if(p>.12){let ks=r.name==='Keisuke';r.speed=Math.min(maxSpeed+(r.name==='Bunta'?165:ks?245:225),Math.max(r.speed+(r.name==='Bunta'?100:ks?125:95)+(r.name==='Bunta'?195:ks?215:190)*p,(r.name==='Bunta'?625:ks?635:610)+(r.name==='Bunta'?120:ks?125:110)*p));r.boost=(r.name==='Bunta'?.46:.42)+(r.name==='Bunta'?.56:.55)*p;msg('ドリフト加速 '+Math.round(p*100)+'%！');}
 else msg('ドリフト解除');
 r.driftCharge=0;r.driftMoveFace=r.face;
}
function useB(r){if(appState==='race'&&raceStartDelay>0)return;if(canDrift(r)){startTakumiDrift(r);return;}if(r.name==='Kawazu'){useMichaelSkill(r,r.customSkillB||'wallKick','B');return;}if(r.skillCdB>0)return;if(r.name==='Beelzebub'){let o=racers[1-r.index];if(o.tongue?.kind==='rival'&&o.tongue.target===r){forceFall(o);o.tongue=null;msg('毒反撃！ 舌を掴んだ相手が落下');}}
 if(r.name==='Gabriel'){waterSkill(r,true,false);return;}
 if(r.name==='Beelzebub'){r.skillCdB=2.5;r.speed=Math.min(maxSpeed+155,r.speed+150);r.boost=.72;let bx=r.x-Math.cos(r.face)*35,by=r.y-Math.sin(r.face)*35;effects.push({kind:'poisonMist',x:bx,y:by,owner:r,t:4.0,max:4.0});msg('ポイズンブースト！');return;}
 if(r.name==='Kawazu'){r.skillCdB=1.25;let ti=trackInfo(r.x,r.y);if(ti.d>165){let a=Math.atan2(r.y-ti.qy,r.x-ti.qx)+Math.PI;r.face=norm(a);r.x=ti.qx+Math.cos(a)*150;r.y=ti.qy+Math.sin(a)*150;r.speed=Math.min(maxSpeed+145,r.speed+90);r.boost=.35;msg('壁キック！')}else{let o=racers[1-r.index],dx=o.x-r.x,dy=o.y-r.y,d=Math.hypot(dx,dy),behind=Math.cos(norm(Math.atan2(dy,dx)-r.face))<-.15;if(d<135&&behind){pushRival(o,r.face+Math.PI,105);r.speed=Math.min(maxSpeed+90,r.speed+70);}msg('エアキック！')}return;}
 if(r.name==='Raphael'){if((r.airBoostUses||0)<=0){msg('エアブーストは使い切った！');return;}r.airBoostUses--;r.skillCdB=.7;r.speed=Math.min(maxSpeed+150,r.speed+165);r.boost=.75;msg('エアブースト！ 残り'+r.airBoostUses+'回');return;}
 if(r.name==='Lucifer'){startChargeBoost(r);return;}
 if(r.name==='Lilith'){r.skillCdB=2.0;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bewitch',x:r.x,y:r.y,vx:Math.cos(aim)*900,vy:Math.sin(aim)*900,owner:r,t:1.55,age:0});msg('惑いの瘴気！');return;}
 if(r.name==='Uriel'){r.skillCdB=2.1;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'rock',x:r.x,y:r.y,vx:Math.cos(aim)*760,vy:Math.sin(aim)*760,owner:r,t:1.4,age:0});msg('ロックフォール！');return;}
 if(r.name==='Michael'&&r.customSkillB!=='bubble'){let id=r.customSkillB;
 if(id==='waterLaser'){waterSkill(r,true,false);return;}if(id==='airBoost'){r.skillCdB=1.2;r.speed=Math.min(maxSpeed+150,r.speed+150);r.boost=.7;msg('エアブースト！');return;}
 if(id==='rockFall'){r.skillCdB=2.1;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'rock',x:r.x,y:r.y,vx:Math.cos(aim)*760,vy:Math.sin(aim)*760,owner:r,t:1.4,age:0});msg('ロックフォール！');return;}
 if(id==='chargeBoost'){startChargeBoost(r);return;}if(id==='bewitch'){r.skillCdB=2;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bewitch',x:r.x,y:r.y,vx:Math.cos(aim)*900,vy:Math.sin(aim)*900,owner:r,t:1.55,age:0});msg('惑いの瘴気！');return;}
 if(id==='poisonBoost'){r.skillCdB=2.5;r.speed=Math.min(maxSpeed+155,r.speed+150);r.boost=.72;effects.push({kind:'poisonMist',x:r.x-Math.cos(r.face)*35,y:r.y-Math.sin(r.face)*35,owner:r,t:4,max:4});msg('ポイズンブースト！');return;}
 }
 if(r.customSkillB==='feather'&&r.name==='Michael'){r.skillCdB=3.0;r.speed=Math.min(maxSpeed+120,r.speed+125);r.boost=.55;msg('羽根ブースト！');return;}
 r.skillCdB=.9;let o=racers[1-r.index],aim=Math.atan2(o.y-r.y,o.x-r.x);effects.push({kind:'bubble',x:r.x,y:r.y,vx:Math.cos(aim)*1250,vy:Math.sin(aim)*1250,owner:r,t:1.65});msg('泡弾！ 自動照準');
}
function startChargeBoost(r){if(r.skillCdB>0||r.charging)return;r.charging=true;r.charge=0;msg('チャージ中… Bを離して加速');}
function releaseChargeBoost(r){if(!r.charging)return;r.charging=false;let p=Math.min(1,r.charge/1.8);r.skillCdB=1.2;r.speed=Math.min(maxSpeed+165,r.speed+70+180*p);r.boost=.35+.65*p;msg('チャージブースト '+Math.round(p*100)+'%！');r.charge=0;}
let effects=[];
function waterBoost(r,silent){if(r.skillCdA>0)return;r.skillCdA=1.15;let jetAng=r.face+Math.PI;r.speed=Math.min(maxSpeed+65,r.speed+58);r.boost=Math.max(r.boost||0,.34);effects.push({kind:'waterBoost',x:r.x-Math.cos(r.face)*18,y:r.y-Math.sin(r.face)*18,a:jetAng,t:.32,max:.32,owner:r});if(!silent)msg('後方放水ブースト！');}
function waterSkill(r,laser,silent){let key=laser?'skillCdB':'skillCdA';if(r[key]>0)return;r[key]=laser?2.25:1.05;let inp=desiredInput(r),desired=Math.atan2(inp.y,inp.x),steer=norm(desired-r.face);let turnSide=Math.sign(steer||1); // recoil goes toward desired turn, jet fires opposite side
 let recoilAng=r.face+turnSide*Math.PI/2,jetAng=recoilAng+Math.PI;r.face=norm(r.face+turnSide*(laser?.62:.24));r.x+=Math.cos(recoilAng)*(laser?48:19);r.y+=Math.sin(recoilAng)*(laser?48:19);r.speed=Math.min(maxSpeed+20,r.speed+(laser?36:12));effects.push({kind:laser?'laser':'water',x:r.x,y:r.y,a:jetAng,t:laser?.23:.34,max:laser?.23:.34,owner:r});if(!silent)msg(laser?'水レーザー反動！ 舌なし急旋回':'水弾反動！ 横へスライド');}

function tongueSlipstreamBoost(r){
  if(!r)return;
  r.speed=Math.min(maxSpeed+130,Math.max(r.speed+145,maxSpeed*.92));
  r.tongueBoostTimer=.52;
  r.tongueBoostFx=.52;
}
function pushRival(o,face,amt){let side=Math.random()<.5?-1:1;o.x+=Math.cos(face+side*Math.PI/2)*amt;o.y+=Math.sin(face+side*Math.PI/2)*amt;}
function updateEffects(dt){for(const e of effects){if(globalTimeStop>0&&e.owner!==racers[controlledIndex])continue;let edt=(globalTimeLag>0&&e.owner!==racers[controlledIndex])?dt*.5:dt;e.t-=edt;e.age=(e.age||0)+edt;
 if(['bubble','rock','bewitch','poison','airball'].includes(e.kind)){e.x+=e.vx*edt;e.y+=e.vy*edt;let o=racers[1-e.owner.index],rad=e.kind==='rock'?23:21;if(Math.hypot(o.x-e.x,o.y-e.y)<o.r+rad){if(o.highJump>0){continue;}if(o.airBarrier>0&&e.kind!=='bewitch'){e.t=0;if(e.owner===racers[controlledIndex])msg('エアバリアに弾かれた！');continue;}if(e.kind==='bewitch'){o.confuse=2.2;if(e.owner===racers[controlledIndex])msg('惑いの瘴気ヒット！ 操作反転！');}else if(e.kind==='poison'){forceFall(o);if(e.owner===racers[controlledIndex])msg('毒液ヒット！ 相手が落下！');}else if(e.kind==='airball'){pushRival(o,Math.atan2(e.vy,e.vx),105);if(e.owner===racers[controlledIndex])msg('空気弾ヒット！');}else{pushRival(o,Math.atan2(e.vy,e.vx),e.kind==='rock'?175:70);if(e.owner===racers[controlledIndex])msg(e.kind==='rock'?'岩ヒット！ 大きく弾いた！':'泡弾ヒット！ 壁に押し出せ！');}e.t=0;}}
 if(e.kind==='poisonMist'){let o=racers[1-e.owner.index];if(Math.hypot(o.x-e.x,o.y-e.y)<70){if(o.highJump>0)continue;if(o.airBarrier>0)continue;forceFall(o);e.t=0;if(e.owner===racers[controlledIndex])msg('毒霧ヒット！ 相手が落下！');}}
 }effects=effects.filter(e=>e.t>0)}
function trackInfo(px,py){let best={d:1e9,qx:0,qy:0,i:0,t:0,branch:false};const scan=(pts,closed,isBranch)=>{let lim=closed?pts.length:pts.length-1;for(let i=0;i<lim;i++){let a=pts[i],b=pts[(i+1)%pts.length],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l2)),qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(px-qx,py-qy);if(d<best.d)best={d,qx,qy,i,t,branch:isBranch}}};scan(path,!activeCourse.pointToPoint,false);for(const br of courseBranches)scan(br,false,true);return best}
function routeLockedTrackInfo(r){
  // Akagi has very close switchbacks and two places where the supplied draft centreline
  // geometrically crosses itself. For collision/recovery, use route ORDER rather than the
  // globally-nearest road. This prevents a racer from changing to a non-adjacent leg at a crossing.
  if(courseTheme!=='akagi'||!activeCourse.pointToPoint||!r)return trackInfo(r?.x??0,r?.y??0);
  const n=path.length,base=Math.max(0,Math.min(n-2,r.routeIndex||0));
  let best={d:1e9,qx:path[base].x,qy:path[base].y,i:base,t:0,branch:false};
  for(let off=-3;off<=18;off++){
    let i=base+off;if(i<0||i>=n-1)continue;
    let a=path[i],b=path[i+1],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy||1;
    let t=Math.max(0,Math.min(1,((r.x-a.x)*vx+(r.y-a.y)*vy)/l2));
    let qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(r.x-qx,r.y-qy);
    // Prefer forward progress on near-ties, but never jump many route legs merely because
    // another switchback happens to be physically close.
    let score=d-Math.max(0,off)*1.2;
    if(score<best.d)best={d:score,rawD:d,qx,qy,i,t,branch:false};
  }
  if(best.rawD==null)best.rawD=best.d;
  // Allow normal forward progress and at most a tiny rollback for recovery.
  if(best.i>=base-1)r.routeIndex=Math.max(0,Math.max(base-1,best.i));
  best.d=best.rawD;
  return best;
}
function trackDistance(px,py){return trackInfo(px,py).d}
function draw(){
 let me=racers[controlledIndex],timeFx=globalTimeStop>0?'stop':(globalTimeLag>0?'lag':'');
 camera.x=approach(camera.x,me.x-W/2,.16*W);camera.y=approach(camera.y,me.y-H/2,.16*H);camera.x=Math.max(0,Math.min(world.w-W,camera.x));camera.y=Math.max(0,Math.min(world.h-H,camera.y));ctx.clearRect(0,0,W,H);
 ctx.save();ctx.translate(-camera.x,-camera.y);
 if(timeFx){
   // Do NOT use Canvas ctx.filter here. On large courses (especially Akina) filter
   // forces expensive full-scene raster processing and makes the controllable racer
   // appear to move in frame-steps. Draw the frozen/slowed world normally instead.
   drawWorld();
   for(const e of effects)if(e.owner!==me)drawEffect(e);
   for(const r of racers)if(r!==me)drawRacer(r);

   // Tint only the already-drawn surroundings/opponent. The player is drawn AFTER
   // this veil, so its color and animation remain completely normal and smooth.
   ctx.save();
   ctx.fillStyle=timeFx==='stop'?'rgba(24,73,130,.30)':'rgba(45,96,145,.18)';
   ctx.fillRect(camera.x,camera.y,W,H);
   ctx.restore();

   for(const e of effects)if(e.owner===me)drawEffect(e);
   drawRacer(me);
 }else{
   drawWorld();for(const e of effects)drawEffect(e);for(const r of racers)drawRacer(r);
 }
 ctx.restore();
 if(timeFx)drawTimeEffectOverlay(timeFx);
 drawMini();updateHud(me);
 if(raceStartDelay>0){ctx.save();ctx.fillStyle='rgba(8,35,31,.72)';ctx.fillRect(W/2-92,H/2-46,184,92);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 30px sans-serif';ctx.fillText(raceStartDelay>.65?'READY':'GO!',W/2,H/2+10);ctx.restore();}
}
function drawTimeEffectOverlay(mode){
 ctx.save();
 const stop=mode==='stop';
 ctx.strokeStyle=stop?'rgba(205,235,255,.68)':'rgba(210,240,255,.38)';ctx.lineWidth=stop?5:3;
 ctx.strokeRect(7,7,W-14,H-14);
 ctx.font=stop?'bold 28px sans-serif':'bold 21px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
 ctx.fillStyle=stop?'rgba(235,248,255,.96)':'rgba(232,247,255,.78)';
 ctx.fillText(stop?'TIME STOP':'TIME LAG',W/2,18);
 ctx.restore();
}
function drawWorld(){
 // The race is airborne: below the racers is a pond, not a road surface.
 const pal=courseTheme==='akina'?{water:'#4f8a43',grass:'#275d31',inner:'#777b7d'}:courseTheme==='akagi'?{water:'#496c3f',grass:'#2f4f32',inner:'#6f7375'}:courseTheme==='autumn'?{water:'#d8b46a',grass:'#713d25',inner:'#d9c39a'}:courseTheme==='wind'?{water:'#9edee8',grass:'#55995b',inner:'#b7e4e7'}:courseTheme==='forest'?{water:'#77b8a5',grass:'#245f38',inner:'#86c3ae'}:courseTheme==='master'?{water:'#77758d',grass:'#403d52',inner:'#8b879d'}:{water:'#58bdd5',grass:'#397e48',inner:'#70c8d9'};ctx.fillStyle=pal.water;ctx.fillRect(0,0,world.w,world.h);
 // soft scenery texture; Akina is land, not pond.
 if(courseTheme==='akina'){
   // Akina: intentionally plain green outside the asphalt for performance and readability.
 }else{
   for(let y=240;y<world.h;y+=620){for(let x=260;x<world.w;x+=760){let n=((x*13+y*7)%190)-95;ctx.fillStyle='rgba(255,255,255,.055)';ctx.beginPath();ctx.ellipse(x+n,y-n*.35,170,72,.18,0,Math.PI*2);ctx.fill();}}
   for(const l of lilies)drawLily(l.x,l.y,l.r);
 }
 if(courseTheme==='wind'){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ffffff';ctx.lineWidth=10;for(let i=0;i<12;i++){let x=300+(i*487)%5400,y=250+(i*811)%3900;ctx.beginPath();ctx.arc(x,y,55,0,Math.PI*1.5);ctx.stroke();}ctx.restore();}
 if(courseTheme==='forest'){ctx.save();for(let i=0;i<20;i++){let x=220+(i*701)%5550,y=180+(i*997)%4000;if(trackDistance(x,y)>330){ctx.fillStyle='#174b2b';ctx.beginPath();ctx.arc(x,y,42,0,Math.PI*2);ctx.fill();}}ctx.restore();}
 if(courseTheme==='master'){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#c7a7ff';for(let i=0;i<14;i++){let x=300+(i*839)%5300,y=260+(i*541)%3800;ctx.beginPath();ctx.arc(x,y,35+(i%3)*14,0,Math.PI*2);ctx.fill();}ctx.restore();}

 ctx.lineCap='round';ctx.lineJoin='round';
 const drawRoute=(pts,closed=true)=>{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);if(closed)ctx.closePath();ctx.stroke();};
 // Every race corridor has a visible inner frame. Courses that were "open" are framed again
 // because losing the inside boundary makes the route unreadable and creates accidental cuts.
 if(courseTheme==='akagi'){
   // Akagi contains several very close switchbacks. Drawing the whole asphalt stroke at
   // once turns close/self-crossing centre lines into a single junction-shaped grey blob.
   // Paint one spline interval at a time (edge + asphalt) so each road remains visibly
   // separated from a non-adjacent interval. This does not create any shortcut/topology.
   const step=Math.max(4,activeCourse.splineSteps||24);
   for(let st=0;st<path.length-1;st+=step){
     const ed=Math.min(path.length-1,st+step),seg=path.slice(st,ed+1);
     ctx.strokeStyle=pal.grass;ctx.lineWidth=courseHalfWidth*2+18;drawRoute(seg,false);
     ctx.strokeStyle=pal.inner;ctx.lineWidth=courseHalfWidth*2;drawRoute(seg,false);
   }
 }else{
   ctx.strokeStyle=pal.grass;ctx.lineWidth=courseHalfWidth*2+(courseTheme==='akina'?24:70);drawRoute(path,!activeCourse.pointToPoint);for(const br of courseBranches)drawRoute(br,false);
   ctx.strokeStyle=pal.inner;ctx.lineWidth=courseHalfWidth*2;drawRoute(path,!activeCourse.pointToPoint);for(const br of courseBranches)drawRoute(br,false);
 }
 if(courseTheme!=='akina'&&courseTheme!=='akagi')drawGrassBlades();
 ctx.strokeStyle=courseTheme==='akina'?'rgba(245,245,235,.72)':'rgba(255,255,255,.16)';ctx.lineWidth=courseTheme==='akina'?5:3;ctx.setLineDash(courseTheme==='akina'?[34,42]:[18,46]);drawRoute(path,!activeCourse.pointToPoint);for(const br of courseBranches)drawRoute(br,false);ctx.setLineDash([]);
 for(const a of anchors)(a.kind==='pole'?drawAnchorPole(a.x,a.y):drawTree(a.x,a.y));
 // start gate across the water corridor
 {const gates=activeCourse.pointToPoint?[startGate(),finishGate()]:[finishGate()];for(const g of gates){ctx.save();ctx.translate(g.p0.x,g.p0.y);ctx.rotate(Math.atan2(g.ty,g.tx)+Math.PI/2);let gh=Math.max(190,courseHalfWidth+55);for(let i=-4;i<=4;i++){ctx.fillStyle=i%2?'#fff':'#252525';ctx.fillRect(i*20,-gh,20,gh*2)}ctx.restore();}}
}
function strokeLoop(){ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.closePath();ctx.stroke()}
function drawGrassBlades(){
 const edge=courseHalfWidth+(courseTheme==='akina'?2:6),blade=courseTheme==='akina'?20:28,spacing=courseTheme==='akina'?78:34;
 ctx.fillStyle='#2f8a43';
 const margin=180,x0=camera.x-margin,x1=camera.x+W+margin,y0=camera.y-margin,y1=camera.y+H+margin;
 for(let i=0;i<(activeCourse.pointToPoint?path.length-1:path.length);i++){
  const a=path[i],b=path[(i+1)%path.length];
  if(courseTheme==='akina'&&(Math.max(a.x,b.x)<x0||Math.min(a.x,b.x)>x1||Math.max(a.y,b.y)<y0||Math.min(a.y,b.y)>y1))continue;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,tx=dx/len,ty=dy/len,nx=-ty,ny=tx,count=Math.max(1,Math.floor(len/spacing));
  for(let j=0;j<=count;j++){
   const d=Math.min(len,j*spacing),wob=((j+i)&1)?7:-7,cx=a.x+tx*d,cy=a.y+ty*d;
   if(courseTheme==='akina'&&(cx<x0||cx>x1||cy<y0||cy>y1))continue;
   for(const side of [-1,1]){
    const bx=cx+nx*edge*side,by=cy+ny*edge*side,tipx=bx+nx*blade*side+tx*wob,tipy=by+ny*blade*side+ty*wob;
    ctx.beginPath();ctx.moveTo(bx-tx*11,by-ty*11);ctx.lineTo(tipx,tipy);ctx.lineTo(bx+tx*11,by+ty*11);ctx.closePath();ctx.fill();
   }
  }
 }
}
function drawLily(x,y,r){ctx.save();ctx.translate(x,y);ctx.fillStyle='#4aa74c';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.lineTo(0,0);ctx.arc(0,0,r,-.48,.48,true);ctx.closePath();ctx.fill();ctx.fillStyle='#8cd45d';ctx.beginPath();ctx.arc(-r*.22,-r*.18,r*.22,0,Math.PI*2);ctx.fill();if(r>65){ctx.fillStyle='#f5bfd4';for(let i=0;i<6;i++){let a=i*Math.PI/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.18,Math.sin(a)*r*.18,r*.16,r*.07,a,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#ffd86b';ctx.beginPath();ctx.arc(0,0,r*.08,0,Math.PI*2);ctx.fill()}ctx.restore()}
function drawTree(x,y){ctx.fillStyle='#714624';ctx.fillRect(x-10,y-8,20,72);ctx.fillStyle='#247b3c';ctx.beginPath();ctx.arc(x,y-20,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8bd85d';ctx.beginPath();ctx.arc(x-10,y-30,14,0,Math.PI*2);ctx.fill()}
function drawAnchorPole(x,y){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#d9ddd8';ctx.fillRect(-5,-50,10,92);
 ctx.fillStyle='#f2b632';ctx.fillRect(-8,-50,16,18);
 ctx.strokeStyle='#4f5350';ctx.lineWidth=3;ctx.strokeRect(-5,-50,10,92);
 ctx.fillStyle='#f7e27b';ctx.beginPath();ctx.arc(0,-53,8,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
let currentWingSpecial=false,currentWingRed=false,currentWingBurning=false,currentWingTakumi=false,currentWingTakumiBlue=false,currentWingFold=0;
function angelWing(x,y,side,scale=1,tilt=0){
 // One connected angel-wing silhouette. Broad at the shoulder, tapered into layered feather tips.
 ctx.save();ctx.translate(x,y);ctx.scale(side*scale*(1-.30*currentWingFold),scale*(1-.08*currentWingFold));ctx.rotate(tilt+side*.20*currentWingFold);
 ctx.fillStyle=currentWingBurning?'#d51f2f':(currentWingRed?'#d74c57':(currentWingTakumi?(currentWingTakumiBlue?'#2e67d1':'#f7f5e9'):(currentWingSpecial?'#fff9d8':'#fffdf5')));ctx.strokeStyle=currentWingBurning?'#78131d':(currentWingRed?'#7e2530':(currentWingTakumi?(currentWingTakumiBlue?'#123779':'#242424'):(currentWingSpecial?'#e4b94f':'#c9d9dc')));ctx.lineWidth=2.2;ctx.lineJoin='round';
 ctx.beginPath();
 ctx.moveTo(0,2);
 ctx.bezierCurveTo(12,-17,32,-27,55,-25);
 ctx.bezierCurveTo(48,-18,43,-12,39,-8);
 ctx.bezierCurveTo(52,-11,64,-8,72,-2);
 ctx.bezierCurveTo(62,2,54,5,47,8);
 ctx.bezierCurveTo(57,9,65,14,69,20);
 ctx.bezierCurveTo(58,21,48,20,39,18);
 ctx.bezierCurveTo(47,23,51,28,50,34);
 ctx.bezierCurveTo(37,33,27,29,20,24);
 ctx.bezierCurveTo(24,31,23,37,18,41);
 ctx.bezierCurveTo(8,31,3,18,0,2);
 ctx.closePath();ctx.fill();ctx.stroke();
 // restrained feather separators: keep the wing reading as one mass, not insect wings
 ctx.strokeStyle=currentWingBurning?'#ff5964':(currentWingRed?'#f19a9f':(currentWingTakumi?'#88857e':(currentWingSpecial?'#fff0a6':'#e2ecee')));ctx.lineWidth=1.8;
 for(const pts of [[[9,3],[33,-13],[55,-16]],[[10,9],[34,1],[59,1]],[[10,15],[31,13],[55,18]],[[9,21],[25,25],[41,31]]]){
  ctx.beginPath();ctx.moveTo(...pts[0]);ctx.quadraticCurveTo(...pts[1],...pts[2]);ctx.stroke();
 }
 if(currentWingTakumi&&!currentWingBurning){
   ctx.fillStyle='#171717';
   for(const tip of [[[58,-22],[72,-2],[55,2],[46,-7]],[[55,3],[69,20],[49,20],[38,12]],[[43,20],[50,34],[29,30],[20,23]]]){
     ctx.beginPath();ctx.moveTo(...tip[0]);for(let i=1;i<tip.length;i++)ctx.lineTo(...tip[i]);ctx.closePath();ctx.fill();
   }
   ctx.strokeStyle='#171717';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(13,17);ctx.quadraticCurveTo(32,19,52,22);ctx.stroke();ctx.beginPath();ctx.moveTo(15,21);ctx.quadraticCurveTo(31,23,45,26);ctx.stroke();
   ctx.fillStyle='#171717';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.fillText('TOFU',35,9);
 }
 ctx.restore();
}
function frogFront(r){
 // broad, friendly frog head and compact human-like body; wings emerge from the shoulders
 angelWing(-18,-3,-1,.94,-.03);angelWing(18,-3,1,.94,.03);
 ctx.fillStyle=r.color;
 // legs behind body
 ctx.beginPath();ctx.ellipse(-11,28,9,16,.28,0,Math.PI*2);ctx.ellipse(11,28,9,16,-.28,0,Math.PI*2);ctx.fill();
 // compact torso
 ctx.beginPath();ctx.roundRect(-18,-1,36,39,16);ctx.fill();
 // simple arms
 ctx.beginPath();ctx.ellipse(-23,10,7,16,.35,0,Math.PI*2);ctx.ellipse(23,10,7,16,-.35,0,Math.PI*2);ctx.fill();
 // oversized frog head
 ctx.beginPath();ctx.ellipse(0,-21,31,25,0,0,Math.PI*2);ctx.fill();
 // eye bumps integrated into head
 ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();
 // belly
 ctx.fillStyle='#e7f4c9';ctx.beginPath();ctx.ellipse(0,13,12,17,0,0,Math.PI*2);ctx.fill();
 // eyes
 ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#142019';ctx.beginPath();ctx.arc(-12,-39,4,0,Math.PI*2);ctx.arc(12,-39,4,0,Math.PI*2);ctx.fill();
 // smile, centered lower on the face like the original game character
 ctx.strokeStyle='#17352d';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,-18,10,.18,Math.PI-.18);ctx.stroke();
}
function frogBack(r){
 // body first; wings are intentionally drawn afterwards so their roots sit on the viewer side of the upper back
 ctx.fillStyle=r.color;
 ctx.beginPath();ctx.ellipse(-11,28,9,16,.28,0,Math.PI*2);ctx.ellipse(11,28,9,16,-.28,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.roundRect(-18,-1,36,39,16);ctx.fill();
 ctx.beginPath();ctx.ellipse(-23,10,7,16,.35,0,Math.PI*2);ctx.ellipse(23,10,7,16,-.35,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(0,-21,31,25,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();
 // wings overlap the upper back at the shoulder blades
 angelWing(-15,-7,-1,.98,-.03);angelWing(15,-7,1,.98,.03);
 // small green shoulder caps in front of the wing roots sell the attachment point
 ctx.fillStyle=r.color;ctx.beginPath();ctx.ellipse(-16,-3,8,10,-.45,0,Math.PI*2);ctx.ellipse(16,-3,8,10,.45,0,Math.PI*2);ctx.fill();
}
function frogSide(r,left){
 const d=left?-1:1;ctx.save();ctx.scale(d,1);
 // far wing peeks behind the body, main wing grows from the visible shoulder and sweeps backward
 ctx.globalAlpha=.78;angelWing(-10,-5,-1,.76,-.06);ctx.globalAlpha=1;
 ctx.fillStyle=r.color;
 ctx.beginPath();ctx.ellipse(-8,28,10,16,.28,0,Math.PI*2);ctx.ellipse(9,29,9,15,-.18,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.roundRect(-16,-1,34,39,15);ctx.fill();
 ctx.beginPath();ctx.ellipse(-20,9,7,15,.28,0,Math.PI*2);ctx.fill();
 // frog side-profile head: rounded rear, short projecting muzzle
 ctx.beginPath();ctx.ellipse(4,-21,28,24,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(13,-38,13,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(25,-18,13,12,0,0,Math.PI*2);ctx.fill();
 // visible wing on top of shoulder/body connection
 angelWing(-11,-7,-1,.96,-.04);
 ctx.fillStyle='#e7f4c9';ctx.beginPath();ctx.ellipse(8,13,10,17,0,0,Math.PI*2);ctx.fill();
 // one readable eye in profile
 ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#142019';ctx.beginPath();ctx.arc(18,-39,4,0,Math.PI*2);ctx.fill();
 // tiny mouth curve near muzzle
 ctx.strokeStyle='#17352d';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.arc(22,-17,7,.35,Math.PI-.5);ctx.stroke();
 ctx.restore();
}

function tongueMouthPoint(r){
  // Visual-only mouth origin. Tongue physics / racer center of mass are unchanged.
  // This keeps steering and anchor-turn balance identical while making the tongue
  // visibly leave the frog's mouth in every facing direction.
  const now=performance.now()/1000;
  let lift=0,lean=0,poseScale=1;
  if(r.highJump>0){let hp=1-r.highJump/Math.max(.001,r.highJumpTotal||1.05);lift=118*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.96-.10*Math.sin(Math.PI*hp);}
  else if(r.normalHighJump>0){let hp=1-r.normalHighJump/.72;lift=72*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.98-.05*Math.sin(Math.PI*hp);}
  else if(r.flight===1){let t=Math.min(1,r.jumpAge/.42);lift=30*Math.sin(t*Math.PI*.92)+10;poseScale=1+.08*Math.sin(t*Math.PI);}
  else if(r.flight===2){lift=35+5*Math.sin(now*12);poseScale=1+.035*Math.sin(now*12);}
  else if(r.flight===3){lift=30;lean=13;poseScale=.98;}
  if(r.landAge>0)poseScale=1-.08*Math.sin((r.landAge/.28)*Math.PI);
  const charScale=(courseTheme==='akina'||courseTheme==='usui'||courseTheme==='myogi'||courseTheme==='shomaru'||courseTheme==='akagi')?.58:1;
  const sc=poseScale*charScale;
  let a=norm(r.face),dir=Math.abs(a)<Math.PI/4?'right':Math.abs(a)>Math.PI*3/4?'left':a<0?'up':'down';
  // Match the cardinal character art rather than using the raw continuous face angle.
  let ox=0,oy=0;
  if(dir==='right'){ox=27;oy=-12;}
  else if(dir==='left'){ox=-27;oy=-12;}
  else if(dir==='up'){ox=0;oy=-27;}
  else {ox=0;oy=-17;}
  return {
    x:r.x+Math.cos(r.face)*lean+ox*sc,
    y:r.y+Math.sin(r.face)*lean-lift+oy*sc
  };
}

function drawDriftFlightFx(r){
 if(!canDrift(r))return;
 const ghosts=r.driftGhosts||[];
 if(ghosts.length){
   ctx.save();
   for(const g of ghosts){
     let a=Math.max(0,Math.min(1,g.t/.28));
     ctx.globalAlpha=.16*a;
     ctx.translate(g.x,g.y);
     ctx.rotate(g.face);
     ctx.strokeStyle='#eafcff';ctx.lineWidth=5;
     ctx.beginPath();ctx.ellipse(-8,0,30,17,0,0,Math.PI*2);ctx.stroke();
     ctx.rotate(-g.face);ctx.translate(-g.x,-g.y);
   }
   ctx.restore();
 }
 if(!r.drifting)return;
 // Visual trails follow the ACTUAL velocity vector, not the stored drift heading.
 // This keeps the two long lines behind Takumi even while steering, wall nudges or
 // gutter forces bend the real movement direction.
 const actualSpeed=Math.hypot(r.vx||0,r.vy||0);
 const move=actualSpeed>20?Math.atan2(r.vy,r.vx):(r.driftMoveFace||r.face);
 const slip=norm(r.face-move),side=Math.sign(slip)||1;
 const charge=Math.min(1,(r.driftCharge||0)/1.35),now=performance.now()/1000;
 ctx.save();
 // Air-cut slashes: angled across the actual slide direction so sideways drift reads clearly.
 ctx.strokeStyle='rgba(230,250,255,.78)';
 ctx.lineWidth=4;
 ctx.lineCap='round';
 for(let i=0;i<5;i++){
   let back=38+i*24,lat=side*(22+i*8),pulse=Math.sin(now*15+i)*8;
   let bx=r.x-Math.cos(move)*back+Math.cos(move+Math.PI/2)*(lat+pulse);
   let by=r.y-Math.sin(move)*back+Math.sin(move+Math.PI/2)*(lat+pulse);
   let slash=move+side*.78;
   ctx.globalAlpha=.34+.08*i+.18*charge;
   ctx.beginPath();
   ctx.moveTo(bx-Math.cos(slash)*20,by-Math.sin(slash)*20);
   ctx.lineTo(bx+Math.cos(slash)*28,by+Math.sin(slash)*28);
   ctx.stroke();
 }
 // v2.71: long twin wake lines removed; short air-cut streaks remain.
 ctx.restore();
}
function drawAnimalRacer(r,dir){
 const dog=CHARACTER_DATA[r.name]?.species==='dog',side=dir==='left'||dir==='right',left=dir==='left';
 const akiyama=r.name==='Akiyama';
 ctx.save();
 if(side&&left)ctx.scale(-1,1);
 // Akiyama deliberately has clear paws/legs so the canine silhouette stays readable at phone scale.
 const legCol=akiyama?'#deddd6':r.color,pawCol=akiyama?'#555552':(dog?'#6a5546':r.color);
 if(dir==='up'){
   ctx.globalAlpha=.95;angelWing(-17,-5,-1,1.02,-.04);angelWing(17,-5,1,1.02,.04);ctx.globalAlpha=1;
   // hind legs first, separated from the body
   ctx.fillStyle=legCol;ctx.beginPath();ctx.ellipse(-13,29,8,18,.12,0,Math.PI*2);ctx.ellipse(13,29,8,18,-.12,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=pawCol;ctx.beginPath();ctx.ellipse(-14,43,9,6,.05,0,Math.PI*2);ctx.ellipse(14,43,9,6,-.05,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=r.color;ctx.beginPath();ctx.roundRect(-19,-3,38,39,16);ctx.fill();ctx.beginPath();ctx.arc(0,-23,25,0,Math.PI*2);ctx.fill();
   if(dog){ctx.beginPath();ctx.moveTo(-17,-39);ctx.lineTo(-28,-58);ctx.lineTo(-5,-44);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(17,-39);ctx.lineTo(28,-58);ctx.lineTo(5,-44);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(0,34,8,0,Math.PI*2);ctx.fill();if(akiyama){ctx.fillStyle='#171717';ctx.beginPath();ctx.moveTo(-17,-39);ctx.lineTo(-27,-56);ctx.lineTo(-7,-44);ctx.closePath();ctx.moveTo(17,-39);ctx.lineTo(27,-56);ctx.lineTo(7,-44);ctx.closePath();ctx.fill();ctx.beginPath();ctx.ellipse(0,8,15,13,0,0,Math.PI*2);ctx.fill();}}
   else{ctx.beginPath();ctx.arc(-24,-23,9,0,Math.PI*2);ctx.arc(24,-23,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle=r.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(20,25,20,-1.25,1.55);ctx.stroke();}
   ctx.restore();return;
 }
 if(side){
   ctx.globalAlpha=.72;angelWing(-11,-4,-1,.76,-.05);ctx.globalAlpha=1;
   // four-leg read in profile: rear pair is lower/back, fore pair toward the chest
   ctx.fillStyle=legCol;
   ctx.beginPath();ctx.ellipse(-13,26,7,18,.23,0,Math.PI*2);ctx.ellipse(11,26,7,17,-.12,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=pawCol;ctx.beginPath();ctx.ellipse(-17,41,10,6,.05,0,Math.PI*2);ctx.ellipse(14,40,10,6,-.05,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=r.color;ctx.beginPath();ctx.roundRect(-17,-2,35,38,15);ctx.fill();ctx.beginPath();ctx.ellipse(5,-22,25,23,0,0,Math.PI*2);ctx.fill();
   if(dog){ctx.beginPath();ctx.moveTo(2,-41);ctx.lineTo(6,-61);ctx.lineTo(18,-43);ctx.closePath();ctx.fill();if(akiyama){ctx.fillStyle='#171717';ctx.beginPath();ctx.moveTo(2,-41);ctx.lineTo(6,-60);ctx.lineTo(17,-43);ctx.closePath();ctx.fill();ctx.beginPath();ctx.ellipse(-9,7,10,18,.15,0,Math.PI*2);ctx.fill();ctx.fillStyle=r.color;}ctx.beginPath();ctx.ellipse(25,-18,15,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=akiyama?'#deddd6':'#f0d2aa';ctx.beginPath();ctx.ellipse(26,-15,10,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(35,-18,3.5,0,Math.PI*2);ctx.fill();}
   else{ctx.fillStyle='#e5b78d';ctx.beginPath();ctx.ellipse(18,-18,15,16,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(-19,-22,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle=r.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(21,23,19,-1.45,1.45);ctx.stroke();}
   angelWing(-11,-6,-1,.92,-.03);
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(16,-30,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1d1d1d';ctx.beginPath();ctx.arc(19,-30,3,0,Math.PI*2);ctx.fill();ctx.restore();return;
 }
 // Front/down view: visibly separated rear legs and dark paw tips.
 angelWing(-17,-4,-1,.9,-.03);angelWing(17,-4,1,.9,.03);
 ctx.fillStyle=legCol;ctx.beginPath();ctx.ellipse(-12,27,8,18,.15,0,Math.PI*2);ctx.ellipse(12,27,8,18,-.15,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=pawCol;ctx.beginPath();ctx.ellipse(-13,42,9,6,0,0,Math.PI*2);ctx.ellipse(13,42,9,6,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=r.color;ctx.beginPath();ctx.ellipse(0,5,20,29,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,-22,25,0,Math.PI*2);ctx.fill();
 if(dog){ctx.beginPath();ctx.moveTo(-18,-38);ctx.lineTo(-28,-58);ctx.lineTo(-5,-43);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(18,-38);ctx.lineTo(28,-58);ctx.lineTo(5,-43);ctx.closePath();ctx.fill();if(akiyama){ctx.fillStyle='#171717';ctx.beginPath();ctx.moveTo(-18,-38);ctx.lineTo(-27,-57);ctx.lineTo(-6,-43);ctx.closePath();ctx.moveTo(18,-38);ctx.lineTo(27,-57);ctx.lineTo(6,-43);ctx.closePath();ctx.fill();ctx.beginPath();ctx.ellipse(0,8,13,15,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle=akiyama?'#deddd6':'#f0d2aa';ctx.beginPath();ctx.ellipse(0,-14,15,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(0,-18,4,0,Math.PI*2);ctx.fill();}
 else{ctx.fillStyle='#e5b78d';ctx.beginPath();ctx.ellipse(0,-18,18,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(-24,-21,9,0,Math.PI*2);ctx.arc(24,-21,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle=r.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(24,22,18,-1.4,1.4);ctx.stroke();}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-8,-26,6,0,Math.PI*2);ctx.arc(8,-26,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1d1d1d';ctx.beginPath();ctx.arc(-7,-26,2.7,0,Math.PI*2);ctx.arc(7,-26,2.7,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawRacer(r){
 if(r.name==='Akiyama'&&r.dokkanTurbo>0){
   ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle='#f5f5f0';ctx.lineWidth=5;
   let a=r.face||0,side=Math.sin((r.dokkanPhase||0)*16)*18;
   for(let i=1;i<=3;i++){let back=42+i*30,ox=Math.cos(a+Math.PI/2)*side*(i/3),oy=Math.sin(a+Math.PI/2)*side*(i/3);ctx.beginPath();ctx.moveTo(r.x-Math.cos(a)*back+ox,r.y-Math.sin(a)*back+oy);ctx.lineTo(r.x-Math.cos(a)*(back+48)+ox,r.y-Math.sin(a)*(back+48)+oy);ctx.stroke();}
   ctx.restore();
 }
 drawDriftFlightFx(r);
 if(r.highJump>0){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ff5964';ctx.lineWidth=5;ctx.beginPath();ctx.arc(r.x,r.y,62,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(r.burningWing>0||r.highJump>0){
   ctx.save();let a=r.face||0,pulse=.5+.5*Math.sin(performance.now()/48);
   for(let i=1;i<=5;i++){let back=30+i*22,spread=26+i*4,alpha=(.34-i*.045)+pulse*.05;ctx.globalAlpha=Math.max(.06,alpha);ctx.strokeStyle=i<3?'#ff3348':'#b51225';ctx.lineWidth=Math.max(3,12-i*1.6);
     for(const side of [-1,1]){let bx=r.x-Math.cos(a)*back+Math.cos(a+Math.PI/2)*side*spread,by=r.y-Math.sin(a)*back+Math.sin(a+Math.PI/2)*side*spread;ctx.beginPath();ctx.moveTo(r.x-Math.cos(a)*18+Math.cos(a+Math.PI/2)*side*24,r.y-Math.sin(a)*18+Math.sin(a+Math.PI/2)*side*24);ctx.quadraticCurveTo(bx+Math.cos(a+Math.PI/2)*side*9,by,bx,by);ctx.stroke();}}
   ctx.restore();
 }
 if(r.airBarrier>0){ctx.save();ctx.globalAlpha=.38+.12*Math.sin(performance.now()/90);ctx.strokeStyle='#dffcff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(r.x,r.y-10,48,0,Math.PI*2);ctx.stroke();ctx.restore();}

  if(r.tongueBoostFx>0){
    ctx.save();
    ctx.globalAlpha=Math.min(1,r.tongueBoostFx*3);
    ctx.strokeStyle='#d8fff2';
    ctx.lineWidth=4;
    let a=r.face||0;
    for(let i=-1;i<=1;i++){
      let ox=Math.cos(a+Math.PI/2)*i*12,oy=Math.sin(a+Math.PI/2)*i*12;
      ctx.beginPath();
      ctx.moveTo(r.x- Math.cos(a)*20 + ox,r.y- Math.sin(a)*20 + oy);
      ctx.lineTo(r.x- Math.cos(a)*58 + ox,r.y- Math.sin(a)*58 + oy);
      ctx.stroke();
    }
    ctx.restore();
  }

 if(r.name==='Saru'&&r.treeGrab){
   const t=r.treeGrab.target;ctx.save();ctx.strokeStyle=r.color;ctx.lineWidth=10;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(r.x-7,r.y-3);ctx.lineTo(t.x,t.y);ctx.stroke();
   ctx.strokeStyle='#e5b78d';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r.x+7,r.y-1);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.restore();
 }
 if(r.name==='Ryosuke'&&r.ryosukeTongue){let t=r.ryosukeTongue,m=tongueMouthPoint(r);ctx.save();ctx.strokeStyle='#ef7fa3';ctx.globalAlpha=.9;ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.quadraticCurveTo((m.x+t.x)/2,(m.y+t.y)/2+28,t.x,t.y);ctx.stroke();ctx.restore();}
 if(r.tongue){
   let t=r.tongue.target,m=tongueMouthPoint(r);
   ctx.strokeStyle='#e86a91';ctx.lineWidth=9;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(m.x,m.y);
   ctx.quadraticCurveTo((m.x+t.x)/2,(m.y+t.y)/2+18,t.x,t.y);ctx.stroke();
   ctx.lineCap='butt';
 }
 const now=performance.now()/1000;
 // Jump reads as actual lift in this top-down view: body rises away from its shadow.
 let lift=0,lean=0,poseScale=1;
 if(r.highJump>0){let hp=1-r.highJump/Math.max(.001,r.highJumpTotal||1.05);lift=118*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.96-.10*Math.sin(Math.PI*hp);}else if(r.normalHighJump>0){let hp=1-r.normalHighJump/.72;lift=72*Math.sin(Math.PI*Math.max(0,Math.min(1,hp)));poseScale=.98-.05*Math.sin(Math.PI*hp);}else if(r.flight===1){let t=Math.min(1,r.jumpAge/.42);lift=30*Math.sin(t*Math.PI*.92)+10;poseScale=1+.08*Math.sin(t*Math.PI);}
 else if(r.flight===2){lift=35+5*Math.sin(now*12);poseScale=1+.035*Math.sin(now*12);}
 else if(r.flight===3){lift=30;lean=13;poseScale=.98;}
 if(r.landAge>0)poseScale=1-.08*Math.sin((r.landAge/.28)*Math.PI);
 // stable shadow remains on the course while the frog rises/leans forward
 ctx.save();ctx.globalAlpha=r.flight===0?.18:.11;ctx.fillStyle='#163e35';ctx.beginPath();ctx.ellipse(r.x,r.y+27,28+(r.flight?4:0),11,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();
 ctx.translate(r.x + Math.cos(r.face)*lean, r.y + Math.sin(r.face)*lean - lift);
 const courseCharScale=(courseTheme==='akina'||courseTheme==='usui'||courseTheme==='myogi'||courseTheme==='shomaru'||courseTheme==='akagi')?.58:1;
 ctx.scale(poseScale*courseCharScale,poseScale*courseCharScale);
 let a=norm(r.face),dir=Math.abs(a)<Math.PI/4?'right':Math.abs(a)>Math.PI*3/4?'left':a<0?'up':'down';
 // During the second jump, make the entire wing/body silhouette pulse with rapid flaps.
 if(r.flight===2){let flap=Math.sin(now*18);ctx.scale(1+.035*flap,1-.025*flap);}
 // Glide: slight forward pitch / streamlined squash.
 if(r.flight===3){ctx.transform(1,0,-Math.sin(r.face)*.045,1,0,0);}
 if(canDrift(r)&&r.drifting){let slip=norm(r.face-(r.driftMoveFace||r.face));ctx.rotate(Math.max(-.22,Math.min(.22,slip*.22)));ctx.scale(1.03,.96);}
 currentWingSpecial=(r.name==='Michael'||r.name==='Inu'||r.name==='Saru'||r.name==='Keisuke'||r.name==='Ryosuke');currentWingRed=r.name==='Kawazu';currentWingTakumi=(r.name==='Takumi'||r.name==='Bunta');currentWingTakumiBlue=!!r.takumiBlue||r.name==='Bunta';currentWingBurning=r.burningWing>0||r.highJump>0;currentWingFold=Math.min(1,(r.wingSnap||0)/.19);if(r.name==='Inu'||r.name==='Saru'||r.name==='Nakazato'||r.name==='Akiyama')drawAnimalRacer(r,dir);else if(dir==='down')frogFront(r);else if(dir==='up')frogBack(r);else frogSide(r,dir==='left');currentWingBurning=false;currentWingTakumi=false;currentWingTakumiBlue=false;currentWingFold=0;
if(r.name==='Beelzebub'){ctx.save();
 const neon='#a8ff00',neon2='#66ff33',dark='#09120f';
 if(dir==='down'){
   // Reference-inspired fluorescent accents: lime belly, lime eye disks and small leg bands.
   ctx.fillStyle=neon;ctx.beginPath();ctx.ellipse(0,14,13,18,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=neon2;ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(-14,-39,7,0,Math.PI*2);ctx.arc(14,-39,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=neon;ctx.beginPath();ctx.arc(-12,-39,3.8,0,Math.PI*2);ctx.arc(12,-39,3.8,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=neon2;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-15,34);ctx.lineTo(-7,38);ctx.stroke();ctx.beginPath();ctx.moveTo(15,34);ctx.lineTo(7,38);ctx.stroke();
 }else if(dir==='up'){
   ctx.strokeStyle=neon2;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-17,23);ctx.lineTo(-5,29);ctx.stroke();ctx.beginPath();ctx.moveTo(17,23);ctx.lineTo(5,29);ctx.stroke();
   ctx.fillStyle=neon;ctx.beginPath();ctx.roundRect(-9,-7,18,7,3);ctx.fill();
 }else{
   const d=dir==='left'?-1:1;ctx.scale(d,1);
   ctx.fillStyle=neon;ctx.beginPath();ctx.ellipse(8,14,10,18,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=neon2;ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(15,-39,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=neon;ctx.beginPath();ctx.arc(18,-39,3.8,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=neon2;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-7,35);ctx.lineTo(4,39);ctx.stroke();
 }
 ctx.restore();
}
if(r.name==='Takumi'||r.name==='Bunta'){ctx.save();
 const blue=!!r.takumiBlue||r.name==='Bunta',black=blue?'#173d86':'#151515',white=blue?'#2e67d1':'#f5f3eb';
 if(dir==='down'){
   ctx.fillStyle=black;ctx.beginPath();ctx.ellipse(0,-23,30,23,0,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=white;ctx.beginPath();ctx.roundRect(-28,-22,56,21,9);ctx.fill();
   ctx.fillStyle=black;ctx.beginPath();ctx.roundRect(-18,17,36,21,10);ctx.fill();ctx.beginPath();ctx.ellipse(-23,11,7,16,.35,0,Math.PI*2);ctx.ellipse(23,11,7,16,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(-11,30,9,13,.28,0,Math.PI*2);ctx.ellipse(11,30,9,13,-.28,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=black;ctx.beginPath();ctx.arc(-12,-39,4,0,Math.PI*2);ctx.arc(12,-39,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=black;ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(0,-17,10,.18,Math.PI-.18);ctx.stroke();
 }else if(dir==='up'){
   ctx.fillStyle=black;ctx.beginPath();ctx.ellipse(0,-22,31,25,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-14,-38,13,0,Math.PI*2);ctx.arc(14,-38,13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-18,12,36,26,12);ctx.fill();ctx.beginPath();ctx.ellipse(-23,10,7,16,.35,0,Math.PI*2);ctx.ellipse(23,10,7,16,-.35,0,Math.PI*2);ctx.fill();ctx.fillStyle=white;ctx.fillRect(-17,-9,34,7);
 }else{
   ctx.scale(dir==='left'?-1:1,1);
   ctx.fillStyle=black;ctx.beginPath();ctx.ellipse(4,-24,27,21,0,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(13,-38,13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-14,18,36,19,9);ctx.fill();ctx.beginPath();ctx.ellipse(-20,9,7,15,.28,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=white;ctx.beginPath();ctx.roundRect(-12,-12,35,22,9);ctx.fill();ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=black;ctx.beginPath();ctx.arc(18,-39,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=black;ctx.lineWidth=3;ctx.beginPath();ctx.arc(22,-17,7,.35,Math.PI-.5);ctx.stroke();
 }
 ctx.restore();}if(r.name==='Kawazu'){ctx.save();
 const eyeRed='#f2383d',eyeDark='#352b2b',belly='#f7f7f2',sideBlue='#1689d5',orange='#ff7a32';
 if(dir==='down'){
   // Corrected Kawazu palette: red eyes with dark pupils, white belly, blue side marks, orange hands/feet.
   ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(0,13,12,17,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeRed;ctx.beginPath();ctx.arc(-14,-39,10,0,Math.PI*2);ctx.arc(14,-39,10,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeDark;ctx.beginPath();ctx.arc(-12,-39,4,0,Math.PI*2);ctx.arc(12,-39,4,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=sideBlue;ctx.fillRect(-18,5,5,23);ctx.fillRect(13,5,5,23);
   // Keep every orange pad as an independent path. Consecutive arc() calls in one
   // path draw connector polygons between the circles, which caused the mystery
   // orange triangle/lines across Kawazu's body.
   ctx.fillStyle=orange;
   for(const [px,py,pr] of [[-23,12,7],[23,12,7],[-12,40,7],[12,40,7]]){ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();}
 }else if(dir==='up'){
   // Back view: only the foot soles should show orange.
   ctx.fillStyle=orange;
   ctx.beginPath();ctx.ellipse(-11,40,9,5,.18,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(11,40,9,5,-.18,0,Math.PI*2);ctx.fill();
 }else if(dir==='left'||dir==='right'){
   const d=dir==='left'?-1:1;ctx.scale(d,1);
   ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(8,13,10,17,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeRed;ctx.beginPath();ctx.arc(15,-39,10,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=eyeDark;ctx.beginPath();ctx.arc(18,-39,4,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=sideBlue;ctx.beginPath();ctx.roundRect(-17,5,7,24,3);ctx.fill();
   ctx.fillStyle=orange;
   ctx.beginPath();ctx.arc(-20,12,7,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(-8,40,9,5,-.15,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(12,40,9,5,.15,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();}
 // Wing-flap speed lines on stage 2 and on successful maintenance taps.
 if(r.flight===2 || r.wing>0){ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#ffffff';ctx.lineWidth=4;for(const side of [-1,1]){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*(35+i*5),-12+i*8);ctx.lineTo(side*(52+i*7),-17+i*8);ctx.stroke()}}ctx.restore();}
 // Glide warning is only needed while an extension can still be stocked.
 // Once stocked (or already consumed), the yellow flashing ring stays off.
 if(r.flight===3 && !r.glideExtendStock && !r.glideExtendUsed && r.glideClock>=3.55){let urgency=Math.min(1,(r.glideClock-3.55)/2.05),blink=Math.sin(now*(7+urgency*13))>.05; if(blink){ctx.save();ctx.globalAlpha=.35+.35*urgency;ctx.strokeStyle=urgency>.72?'#ffca4a':'#fff29a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-5,48+5*urgency,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 ctx.restore();
 // readable text stays fixed instead of bobbing with the character
 ctx.fillStyle='#17352d';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(CHARACTER_DATA[r.name]?.jp||r.name,r.x,r.y-68-lift*.45);
}
function drawEffect(e){if(e.kind==='poisonMist'){ctx.save();ctx.globalAlpha=.18+.25*(e.t/e.max);ctx.fillStyle='#9b4bd1';for(let i=0;i<8;i++){let a=i*.9+(e.age||0)*.35,rr=20+(i%3)*17;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,24+(i%2)*12,0,Math.PI*2);ctx.fill();}ctx.restore();}else if(e.kind==='poison'){ctx.fillStyle='#9e49d6';ctx.strokeStyle='#d6a4ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,18,0,Math.PI*2);ctx.fill();ctx.stroke();}else if(e.kind==='airball'){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#e9ffff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,16,0,Math.PI*2);ctx.stroke();ctx.restore();}else if(e.kind==='bewitch'){ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=.75;ctx.fillStyle='#f04478';for(let i=0;i<4;i++){let a=(e.age||0)*5+i*Math.PI/2;ctx.beginPath();ctx.arc(Math.cos(a)*12,Math.sin(a)*12,8,0,Math.PI*2);ctx.fill();}ctx.restore();}else if(e.kind==='rock'){let h=Math.sin(Math.min(1,(e.age||0)/1.1)*Math.PI)*38;ctx.save();ctx.translate(e.x,e.y-h);ctx.rotate((e.age||0)*7);ctx.fillStyle='#8a765e';ctx.strokeStyle='#493f34';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-11);ctx.lineTo(-5,-23);ctx.lineTo(18,-14);ctx.lineTo(22,8);ctx.lineTo(4,20);ctx.lineTo(-18,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}else if(e.kind==='bubble'){ctx.fillStyle='#bcecffaa';ctx.strokeStyle='#4eaeeb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,17,0,Math.PI*2);ctx.fill();ctx.stroke()}else{let len=e.kind==='laser'?640:(e.kind==='waterBoost'?175:120);ctx.strokeStyle=e.kind==='laser'?'#baf5ff':'#7bd7ff';ctx.lineWidth=e.kind==='laser'?7:(e.kind==='waterBoost'?20:15);ctx.globalAlpha=Math.max(.15,e.t/e.max);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.a)*len,e.y+Math.sin(e.a)*len);ctx.stroke();ctx.globalAlpha=1}}
function drawMini(){
 const ox=18,oy=58,mw=185,mh=118,pad=9;
 ctx.fillStyle='#102820c9';ctx.fillRect(ox,oy,mw,mh);
 // Fit the ACTUAL path bounds with one common scale. The old mini-map used separate X/Y
 // scales from the whole world size, which stretched Akina and made its shape look different.
 let xs=path.map(p=>p.x),ys=path.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 for(const br of courseBranches)for(const p of br){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
 let bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),scale=Math.min((mw-pad*2)/bw,(mh-pad*2)/bh);
 let drawW=bw*scale,drawH=bh*scale,baseX=ox+(mw-drawW)/2-minX*scale,baseY=oy+(mh-drawH)/2-minY*scale;
 const mx=x=>baseX+x*scale,my=y=>baseY+y*scale;
 const route=(pts,closed)=>{ctx.beginPath();ctx.moveTo(mx(pts[0].x),my(pts[0].y));for(let i=1;i<pts.length;i++)ctx.lineTo(mx(pts[i].x),my(pts[i].y));if(closed)ctx.closePath();ctx.stroke();};
 const miniRoad=Math.max(5,courseHalfWidth*2*scale);
 ctx.strokeStyle=courseTheme==='akina'?'#27633b':'#2f713c';ctx.lineWidth=miniRoad+3;route(path,!activeCourse.pointToPoint);for(const br of courseBranches)route(br,false);
 ctx.strokeStyle=courseTheme==='akina'?'#9a9da0':'#78d1df';ctx.lineWidth=miniRoad;route(path,!activeCourse.pointToPoint);for(const br of courseBranches)route(br,false);
 ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=1.5;route(path,!activeCourse.pointToPoint);for(const br of courseBranches)route(br,false);
 if(activeCourse.pointToPoint){
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx(path[0].x),my(path[0].y),4.5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ffd45a';ctx.beginPath();ctx.arc(mx(path[path.length-1].x),my(path[path.length-1].y),4.5,0,Math.PI*2);ctx.fill();
 }
 for(const r of racers){ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(mx(r.x),my(r.y),4,0,Math.PI*2);ctx.fill()}
}

function upcomingCurveGuide(r){
  const n=path.length;if(n<4)return {text:'↑',cls:'straight'};
  let near=nearestTrackSegment(r.x,r.y),start=near.i;
  const closed=!activeCourse.pointToPoint;
  const segAt=i=>{
    let ii=(i+n)%n,a=path[ii],b=path[(ii+1)%n],dx=b.x-a.x,dy=b.y-a.y;
    return {a,b,len:Math.hypot(dx,dy)||1,ang:Math.atan2(dy,dx)};
  };
  const horizon=Math.max(900,Math.min(1900,950+r.speed*1.1));
  let samples=[],dist=0,i=start,guard=0,prev=segAt(i);
  while(dist<horizon&&guard<n-2){
    let ni=closed?(i+1)%n:i+1;if(!closed&&ni>=n-1)break;
    let cur=segAt(ni),delta=norm(cur.ang-prev.ang);
    samples.push({d:dist,delta,ang:cur.ang,i:ni});
    dist+=cur.len;i=ni;prev=cur;guard++;
  }
  const minDelta=6*Math.PI/180;
  let groups=[],g=null;
  for(const q of samples){
    if(Math.abs(q.delta)<minDelta){
      if(g&&q.d-g.lastD>260){groups.push(g);g=null;}
      continue;
    }
    if(!g||q.d-g.lastD>300){
      if(g)groups.push(g);
      g={startD:q.d,lastD:q.d,total:q.delta,count:1,endAng:q.ang};
    }else{
      g.total+=q.delta;g.lastD=q.d;g.count++;g.endAng=q.ang;
    }
  }
  if(g)groups.push(g);
  groups=groups.filter(x=>Math.abs(x.total)>10*Math.PI/180);
  if(!groups.length)return {text:'↑',cls:'straight'};

  const first=groups[0],deg=Math.abs(first.total)*180/Math.PI;
  let cls=deg<=45?'mild':deg<=90?'medium':deg<145?'hard':'hairpin';

  // The arrow is intentionally screen/world-relative, not "driver left/right".
  // Canvas/world Y grows downward, so these sectors map directly to what the player sees.
  const arrowFor=ang=>{
    const step=Math.round(norm(ang)/(Math.PI/4));
    return ({'-4':'←','-3':'↖','-2':'↑','-1':'↗','0':'→','1':'↘','2':'↓','3':'↙','4':'←'})[String(step)]||'→';
  };
  const firstArrow=arrowFor(first.endAng);
  let second=groups.find((x,k)=>k>0&&x.startD-first.lastD<650);
  if(second)return {text:`${firstArrow} ${arrowFor(second.endAng)}`,cls:'sequence'};
  return {text:firstArrow,cls};
}
function updateHud(r){let cg=upcomingCurveGuide(r);if(ui.curve){ui.curve.textContent=cg.text;ui.curve.className='curveGuide '+cg.cls;}ui.lap.textContent=activeCourse.pointToPoint?'POINT TO POINT':('LAP '+Math.min(r.lap,RACE_LAPS)+'/'+RACE_LAPS);ui.who.textContent='操作：'+(CHARACTER_DATA[r.name]?.jp||r.name);ui.speed.textContent=Math.round(r.speed*.56*(courseTheme==='akina'?1.12:1))+' km/h';let al='パンチ',bl='泡弾';if(r.name==='Takumi'||r.name==='Bunta'){al='溝落とし';bl=r.drifting?'ドリフト '+Math.round(Math.min(1,(r.driftCharge||0)/1.35)*100)+'%':'ドリフト飛行'}else if(r.name==='Gabriel'){al='水ブースト';bl='水レーザー'}else if(r.name==='Raphael'){al='エアバリア';bl='エアブースト '+(r.airBoostUses||0)+'/3'}else if(r.name==='Uriel'){al='タックル';bl='ロックフォール'}else if(r.name==='Lucifer'){al='叩き落とし';bl=r.charging?'チャージ '+Math.round(Math.min(1,r.charge/1.8)*100)+'%':'チャージブースト'}else if(r.name==='Lilith'){al='キック';bl='惑いの瘴気'}else if(r.name==='Beelzebub'){al='毒液';bl='ポイズンブースト'}else if(r.name==='Kawazu'){let aid=r.customSkillA||'airSwim',bid=r.customSkillB||'wallKick';al=skillLabel(aid)+' ∞';bl=skillLabel(bid)+' ∞'}else if(r.name==='Michael'){let aid='burningWing';al=skillLabel(aid)+' '+r.burnWingUses+'/3';bl=r.drifting?'ドリフト '+Math.round(Math.min(1,(r.driftCharge||0)/1.35)*100)+'%':'ドリフト飛行'}ui.a.innerHTML='A<small>'+al+'</small>';ui.b.innerHTML='B<small>'+bl+'</small>';let phase=['地上','ジャンプ','羽ばたき','滑空'][r.flight];if(r.flight===3){let remain=Math.max(0,5.65-r.glideClock);if(r.glideExtendStock)phase+=' 延長STOCK '+remain.toFixed(1)+'s';else if(r.glideExtendUsed)phase+=' 延長中 '+remain.toFixed(1)+'s';else phase+=(r.glideClock>=3.55?' ⚠ '+remain.toFixed(1)+'s':' '+r.glideClock.toFixed(1)+'s');}ui.jump.innerHTML='ジャンプ<small>'+phase+'</small>'}
function msg(t){ui.status.textContent=t;clearTimeout(msg.timer);msg.timer=setTimeout(()=>ui.status.textContent='ジャンプ3回＋舌ターンで最速を狙え！',2200)}
function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;if(appState==='race'){
 if(raceStartDelay>0){raceStartDelay=Math.max(0,raceStartDelay-dt);draw();}
 else{
   if(globalTimeStop>0)globalTimeStop=Math.max(0,globalTimeStop-dt);
   if(globalTimeLag>0)globalTimeLag=Math.max(0,globalTimeLag-dt);
   for(const r of racers){let rd=(globalTimeLag>0&&r!==racers[controlledIndex])?dt*.5:dt;updateRacer(r,rd);}
   updateEffects(dt);draw();
 }
}else if(appState==='shooting'){updateShooting(dt);drawShooting();
}else{ctx.clearRect(0,0,W,H);}requestAnimationFrame(loop)}
function norm(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}function approach(a,b,d){return a<b?Math.min(b,a+d):Math.max(b,a-d)}function lerpAngle(a,b,t){return a+norm(b-a)*t}
// input
addEventListener('keydown',e=>{keys[e.key]=true;if(e.code==='Space'){e.preventDefault();if(appState==='shooting')shootingFire();else pressJump(racers[controlledIndex])}if(e.key==='e'){if(appState==='shooting')shootingTongue();else startTongue(racers[controlledIndex]);}if(e.key==='j'){if(appState==='shooting')shootingFire();else useA(racers[controlledIndex]);}if(e.key==='k'){if(appState==='shooting')shootingFire();else{let r=racers[controlledIndex];if(r.name==='Lucifer')startChargeBoost(r);else useB(r);}}});addEventListener('keyup',e=>{keys[e.key]=false;if(e.key==='e')endTongue(racers[controlledIndex]);if(e.key==='k'){let r=racers[controlledIndex];if(r.name==='Lucifer')releaseChargeBoost(r);if(canDrift(r))releaseTakumiDrift(r)}});
function bindPress(el,down,up){el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);down()});el.addEventListener('pointerup',e=>{e.preventDefault();up?.()});el.addEventListener('pointercancel',()=>up?.())}
bindPress(ui.jump,()=>appState==='shooting'?shootingFire():pressJump(racers[controlledIndex]));bindPress(ui.tongue,()=>appState==='shooting'?shootingTongue():startTongue(racers[controlledIndex]),()=>{if(appState!=='shooting')endTongue(racers[controlledIndex])});bindPress(ui.a,()=>appState==='shooting'?shootingFire():useA(racers[controlledIndex]));bindPress(ui.b,()=>{if(appState==='shooting')shootingFire();else{let r=racers[controlledIndex];if(r.name==='Lucifer')startChargeBoost(r);else useB(r)}},()=>{if(appState!=='shooting'){let r=racers[controlledIndex];if(r.name==='Lucifer')releaseChargeBoost(r);if(canDrift(r))releaseTakumiDrift(r)}});
ui.stick.addEventListener('pointerdown',e=>{joy.id=e.pointerId;ui.stick.setPointerCapture(e.pointerId);setJoy(e)});ui.stick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)setJoy(e)});ui.stick.addEventListener('pointerup',e=>{if(e.pointerId===joy.id){joy={id:null,x:0,y:0};moveKnob()}});ui.stick.addEventListener('pointercancel',()=>{joy={id:null,x:0,y:0};moveKnob()});
function setJoy(e){let r=ui.stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,m=Math.hypot(dx,dy),rad=r.width*.36;if(m>rad){dx*=rad/m;dy*=rad/m}joy.x=dx/rad;joy.y=dy/rad;moveKnob(dx,dy)}function moveKnob(dx=0,dy=0){let i=ui.stick.querySelector('i');i.style.transform=`translate(${dx}px,${dy}px)`}
requestAnimationFrame(loop);

window.addEventListener('load',setupMetaUi);
