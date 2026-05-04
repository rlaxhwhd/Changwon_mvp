import { useEffect, useRef, useState } from 'react';
import type { PageId } from '../types';

interface RoadmapLandingProps {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string) => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  blink: number;
}

interface Meteor {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
}

const NAVIGATE_AFTER_MS = 1180;

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  scale = 1,
  opacity = 1,
) {
  const imageRatio = img.width / img.height;
  const canvasRatio = width / height;

  let drawWidth = width * scale;
  let drawHeight = height * scale;

  if (imageRatio > canvasRatio) {
    drawHeight = height * scale;
    drawWidth = drawHeight * imageRatio;
  } else {
    drawWidth = width * scale;
    drawHeight = drawWidth / imageRatio;
  }

  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
  ctx.restore();
}

export default function RoadmapLanding({ onNavigate }: RoadmapLandingProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImgReady(true);
    };
    img.src = '/roadmap.png';
  }, []);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const stars: Star[] = [];
    const meteors: Meteor[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.6 + Math.random() * 1.8,
        opacity: 0.28 + Math.random() * 0.52,
        blink: (Math.random() - 0.5) * 0.015,
      });
    }

    const meteorTimer = window.setInterval(() => {
      if (meteors.length < 2) {
        meteors.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.45,
          len: 40 + Math.random() * 60,
          speed: 4 + Math.random() * 5,
          opacity: 1,
        });
      }
    }, 2600);

    let raf = 0;
    let frame = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        if (frame % 3 === 0) {
          star.opacity += star.blink;
          if (star.opacity < 0.18 || star.opacity > 0.92) star.blink *= -1;
        }

        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.x += meteor.speed;
        meteor.y += meteor.speed * 0.72;
        meteor.opacity -= 0.02;

        if (meteor.opacity <= 0) {
          meteors.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(170,210,255,${meteor.opacity * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(meteor.x - meteor.len, meteor.y - meteor.len * 0.7);
        ctx.stroke();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      window.clearInterval(meteorTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const startBurst = () => {
    if (bursting) return;

    const canvas = burstCanvasRef.current;
    const stage = stageRef.current;
    const img = imageRef.current;
    if (!canvas || !stage || !img) return;

    const rect = stage.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const stars = Array.from({ length: 48 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 40 + Math.random() * 180,
      speed: 10 + Math.random() * 18,
      width: 0.8 + Math.random() * 1.4,
      length: 70 + Math.random() * 150,
      alpha: 0.24 + Math.random() * 0.44,
    }));

    setBursting(true);
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / NAVIGATE_AFTER_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const centerX = width / 2;
      const centerY = height * 0.58;

      ctx.clearRect(0, 0, width, height);

      drawCoverImage(ctx, img, width, height, 1 + eased * 1.35, 1 - eased * 0.92);

      ctx.fillStyle = `rgba(3, 8, 20, ${0.15 + eased * 0.72})`;
      ctx.fillRect(0, 0, width, height);

      for (const star of stars) {
        const distance = star.distance + eased * eased * star.speed * 42;
        const startX = centerX + Math.cos(star.angle) * Math.max(0, distance - star.length * (0.18 + eased * 0.9));
        const startY = centerY + Math.sin(star.angle) * Math.max(0, distance - star.length * (0.18 + eased * 0.9));
        const endX = centerX + Math.cos(star.angle) * distance;
        const endY = centerY + Math.sin(star.angle) * distance;
        ctx.strokeStyle = `rgba(180,220,255,${star.alpha * (0.65 + eased * 0.35)})`;
        ctx.lineWidth = star.width * (0.9 + eased * 1.2);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(110,180,255,${0.08 + eased * 0.12})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(width, height) * (0.18 + eased * 0.2), 0, Math.PI * 2);
      ctx.fill();

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    window.setTimeout(() => setFadingOut(true), NAVIGATE_AFTER_MS - 180);
    window.setTimeout(() => {
      cancelAnimationFrame(raf);
      onNavigate('ai-roadmap');
    }, NAVIGATE_AFTER_MS);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 55% 45% at 22% 26%, rgba(48,118,210,0.28), transparent 65%),' +
          'radial-gradient(ellipse 50% 42% at 78% 24%, rgba(70,156,230,0.22), transparent 65%),' +
          'radial-gradient(ellipse 70% 55% at 50% 72%, rgba(36,96,200,0.24), transparent 70%),' +
          'radial-gradient(ellipse 110% 95% at 50% 50%, #06122c 0%, #040b1f 38%, #020613 70%, #010309 100%)',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.22s ease-out',
      }}
    >
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          zIndex: 30,
          background: 'linear-gradient(180deg, rgba(3,8,22,0.82), rgba(3,8,22,0.1))',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            fontFamily: 'Orbitron, Pretendard, sans-serif',
            fontSize: 17,
            letterSpacing: 3,
            fontWeight: 700,
            color: '#eef6ff',
          }}
        >
          ROADMAP START
        </div>

        <button
          type="button"
          onClick={() => onNavigate('home')}
          disabled={bursting}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: '#eef6ff',
            padding: '10px 16px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.8,
            cursor: bursting ? 'default' : 'pointer',
            boxShadow: '0 10px 24px rgba(2,8,24,0.24)',
          }}
        >
          돌아가기
        </button>
      </header>

      <main
        ref={stageRef}
        style={{
          position: 'absolute',
          inset: 0,
          paddingTop: 72,
          zIndex: 5,
        }}
      >
        {imgReady && (
          <img
            src="/roadmap.png"
            alt="AI 진로 로드맵 시작 화면"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              opacity: bursting ? 0 : 1,
              transition: 'opacity 0.35s ease',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: 108,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(660px, calc(100vw - 48px))',
            textAlign: 'center',
            color: '#eef6ff',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: 'rgba(222,237,255,0.7)',
              marginBottom: 12,
            }}
          >
            Dream Catch Career Route
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(30px, 4vw, 52px)',
              lineHeight: 1.08,
              fontWeight: 800,
              textShadow: '0 8px 28px rgba(0,0,0,0.34)',
            }}
          >
            우주처럼 넓은 가능성 위에
            <br />
            나만의 AI 진로 로드맵을 시작하세요
          </h1>
        </div>

        {!bursting && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '10.4%',
                transform: 'translateX(-50%)',
                width: 'min(410px, 54vw)',
                height: 'min(410px, 54vw)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 50% 52%, rgba(165,226,255,0.24), rgba(84,154,255,0.16) 34%, rgba(84,154,255,0.06) 56%, transparent 76%)',
                boxShadow: '0 0 72px rgba(102,179,255,0.22)',
                pointerEvents: 'none',
                zIndex: 8,
                animation: 'roadmapPlanetPulse 2.4s ease-in-out infinite',
              }}
            />

            <button
              type="button"
              onClick={startBurst}
              aria-label="로드맵 시작하기"
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '13.8%',
                transform: 'translateX(-50%)',
                width: 'min(330px, 44vw)',
                height: 'min(330px, 44vw)',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                zIndex: 12,
                padding: 0,
              }}
            />
          </>
        )}
      </main>

      <canvas
        ref={burstCanvasRef}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 40,
          display: bursting ? 'block' : 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: 'rgba(232,241,255,0.72)',
          fontSize: 12,
          letterSpacing: 2,
          zIndex: 20,
          fontFamily: 'Orbitron, Pretendard, sans-serif',
        }}
      >
        {bursting ? 'WARP DRIVE ENGAGED' : 'CLICK THE PLANET TO BEGIN'}
      </div>

      <style>{`
        @keyframes roadmapPlanetPulse {
          0%, 100% { opacity: 0.58; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.045); }
        }
      `}</style>
    </div>
  );
}
