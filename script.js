const screens=[...document.querySelectorAll('.screen')];
function show(id){screens.forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo(0,0)}
document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{show(b.dataset.next);if(b.dataset.next==='game1')startHearts()}));

let hearts=0, heartTimer;
function startHearts(){hearts=0;document.getElementById('heartCount').textContent='0 / 8';const field=document.getElementById('heartField');field.innerHTML='';clearInterval(heartTimer);spawnHeart();heartTimer=setInterval(spawnHeart,650)}
function spawnHeart(){if(hearts>=8)return;const field=document.getElementById('heartField');const h=document.createElement('button');h.className='flying-heart';h.textContent=['❤️','💖','💗','💕'][Math.floor(Math.random()*4)];h.style.left=Math.random()*82+'%';h.style.animationDuration=(3.8+Math.random()*1.8)+'s';h.addEventListener('click',()=>{if(h.dataset.hit)return;h.dataset.hit='1';hearts++;h.textContent='✨';h.style.animation='pop .3s ease';document.getElementById('heartCount').textContent=`${hearts} / 8`;setTimeout(()=>h.remove(),250);if(hearts===8){clearInterval(heartTimer);setTimeout(()=>show('game2'),850)}});field.appendChild(h);setTimeout(()=>h.remove(),6000)}

let cakeCount=0;
document.querySelectorAll('[data-decor]').forEach(btn=>btn.addEventListener('click',()=>{if(cakeCount>=4)return;cakeCount++;const d=document.createElement('span');d.className='placed';d.textContent=btn.dataset.decor;d.style.left=(56+Math.random()*135)+'px';d.style.top=(32+Math.random()*135)+'px';document.getElementById('cakeDecor').appendChild(d);document.getElementById('cakeCount').textContent=`${cakeCount} / 4`;if(cakeCount===4)setTimeout(()=>show('game3'),900)}));

const winningGift=Math.floor(Math.random()*6);let attempts=0;
document.querySelectorAll('.gift').forEach(g=>g.addEventListener('click',()=>{if(g.classList.contains('open'))return;attempts++;const n=Number(g.dataset.gift);if(n===winningGift||attempts>=3){g.classList.add('open');g.textContent='✨';document.getElementById('giftHint').textContent='Вы нашли праздничное чудо!';setTimeout(()=>{show('final');celebrate()},1000)}else{g.classList.add('shake');g.textContent='🧸';document.getElementById('giftHint').textContent='Милый подарок, но чудо спрятано в другой коробке';setTimeout(()=>g.classList.remove('shake'),500)}}));

function celebrate(){const box=document.getElementById('confetti');box.innerHTML='';const items=['🌸','✨','💖','⭐','🎊'];for(let i=0;i<45;i++){const p=document.createElement('span');p.className='piece';p.textContent=items[Math.floor(Math.random()*items.length)];p.style.left=Math.random()*100+'vw';p.style.animationDelay=Math.random()*1.8+'s';p.style.animationDuration=(2.5+Math.random()*2)+'s';box.appendChild(p)}}
document.getElementById('hug').addEventListener('click',e=>{e.currentTarget.textContent='Спарк обнимает вас! ❤️';document.querySelector('.final-dragon').classList.add('hugging');celebrate()});
document.getElementById('restart').addEventListener('click',()=>location.reload());
