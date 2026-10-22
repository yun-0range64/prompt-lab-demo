/* Prompt Lab p5.js Intro — 2048 × 682 */

const W = 2048;
const H = 682;

const EXPERIMENT_URL = './experiment.html';

const START = {
  bubble: 0.35,
  liquid: 4.05,
  duration: 1.45
};

const BUBBLE = {
  moveDuration: 1.56,
  bounceDuration: 1.2,
  tailDuration: 0.24,
  eyeDuration: 0.18,
  eyeGap: 0.12
};

const PURPLE = [125, 58, 255];

const liquidBox = {
  x: 1785,
  y: 339,
  w: 163,
  h: 112
};

let layers = {};
let liquidLayer;
let maskCanvas;
let bubbles = [];
let started = 0;

let bubbleShape = null;

// ---------------------------------
// 이미지 로딩
// ---------------------------------

function preload() {
  const names = [
    'letters',
    'bubble-o',
    'beaker-outline',
    'beaker-drops',
    'liquid-mask'
  ];

  for (const name of names) {
    layers[name] = loadImage(
      'images/' + name + '.png'
    );
  }
}

// ---------------------------------
// 초기 설정
// ---------------------------------

function setup() {
  const cnv = createCanvas(W, H);
  cnv.parent('sketch-holder');

  pixelDensity(1);

  liquidLayer = createGraphics(W, H);
  liquidLayer.pixelDensity(1);

  // 마스크는 최초 한 번만 생성
  prepareLiquidMask();

  // 기존 말풍선 이미지에서 위치 추출
  detectBubbleShape();

  started = millis();

  for (let i = 0; i < 12; i++) {
    bubbles.push(newBubble(true));
  }
}

// ---------------------------------
// 공통 함수
// ---------------------------------

function easeOutCubic(x) {
  x = constrain(x, 0, 1);
  return 1 - pow(1 - x, 3);
}

function bounceArc(p, height) {
  return -4 * height * p * (1 - p);
}

function newBubble(randomStart = false) {
  return {
    x: random(
      liquidBox.x + 15,
      liquidBox.x + liquidBox.w - 15
    ),
    y: randomStart
      ? random(liquidBox.y, liquidBox.y + liquidBox.h)
      : liquidBox.y + liquidBox.h + random(0, 20),
    r: random(4, 12),
    speed: random(18, 45),
    phase: random(TWO_PI)
  };
}

// ---------------------------------
// 말풍선 위치 자동 감지
// ---------------------------------

function detectBubbleShape() {
  const img = layers['bubble-o'];

  img.loadPixels();

  let minX = W;
  let minY = H;
  let maxX = 0;
  let maxY = 0;

  // 보라색 픽셀로 말풍선 영역 탐색
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = 4 * (y * W + x);

      const r = img.pixels[i];
      const g = img.pixels[i + 1];
      const b = img.pixels[i + 2];
      const a = img.pixels[i + 3];

      if (
        a > 100 &&
        r > 45 &&
        b > r * 1.2 &&
        b > g * 1.2
      ) {
        minX = min(minX, x);
        maxX = max(maxX, x);
        minY = min(minY, y);
        maxY = max(maxY, y);
      }
    }
  }

  if (minX >= maxX) {
    console.warn('말풍선 위치를 감지하지 못했습니다.');
    return;
  }

  // 꼬리 때문에 아래로 늘어난 부분은 제외drawBeaker(
  const totalHeight = maxY - minY;
  const bodyDiameter = min(
    maxX - minX,
    totalHeight * 0.88
  );

  const radius = bodyDiameter / 2;

  bubbleShape = {
    cx: (minX + maxX) / 2,
    cy: minY + radius,
    radius
  };
}

// ---------------------------------
// 액체 마스크 생성
// ---------------------------------

function prepareLiquidMask() {
  maskCanvas = document.createElement('canvas');

  maskCanvas.width = W;
  maskCanvas.height = H;

  const ctx = maskCanvas.getContext('2d');

  const img = layers['liquid-mask'];

  ctx.drawImage(
    img.canvas || img.elt,
    0, 0, W, H
  );

  const data = ctx.getImageData(0, 0, W, H);

  for (let i = 0; i < data.data.length; i += 4) {
    // 검정 → 투명, 흰색 → 불투명
    data.data[i + 3] = data.data[i];
  }

  ctx.putImageData(data, 0, 0);
}

// ---------------------------------
// 메인 애니메이션
// ---------------------------------

function draw() {
  clear();

  const t = (millis() - started) / 1000;

  // 원본 글자
  image(layers.letters, 0, 0, W, H);

  drawChatBubble(t);
  drawBeaker(t);
}

// ---------------------------------
// 말풍선 이동 + 수직 바운스
// ---------------------------------

function drawChatBubble(t) {
  if (t < START.bubble || !bubbleShape) return;

  const elapsed = t - START.bubble;

  const moveEnd = BUBBLE.moveDuration;
  const bounceEnd =
    moveEnd + BUBBLE.bounceDuration;

  let dx = 0;
  let dy = 0;

  // 1. 왼쪽에서 3번 점프하며 이동
  if (elapsed < moveEnd) {
    const move = elapsed / moveEnd;

    dx = -850 * (1 - move);

    const jumps = [
      { start: 0, end: 0.38, height: 190 },
      { start: 0.38, end: 0.70, height: 105 },
      { start: 0.70, end: 1.00, height: 40 }
    ];

    for (const jump of jumps) {
      if (move <= jump.end) {
        const p =
          (move - jump.start) /
          (jump.end - jump.start);

        dy = bounceArc(p, jump.height);
        break;
      }
    }
  }

  // 2. 제자리에서 3번 수직 바운스
  else if (elapsed < bounceEnd) {
    const bounce =
      (elapsed - moveEnd) /
      BUBBLE.bounceDuration;

    if (bounce < 0.45) {
      dy = bounceArc(
        bounce / 0.45,
        55
      );
    } else if (bounce < 0.78) {
      dy = bounceArc(
        (bounce - 0.45) / 0.33,
        20
      );
    } else {
      dy = bounceArc(
        (bounce - 0.78) / 0.22,
        7
      );
    }
  }

  push();
  translate(dx, dy);

  // 3. 보라색 원
  drawBubbleCircle();

  // 4. 착지 후 꼬리와 흰 점 등장
  if (elapsed >= bounceEnd) {
    const after = elapsed - bounceEnd;

    drawBubbleTail(after);
    drawBubbleEyes(after);
  }

  pop();
}

// ---------------------------------
// 말풍선: 원형 몸통
// ---------------------------------

function drawBubbleCircle() {
  const s = bubbleShape;

  noStroke();
  fill(...PURPLE);

  circle(
    s.cx,
    s.cy,
    s.radius * 2
  );
}

// ---------------------------------
// 말풍선: 꼬리 뿅!
// ---------------------------------

function drawBubbleTail(after) {
  const s = bubbleShape;

  const p = easeOutCubic(after / BUBBLE.tailDuration);
  if (p <= 0) return;

  push();

  // 몸통 왼쪽 아래에 자연스럽게 연결
  const x = s.cx - s.radius * 0.58;
  const y = s.cy + s.radius * 0.58;

  translate(x, y);
  scale(p);

  noStroke();
  fill(...PURPLE);

  beginShape();

  // 몸통 안쪽에서 시작
  vertex(s.radius * 0.12, -s.radius * 0.20);

  // 왼쪽으로 부드럽게 내려오는 곡선
  bezierVertex(
    -s.radius * 0.02, s.radius * 0.02,
    -s.radius * 0.08, s.radius * 0.25,
    -s.radius * 0.18, s.radius * 0.36
  );

  // 짧고 둥글게 말린 꼬리 끝
  bezierVertex(
    -s.radius * 0.28, s.radius * 0.48,
    -s.radius * 0.18, s.radius * 0.55,
    -s.radius * 0.04, s.radius * 0.49
  );

  // 아래쪽을 넓고 볼록하게 연결
  bezierVertex(
    s.radius * 0.18, s.radius * 0.42,
    s.radius * 0.48, s.radius * 0.30,
    s.radius * 0.52, -s.radius * 0.12
  );

  endShape(CLOSE);

  pop();
}

// ---------------------------------
// 말풍선: 흰 점 뽁! 뽁!
// ---------------------------------

function drawBubbleEyes(after) {
  const s = bubbleShape;

  const firstStart = BUBBLE.tailDuration;
  const secondStart =
    firstStart + BUBBLE.eyeGap;

  const eyeY = s.cy + s.radius * 0.04;
  const eyeSize = s.radius * 0.31;

  // 첫 번째 흰 점
  drawPoppingEye(
    s.cx - s.radius * 0.32,
    eyeY,
    eyeSize,
    after - firstStart
  );

  // 두 번째 흰 점
  drawPoppingEye(
    s.cx + s.radius * 0.32,
    eyeY,
    eyeSize,
    after - secondStart
  );
}

function drawPoppingEye(x, y, size, elapsed) {
  if (elapsed < 0) return;

  const p = constrain(
    elapsed / BUBBLE.eyeDuration,
    0, 1
  );

  // 살짝 커졌다가 원래 크기로 착지
  const scaleValue =
    p < 0.65
      ? 1.18 * easeOutCubic(p / 0.65)
      : 1.18 - 0.18 *
        easeOutCubic((p - 0.65) / 0.35);

  push();
  translate(x, y);
  scale(scaleValue);

  noStroke();
  fill(255);

  circle(0, 0, size);

  pop();
}

// ---------------------------------
// 비커 액체
// ---------------------------------

function drawBeaker(t) {
  const fillAmount = easeOutCubic(
    (t - START.liquid) / START.duration
  );

  if (fillAmount > 0) {
    liquidLayer.clear();

    const b = liquidBox;

    // 아래에서 위로 차오름
    const level =
      b.y + b.h * (1 - fillAmount) + 22;

    // 완전히 찬 후 물결 시작
    const waveProgress = easeOutCubic(
      (fillAmount - 0.99) / 0.01
    );

    const amp = 3 * waveProgress;

    const waveTime = max(
      0,
      t - START.liquid - START.duration
    );

    liquidLayer.noStroke();
    liquidLayer.fill(...PURPLE);

    liquidLayer.beginShape();

    liquidLayer.vertex(
      b.x - 15,
      b.y + b.h + 20
    );

    for (
      let x = b.x - 15;
      x <= b.x + b.w + 15;
      x += 2
    ) {
      const wave =
        sin(
          (x - b.x) * 0.08 +
          waveTime * 3.5
        ) * amp +
        sin(
          (x - b.x) * 0.16 -
          waveTime * 2.2
        ) * amp * 0.2;

      liquidLayer.vertex(
        x,
        level + wave
      );
    }

    liquidLayer.vertex(
      b.x + b.w + 15,
      b.y + b.h + 20
    );

    liquidLayer.endShape(CLOSE);

    // 비커 내부 기포
    liquidLayer.fill(255, 255, 255, 200);

    for (let i = 0; i < bubbles.length; i++) {
      const q = bubbles[i];

      q.y -= q.speed * deltaTime / 1000;

      if (q.y < b.y - 15) {
        bubbles[i] = newBubble();
      }

      if (q.y > level + 9) {
        liquidLayer.circle(
          q.x + sin(t * 2 + q.phase) * 3,
          q.y,
          q.r * 2
        );
      }
    }

    // 마스크 적용
    const ctx = liquidLayer.drawingContext;

    ctx.save();

    ctx.globalCompositeOperation = 'destination-in';

    ctx.drawImage(
      maskCanvas,
      0, 0
    );

    ctx.restore();

    image(liquidLayer, 0, 0, W, H);
  }

  // 검은 비커 테두리는 항상 위에
  image(
    layers['beaker-outline'],
    0, 0, W, H
  );

  // 기존 비커 위 보라색 물방울
// 작은 기포 → 큰 기포 → 사라짐 → 반복
if (t > START.liquid + START.duration) {
  drawBeakerDrops(t);
}
  
}

// ---------------------------------
// 클릭하면 실험 페이지 이동
// ---------------------------------

function drawBeakerDrops(t) {
  const elapsed = t - START.liquid - START.duration;
  const cycle = elapsed % 2.4;

  // 작은 기포: 오른쪽 15px 이동, 크기 증가
  drawDrop(1915, 215, 11, cycle, 0);

  // 큰 기포: 오른쪽 15px 이동, 크기 증가
  drawDrop(1946, 171, 20, cycle, 0.45);
}

function drawDrop(x, y, radius, cycle, delay) {
  const local = cycle - delay;

  // 등장 전에는 보이지 않음
  if (local < 0) return;

  let size = 1;

  // 각각 순서대로 등장
  if (local < 0.25) {
    size = easeOutCubic(local / 0.25);
  }

  // 두 기포가 동시에 사라짐
  if (cycle >= 1.5) {
    size = 1 - easeOutCubic((cycle - 1.5) / 0.35);
  }

  // 사라진 뒤 잠시 대기
  if (cycle >= 1.85) return;

  push();
  translate(x, y);
  scale(size);

  noStroke();
  fill(...PURPLE);
  circle(0, 0, radius * 2);

  pop();
}
function mousePressed() {
  window.location.href = EXPERIMENT_URL;
}

function touchStarted() {
  window.location.href = EXPERIMENT_URL;
  return false;
}