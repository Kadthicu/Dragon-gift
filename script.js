(() => {
  "use strict";
  const config = window.DRAGON_GIFT_CONFIG;
  const screens = [...document.querySelectorAll(".screen")];
  const order = ["intro", "map", "game1", "game2", "game3", "final"];
  const defaults = { version: 3, screen: "intro", completed: [], soundOn: true };
  let state = loadState();
  let audioCtx;
  let heartTimer;
  let hearts = 0;
  let cakeCount = 0;
  let attempts = 0;
  let winningGift = Math.floor(Math.random() * 6);
  let transitionLocked = false;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(config.storageKey));
      if (!saved || saved.version !== 3 || !order.includes(saved.screen)) return { ...defaults };
      return { ...defaults, ...saved, completed: Array.isArray(saved.completed) ? saved.completed : [] };
    } catch {
      return { ...defaults };
    }
  }

  function saveState() {
    try { localStorage.setItem(config.storageKey, JSON.stringify(state)); } catch {}
  }

  function tone(f = 440, d = .08, type = "sine", v = .035) {
    if (!state.soundOn) return;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = f;
      gain.gain.setValueAtTime(v, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + d);
      oscillator.connect(gain).connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + d);
    } catch {}
  }

  function allowed(id) {
    const target = order.indexOf(id);
    const current = order.indexOf(state.screen);
    return target <= current + 1 || state.completed.includes(id) || id === "intro";
  }

  function show(id, { force = false } = {}) {
    if (!order.includes(id) || (!force && !allowed(id)) || transitionLocked) return;
    clearInterval(heartTimer);
    screens.forEach(screen => screen.classList.toggle("active", screen.id === id));
    state.screen = id;
    saveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
    tone(520, .07);
  }

  function complete(id, next) {
    if (!state.completed.includes(id)) state.completed.push(id);
    saveState();
    transitionLocked = true;
    setTimeout(() => {
      transitionLocked = false;
      show(next, { force: true });
      if (next === "game1") startHearts();
      if (next === "final") celebrate();
    }, 850);
  }

  function setSoundButton() {
    document.getElementById("sound").textContent = state.soundOn ? "🔊" : "🔇";
  }

  document.getElementById("sound").addEventListener("click", event => {
    state.soundOn = !state.soundOn;
    saveState();
    setSoundButton();
    if (state.soundOn) tone(660, .1);
    event.currentTarget.blur();
  });

  document.getElementById("resetProgress").addEventListener("click", () => {
    if (!confirm("Начать приключение сначала? Текущий прогресс будет сброшен.")) return;
    try { localStorage.removeItem(config.storageKey); } catch {}
    location.reload();
  });

  document.querySelectorAll("[data-next]").forEach(button => {
    button.addEventListener("click", () => show(button.dataset.next));
  });
  document.querySelectorAll("[data-start-game]").forEach(button => {
    button.addEventListener("click", () => {
      show(button.dataset.startGame);
      startHearts();
    });
  });

  function startHearts() {
    hearts = 0;
    const field = document.getElementById("heartField");
    field.innerHTML = "";
    document.getElementById("heartCount").textContent = "0 / 8";
    document.querySelector("#game1 .progress i").style.width = "0%";
    clearInterval(heartTimer);
    spawnHeart();
    heartTimer = setInterval(spawnHeart, 620);
  }

  function spawnHeart() {
    if (hearts >= 8 || state.screen !== "game1") return;
    const field = document.getElementById("heartField");
    const heart = document.createElement("button");
    heart.className = "flying-heart";
    heart.setAttribute("aria-label", "Сердечко");
    heart.textContent = ["❤️", "💖", "💗", "💕"][Math.floor(Math.random() * 4)];
    heart.style.left = 4 + Math.random() * 78 + "%";
    heart.style.animationDuration = 3.8 + Math.random() * 1.7 + "s";
    heart.addEventListener("click", () => {
      if (heart.dataset.hit || transitionLocked) return;
      heart.dataset.hit = "1";
      hearts++;
      tone(560 + hearts * 45, .1, "triangle");
      heart.textContent = "✨";
      heart.style.animation = "pop .3s ease";
      document.getElementById("heartCount").textContent = hearts + " / 8";
      document.querySelector("#game1 .progress i").style.width = hearts / 8 * 48 + "%";
      setTimeout(() => heart.remove(), 260);
      if (hearts === 8) {
        clearInterval(heartTimer);
        tone(880, .25);
        complete("game1", "game2");
      }
    });
    field.appendChild(heart);
    setTimeout(() => heart.remove(), 6000);
  }

  document.querySelectorAll("[data-decor]").forEach(button => button.addEventListener("click", () => {
    if (cakeCount >= 4 || transitionLocked || state.screen !== "game2") return;
    cakeCount++;
    tone(480 + cakeCount * 80, .11, "triangle");
    const decor = document.createElement("span");
    decor.className = "placed";
    decor.textContent = button.dataset.decor;
    decor.style.left = 48 + Math.random() * 145 + "px";
    decor.style.top = 25 + Math.random() * 140 + "px";
    document.getElementById("cakeDecor").appendChild(decor);
    document.getElementById("cakeCount").textContent = cakeCount + " / 4";
    document.querySelector("#game2 .progress i").style.width = 50 + cakeCount * 8 + "%";
    if (cakeCount === 4) {
      tone(900, .3);
      complete("game2", "game3");
    }
  }));

  document.querySelectorAll(".gift").forEach(gift => gift.addEventListener("click", () => {
    if (gift.dataset.used || transitionLocked || state.screen !== "game3") return;
    gift.dataset.used = "1";
    attempts++;
    const number = Number(gift.dataset.gift);
    if (number === winningGift || attempts >= 3) {
      gift.classList.add("open");
      gift.textContent = "✨";
      tone(940, .35, "triangle", .05);
      document.getElementById("giftHint").textContent = "Вы нашли праздничное чудо!";
      document.querySelector("#game3 .progress i").style.width = "100%";
      complete("game3", "final");
    } else {
      gift.classList.add("shake");
      gift.textContent = ["🧸", "🌸", "🍬"][Math.floor(Math.random() * 3)];
      tone(190, .12, "square", .02);
      document.getElementById("giftHint").textContent = "Милый подарок! Но чудо в другой коробке";
      setTimeout(() => gift.classList.remove("shake"), 500);
    }
  }));

  function celebrate() {
    const box = document.getElementById("confetti");
    box.innerHTML = "";
    const items = ["🌸", "✨", "💖", "⭐", "🎊"];
    for (let i = 0; i < 55; i++) {
      const piece = document.createElement("span");
      piece.className = "piece";
      piece.textContent = items[Math.floor(Math.random() * items.length)];
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.animationDelay = Math.random() * 1.6 + "s";
      piece.style.animationDuration = 2.5 + Math.random() * 2 + "s";
      box.appendChild(piece);
    }
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .22, "triangle", .03), i * 130));
  }

  document.getElementById("hug").addEventListener("click", event => {
    event.currentTarget.textContent = "Спарк обнимает вас! ❤️";
    document.querySelector(".final-dragon").classList.add("hugging");
    navigator.vibrate?.([40, 40, 80]);
    celebrate();
  });

  document.getElementById("restart").addEventListener("click", () => {
    try { localStorage.removeItem(config.storageKey); } catch {}
    location.reload();
  });

  setSoundButton();
  show(state.screen, { force: true });
  if (state.screen === "game1") startHearts();
  if (state.screen === "final") celebrate();
})();
