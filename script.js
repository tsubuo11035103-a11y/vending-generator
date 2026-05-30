const canvas = document.getElementById('result-canvas');
const ctx = canvas.getContext('2d');

const machineNameInput = document.getElementById('machine-name');
const screenImageInput = document.getElementById('screen-image');
const btnGenerate = document.getElementById('btn-generate');
const btnDownload = document.getElementById('btn-download');
const notePasswordInput = document.getElementById('note-password');
const btnUnlock = document.getElementById('btn-unlock');
const licenseMessage = document.getElementById('license-message');
const countGenText = document.getElementById('count-generate');
const countDlText = document.getElementById('count-download');
const premiumBadge = document.getElementById('premium-badge');

// ===== 有料版状態 =====
let premiumUnlocked = localStorage.getItem('vending_premium_unlocked') === 'true';
function isPremium() { return premiumUnlocked; }

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
const today = getTodayString();
if (localStorage.getItem('vending_date') !== today) {
  localStorage.setItem('vending_date', today);
  localStorage.setItem('vending_gen_count', '0');
  localStorage.setItem('vending_dl_count', '0');
}
let genCount = parseInt(localStorage.getItem('vending_gen_count') || '0');
let dlCount = parseInt(localStorage.getItem('vending_dl_count') || '0');

function setLicenseMessage(message, type = '') {
  licenseMessage.textContent = message;
  licenseMessage.className = `license-message ${type}`.trim();
}

async function verifyLicense() {
  const licenseKey = notePasswordInput.value.trim();
  if (!licenseKey) {
    setLicenseMessage('note記事にある合言葉を入力してください。', 'error');
    return;
  }
  btnUnlock.disabled = true;
  setLicenseMessage('確認中...', '');
  try {
    const res = await fetch('/api/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });
    const data = await res.json();
    if (!res.ok || !data.valid) {
      premiumUnlocked = false;
      localStorage.removeItem('vending_premium_unlocked');
      setLicenseMessage('合言葉が違うようです。note記事の内容をもう一度ご確認ください。', 'error');
      updateUIState();
      return;
    }
    premiumUnlocked = true;
    localStorage.setItem('vending_premium_unlocked', 'true');
    notePasswordInput.value = '';
    setLicenseMessage('有料版を解放しました。', 'success');
    updateUIState();
  } catch (error) {
    setLicenseMessage('通信エラーです。少し時間をおいて再試行してください。', 'error');
  } finally {
    btnUnlock.disabled = false;
  }
}

function updateUIState() {
  const premium = isPremium();
  countGenText.textContent = premium ? '∞' : Math.max(0, 20 - genCount);
  countDlText.textContent = premium ? '∞' : Math.max(0, 3 - dlCount);
  premiumBadge.style.display = premium ? 'block' : 'none';

  document.querySelectorAll('.premium-locked').forEach(el => {
    el.style.opacity = premium ? '1' : '0.45';
    el.style.cursor = premium ? 'pointer' : 'not-allowed';
  });
  document.querySelectorAll('.premium-locked input').forEach(input => {
    input.disabled = !premium;
  });
  screenImageInput.disabled = !premium;
  document.querySelector('.premium-section').style.opacity = premium ? '1' : '0.55';
}

// ===== 画像設定 =====
const PATHS = {
  vending: {
    red: 'assets/vending/red.png',
    white: 'assets/vending/white.png',
    blue: 'assets/vending/blue.png'
  },
  defaultScreen: 'assets/screen/IMG_0687.jpeg'
};

function pad3(n) { return String(n).padStart(3, '0'); }
function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(`assets/drinks/${pad3(i)}.png`);
  return arr;
}

const DRINKS = {
  freeBottles: range(1, 10),
  freeCans: range(101, 124),
  premiumBottles: range(201, 205),
  premiumCans: range(301, 304),
  secrets: range(901, 911)
};

let loadedScreenImage = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像を読み込めません: ${src}`));
    img.src = src;
  });
}

function readUploadImage(file) {
  return new Promise(resolve => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

screenImageInput.addEventListener('change', async e => {
  loadedScreenImage = await readUploadImage(e.target.files[0]);
});

function selectedColor() {
  return document.querySelector('input[name="vending-color"]:checked').value;
}

function drawImageCover(img, x, y, w, h, radius = 0) {
  ctx.save();
  if (radius > 0) {
    roundRectPath(x, y, w, h, radius);
    ctx.clip();
  }
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFitText(text, x, y, w, h) {
  if (!text) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 5;
  let fontSize = 42;
  while (fontSize > 18) {
    ctx.font = `bold ${fontSize}px sans-serif`;
    if (ctx.measureText(text).width <= w * 0.88) break;
    fontSize -= 2;
  }
  ctx.strokeText(text, x + w / 2, y + h / 2);
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

function chooseGroupedItems(pool, count) {
  const result = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  let i = 0;
  while (result.length < count) {
    const item = shuffled[i % shuffled.length];
    const groupSize = Math.min(count - result.length, 1 + Math.floor(Math.random() * 3));
    for (let j = 0; j < groupSize; j++) result.push(item);
    i++;
  }
  return result;
}

function chooseSecret() {
  return DRINKS.secrets[Math.floor(Math.random() * DRINKS.secrets.length)];
}

async function generateVendingMachine() {
  const premium = isPremium();
  if (!premium && genCount >= 20) {
    alert('本日の無料生成回数（20回）に達しました！\n\nnote記事の合言葉を入力すると\n青自販機・液晶画像・追加ドリンク・透かしなしが使えるようになります✨');
    return;
  }

  const color = selectedColor();
  if (color === 'blue' && !premium) {
    alert('青い自販機は有料版限定です！\n\nnote記事の合言葉を入力すると\n青自販機・液晶画像・追加ドリンク・透かしなしが使えるようになります✨');
    return;
  }

  btnGenerate.disabled = true;
  btnGenerate.textContent = '生成中...';

  try {
    const vendingImg = await loadImage(PATHS.vending[color]);
    const defaultScreenImg = await loadImage(PATHS.defaultScreen);
    const screenImg = premium && loadedScreenImage ? loadedScreenImage : defaultScreenImg;

    const topPool = premium ? [...DRINKS.freeBottles, ...DRINKS.premiumBottles] : DRINKS.freeBottles;
    const middlePool = premium ? [...DRINKS.freeBottles, ...DRINKS.freeCans, ...DRINKS.premiumBottles, ...DRINKS.premiumCans] : [...DRINKS.freeBottles, ...DRINKS.freeCans];
    const bottomPool = premium ? [...DRINKS.freeCans, ...DRINKS.premiumCans] : DRINKS.freeCans;

    const layout = [
      ...chooseGroupedItems(topPool, 7),
      ...chooseGroupedItems(middlePool, 7),
      ...chooseGroupedItems(bottomPool, 7)
    ];

    const hasSecret = Math.random() < 0.05;
    let secretIndex = -1;
    if (hasSecret) {
      secretIndex = Math.floor(Math.random() * layout.length);
      layout[secretIndex] = chooseSecret();
    }

    const drinkImages = await Promise.all(layout.map(src => loadImage(src)));

    canvas.width = 1200;
    canvas.height = 1800;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#f7f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 自販機本体
    ctx.drawImage(vendingImg, 0, 0, 1200, 1800);

    // 液晶エリア。必要ならここを実画像に合わせて微調整。
    const screen = { x: 100, y: 1070, w: 800, h: 380 };
    drawImageCover(screenImg, screen.x, screen.y, screen.w, screen.h, 32);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(screen.x, screen.y, screen.w, screen.h, 32);
    ctx.fill();
    ctx.restore();

    const title = machineNameInput.value.trim();
    drawFitText(title, screen.x + 10, screen.y + 10, screen.w - 20, screen.h - 20);

    // 商品配置エリア。実画像に合わせて調整しやすいようにまとめる。
    const startX = 238;
    const rowYs = [352, 643, 930];
    const cellW = 108;
    const drawW = 82;
    const drawH = 170;

    drinkImages.forEach((img, i) => {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const x = startX + col * cellW + (cellW - drawW) / 2;
      const y = rowYs[row] - drawH;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();
    });

    if (hasSecret) {
      ctx.save();
      ctx.font = 'bold 46px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 6;
      const text = '👑 SECRET';
      ctx.strokeText(text, 930, 1425);
      ctx.fillText(text, 930, 1425);
      ctx.restore();
    }

    if (!premium) {
      ctx.save();
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,80,80,0.35)';
      ctx.fillText('@tsubuo', 600, 1540);
      ctx.restore();
    }

    if (!premium) {
      genCount++;
      localStorage.setItem('vending_gen_count', genCount.toString());
      updateUIState();
    }

    btnDownload.disabled = false;
  } catch (error) {
    console.error(error);
    alert('画像の読み込みに失敗しました。assetsフォルダの画像名を確認してください。');
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.textContent = '🥤 自販機を生成する';
  }
}

btnGenerate.addEventListener('click', generateVendingMachine);
btnDownload.addEventListener('click', () => {
  const premium = isPremium();
  if (!premium && dlCount >= 3) {
    alert('本日の無料保存回数（3回）に達しました！\n\nnote記事の合言葉を入力すると\n生成・保存が無制限になります✨');
    return;
  }
  const link = document.createElement('a');
  link.download = 'vending-machine.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  if (!premium) {
    dlCount++;
    localStorage.setItem('vending_dl_count', dlCount.toString());
    updateUIState();
  }
});

btnUnlock.addEventListener('click', verifyLicense);
updateUIState();
