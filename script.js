(() => {
  "use strict";
  const config = window.DRAGON_GIFT_CONFIG;
  const screens = [...document.querySelectorAll(".screen")];
  const order = ["intro", "map", "game1", "game2", "game3", "final"];
  const defaults = { version: 3, screen: "intro", completed: [], soundOn: true };
  let state = loadState();
  let audioCtx;
  let musicTimer;
  let musicStep = 0;
  let heartTimer;
  let hearts = 0;
  let heartCombo = 0;
  let lastHeartHit = 0;
  let heartWave = 0;
  let cakeCount = 0;
  let selectedDecor = "candle";
  let attempts = 0;
  let winningGift = Math.floor(Math.random() * 6);
  const familyGifts = ["Тепло", "Верность", "Забота", "Смех", "Общие воспоминания"];
  const foundGift = familyGifts[Math.floor(Math.random() * familyGifts.length)];
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

  function ensureAudio() {
    if (!state.soundOn) return null;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch {
      return null;
    }
  }

  function tone(f = 440, d = .08, type = "sine", v = .035, delay = 0) {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(v, start + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + d);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + d + .03);
    } catch {}
  }

  function sparkle(notes, spacing = .085, volume = .025) {
    notes.forEach((frequency, index) => tone(frequency, .18, "triangle", volume, index * spacing));
  }

  function playAmbientStep() {
    if (!state.soundOn || document.hidden) return;
    const melody = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1046, 880, 784, 659, 587];
    const note = melody[musicStep % melody.length];
    tone(note, 1.35, "sine", .009);
    if (musicStep % 4 === 0) tone(note / 2, 1.8, "sine", .004);
    musicStep++;
  }

  function startMusic() {
    if (!state.soundOn || musicTimer) return;
    if (!ensureAudio()) return;
    playAmbientStep();
    musicTimer = setInterval(playAmbientStep, 920);
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
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
    startMusic();
  }

  function complete(id, next, delay = 850) {
    if (!state.completed.includes(id)) state.completed.push(id);
    saveState();
    transitionLocked = true;
    setTimeout(() => {
      transitionLocked = false;
      show(next, { force: true });
      if (next === "game1") startHearts();
      if (next === "final") celebrate();
    }, delay);
  }

  function setSoundButton() {
    const button = document.getElementById("sound");
    button.textContent = state.soundOn ? "🔊" : "🔇";
    button.setAttribute("aria-label", state.soundOn ? "Выключить музыку и звуки" : "Включить музыку и звуки");
    button.title = state.soundOn ? "Выключить звук" : "Включить звук";
    button.setAttribute("aria-pressed", String(state.soundOn));
  }

  document.getElementById("sound").addEventListener("click", event => {
    state.soundOn = !state.soundOn;
    saveState();
    setSoundButton();
    if (state.soundOn) {
      sparkle([523, 659, 784], .07, .022);
      startMusic();
    } else {
      stopMusic();
    }
    event.currentTarget.blur();
  });

  document.addEventListener("pointerdown", () => startMusic(), { once: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMusic();
    else startMusic();
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
    heartCombo = 0;
    lastHeartHit = 0;
    heartWave = 0;
    const field = document.getElementById("heartField");
    field.innerHTML = "";
    document.getElementById("heartCount").textContent = "0 / 27";
    document.querySelector("#game1 .progress i").style.width = "0%";
    setHeartMessage("Соберите 27 сердечек!");
    clearInterval(heartTimer);
    spawnHeart();
    heartTimer = setInterval(spawnHeart, 580);
  }

  function setHeartMessage(message, mood = "") {
    const bubble = document.querySelector("#game1 .bubble");
    const spark = document.querySelector("#game1 .heart-spark");
    bubble.textContent = message;
    spark?.classList.remove("spark-cheer", "spark-amazed");
    if (mood) {
      void spark?.offsetWidth;
      spark?.classList.add(mood);
    }
  }

  function spawnHeart() {
    if (hearts >= 27 || state.screen !== "game1") return;
    const field = document.getElementById("heartField");
    const heart = document.createElement("button");
    const paths = ["heart-rise", "heart-zigzag", "heart-sway", "heart-arc"];
    const path = paths[heartWave++ % paths.length];
    const progress = hearts / 27;
    const lifetime = Math.max(2.8, 4.9 - progress * 1.5 + Math.random() * .7);
    heart.className = "flying-heart " + path;
    heart.setAttribute("aria-label", "Сердечко");
    heart.textContent = ["❤️", "💖", "💗", "💕"][Math.floor(Math.random() * 4)];
    heart.style.setProperty("--heart-x", 5 + Math.random() * 76 + "%");
    const drift = (Math.random() > .5 ? 1 : -1) * (28 + Math.random() * 42);
    heart.style.setProperty("--heart-drift", drift + "px");
    heart.style.setProperty("--heart-drift-back", drift * -.7 + "px");
    heart.style.setProperty("--heart-drift-soft", drift * -.35 + "px");
    heart.style.animationDuration = lifetime + "s";
    heart.addEventListener("click", () => {
      if (heart.dataset.hit || transitionLocked) return;
      heart.dataset.hit = "1";
      const now = performance.now();
      heartCombo = now - lastHeartHit <= 1150 ? heartCombo + 1 : 1;
      lastHeartHit = now;
      hearts++;
      tone(560 + Math.min(hearts, 10) * 35, .12, "triangle", .028);
      heart.textContent = "✨";
      heart.className = "flying-heart heart-hit";
      document.getElementById("heartCount").textContent = hearts + " / 27";
      document.querySelector("#game1 .progress i").style.width = hearts / 27 * 48 + "%";
      if (heartCombo >= 8) {
        setHeartMessage("Невероятная серия ×" + heartCombo + "! Спарк в восторге!", "spark-amazed");
      } else if (heartCombo >= 5) {
        setHeartMessage("Волшебная серия ×" + heartCombo + "!", "spark-cheer");
      } else if (heartCombo >= 3) {
        setHeartMessage("Серия ×" + heartCombo + " — так держать!", "spark-cheer");
      } else if (hearts === 9 || hearts === 18) {
        setHeartMessage(hearts === 9 ? "Треть пути пройдена!" : "Осталась последняя треть!", "spark-cheer");
      }
      navigator.vibrate?.(heartCombo >= 3 ? 28 : 14);
      setTimeout(() => heart.remove(), 260);
      if (hearts === 27) {
        clearInterval(heartTimer);
        setHeartMessage("Все 27 сердечек собраны! ❤️", "spark-amazed");
        sparkle([659, 784, 988, 1175], .08, .03);
        complete("game1", "game2", 1100);
      }
    });
    field.appendChild(heart);
    setTimeout(() => {
      if (!heart.dataset.hit) {
        heartCombo = 0;
        heart.remove();
      }
    }, lifetime * 1000 + 120);
  }

  const decorButtons = [...document.querySelectorAll("[data-decor]")];
  const cake = document.getElementById("cake");
  const cakeDecor = document.getElementById("cakeDecor");
  const lightCandles = document.getElementById("lightCandles");

  decorButtons.forEach(button => button.addEventListener("click", () => {
    selectedDecor = button.dataset.decor;
    decorButtons.forEach(item => item.classList.toggle("selected", item === button));
    document.getElementById("cakeInstruction").textContent = "Теперь нажмите на нужное место торта.";
    tone(430, .06, "triangle");
  }));

  cake.addEventListener("pointerdown", event => {
    if (transitionLocked || state.screen !== "game2" || event.target.closest(".placed")) return;
    const rect = cake.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tiers = [
      { top: 38, bottom: 100, half: 60 },
      { top: 92, bottom: 166, half: 90 },
      { top: 154, bottom: 238, half: 117 }
    ];
    const scaleX = rect.width / 250;
    const scaleY = rect.height / 250;
    const logicalX = x / scaleX;
    const logicalY = y / scaleY;
    const onCake = tiers.some(tier => logicalY >= tier.top && logicalY <= tier.bottom && Math.abs(logicalX - 125) <= tier.half);
    if (!onCake) {
      cake.classList.remove("cake-nope");
      void cake.offsetWidth;
      cake.classList.add("cake-nope");
      document.getElementById("cakeInstruction").textContent = "Украшение нужно поставить прямо на торт 🙂";
      tone(180, .08, "square", .018);
      return;
    }
    cakeCount++;
    const decor = document.createElement("span");
    decor.className = "placed" + (selectedDecor === "candle" ? " candle" : "");
    decor.textContent = selectedDecor === "candle" ? "" : selectedDecor;
    if (selectedDecor === "candle") decor.setAttribute("aria-label", "Потушенная свеча");
    decor.style.left = x / rect.width * 100 + "%";
    decor.style.top = y / rect.height * 100 + "%";
    cakeDecor.appendChild(decor);
    tone(500 + Math.min(cakeCount, 8) * 55, .13, "triangle", .026);
    document.getElementById("cakeCount").textContent = cakeCount + " / минимум 4";
    document.querySelector("#game2 .progress i").style.width = Math.min(82, 50 + cakeCount * 7) + "%";
    document.getElementById("cakeInstruction").textContent = cakeCount < 4 ? "Отлично! Добавьте ещё " + (4 - cakeCount) + "." : "Красиво! Можно добавить ещё или зажечь свечи.";
    if (cakeCount >= 4) lightCandles.hidden = false;
  });

  lightCandles.addEventListener("click", () => {
    if (cakeCount < 4 || transitionLocked || state.screen !== "game2") return;
    cake.classList.add("candles-lit");
    lightCandles.disabled = true;
    lightCandles.textContent = "Свечи зажжены! ✨";
    document.getElementById("cakeInstruction").textContent = "Спарк в восторге от вашего торта!";
    sparkle([523, 659, 784, 1046], .09, .034);
    navigator.vibrate?.(45);
    complete("game2", "game3");
  });

  document.querySelectorAll(".gift").forEach(gift => gift.addEventListener("click", () => {
    if (gift.dataset.used || transitionLocked || state.screen !== "game3") return;
    gift.dataset.used = "1";
    attempts++;
    const number = Number(gift.dataset.gift);
    if (number === winningGift) {
      gift.classList.add("open");
      gift.textContent = "💝";
      sparkle([587, 740, 880, 1175], .1, .04);
      document.getElementById("giftHint").textContent = "Найден дар «" + foundGift + "»!";
      document.getElementById("giftMagic").innerHTML = "<b>«" + foundGift + "»</b><span>летит к Дереву семьи ✨</span>";
      document.querySelector(".magic-tree").classList.add("magic-awakened");
      document.querySelector("#game3 .progress i").style.width = "100%";
      complete("game3", "final", 2200);
    } else {
      const distance = Math.abs(number - winningGift);
      const direction = number < winningGift ? "правее" : "левее";
      const warmth = distance === 1 ? "Совсем близко!" : distance === 2 ? "Магия уже теплее." : "Пока холодно.";
      gift.classList.add("shake", "opened-empty");
      gift.textContent = ["🧸", "🌸", "🍬"][(attempts - 1) % 3];
      tone(190, .12, "square", .02);
      document.getElementById("giftHint").textContent = warmth + " Ищите " + direction + " ✨";
      document.querySelector("#game3 .progress i").style.width = Math.min(90, 68 + attempts * 5) + "%";
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
    sparkle([523, 659, 784, 1046, 1319], .13, .035);
  }

  document.getElementById("hug").addEventListener("click", event => {
    event.currentTarget.textContent = "Спарк обнимает вас! ❤️";
    document.querySelector(".final-spark").classList.add("hugging");
    navigator.vibrate?.([40, 40, 80]);
    sparkle([784, 988, 1175], .1, .03);
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
