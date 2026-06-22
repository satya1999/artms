import { useState, useEffect } from "react";

/**
 * Premium splash screen that shows for ~2.5 seconds on app load.
 * Dark gradient background with gold ARTMS branding, decorative
 * red/gold curves, animated loading dots, and a smooth fade-out.
 */
export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // enter → hold (logo animations settle)
    const t1 = setTimeout(() => setPhase("hold"), 400);
    // hold → exit (begin fade out)
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    // unmount after exit animation
    const t3 = setTimeout(() => onFinish(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className={`splash-root ${phase}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse 80% 70% at 50% 35%, #2a0a08 0%, #111 40%, #0a0a0a 100%)",
        overflow: "hidden",
        transition: "opacity 0.6s ease-out",
        opacity: phase === "exit" ? 0 : 1,
      }}
    >
      {/* ── Decorative red/gold curves ── */}
      <svg
        viewBox="0 0 400 800"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sp-curve1" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b1010" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#8b1a1a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F2B705" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="sp-curve2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2B705" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#8b1a1a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3a0808" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="sp-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2B705" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#F2B705" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* bottom-left wave */}
        <path
          d="M0,800 Q80,600 0,500 Q-30,450 60,380 Q140,320 90,260 L0,280 L0,800 Z"
          fill="url(#sp-curve1)"
          className="splash-wave splash-wave-1"
        />
        {/* bottom-right wave */}
        <path
          d="M400,800 Q320,650 400,550 Q430,500 350,430 Q280,370 330,300 L400,320 L400,800 Z"
          fill="url(#sp-curve2)"
          className="splash-wave splash-wave-2"
        />
        {/* gold line accent left */}
        <path
          d="M0,800 Q80,600 0,500 Q-30,450 60,380"
          fill="none"
          stroke="#F2B705"
          strokeWidth="0.8"
          strokeOpacity="0.5"
          className="splash-wave splash-wave-1"
        />
        {/* gold line accent right */}
        <path
          d="M400,800 Q320,650 400,550 Q430,500 350,430"
          fill="none"
          stroke="#F2B705"
          strokeWidth="0.8"
          strokeOpacity="0.5"
          className="splash-wave splash-wave-2"
        />
        {/* top glow */}
        <ellipse cx="200" cy="200" rx="220" ry="160" fill="url(#sp-glow)" />
      </svg>

      {/* ── Center content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Gold circle + A logo */}
        <div className="splash-logo" style={{ position: "relative", width: 160, height: 160 }}>
          {/* outer gold ring */}
          <svg viewBox="0 0 160 160" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="sp-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F2B705" />
                <stop offset="50%" stopColor="#d4a000" />
                <stop offset="100%" stopColor="#F2B705" />
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="72" fill="none" stroke="url(#sp-ring)" strokeWidth="2" />
          </svg>
          {/* sparkle/lens flare */}
          <div className="splash-sparkle" style={{
            position: "absolute",
            top: 12,
            right: 16,
            width: 24,
            height: 24,
          }}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <line x1="12" y1="0" x2="12" y2="24" stroke="#F2B705" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
              <line x1="0" y1="12" x2="24" y2="12" stroke="#F2B705" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="#F2B705" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
              <line x1="21" y1="3" x2="3" y2="21" stroke="#F2B705" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          {/* "A" letter */}
          <svg viewBox="0 0 160 160" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="sp-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F2B705" />
                <stop offset="60%" stopColor="#d49b00" />
                <stop offset="100%" stopColor="#a67c00" />
              </linearGradient>
            </defs>
            <text
              x="80"
              y="105"
              textAnchor="middle"
              fill="url(#sp-a)"
              style={{
                fontFamily: "'Outfit', 'Inter', sans-serif",
                fontSize: 96,
                fontWeight: 800,
                letterSpacing: -2,
              }}
            >
              A
            </text>
            {/* decorative swoosh lines inside A */}
            <path d="M56,88 Q80,78 104,88" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            <path d="M60,94 Q80,85 100,94" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
            <path d="M64,99 Q80,92 96,99" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
          </svg>
        </div>

        {/* ARTMS text */}
        <div className="splash-text" style={{ marginTop: 8, textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Outfit', 'Inter', sans-serif",
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: 6,
              color: "transparent",
              background: "linear-gradient(135deg, #F2B705 0%, #d4a000 40%, #F2B705 60%, #fff5d4 80%, #F2B705 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              margin: 0,
              lineHeight: 1,
            }}
          >
            <span style={{
              fontSize: 52,
              background: "linear-gradient(180deg, #F2B705 0%, #a67c00 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}>A</span>
            RTMS
          </h1>
        </div>

        {/* subtitle */}
        <div className="splash-subtitle" style={{ marginTop: 12, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: 3.5,
              color: "#b8a070",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#F2B705", fontWeight: 600 }}>Ananda Rath</span>
            {" "}Travel{" "}
            <span style={{ color: "#F2B705", fontWeight: 600 }}>Management</span>
            {" "}System
          </p>
          {/* decorative line */}
          <div style={{
            margin: "10px auto 0",
            width: 180,
            height: 1,
            background: "linear-gradient(90deg, transparent, #F2B705, transparent)",
            opacity: 0.4,
          }} />
        </div>
      </div>

      {/* ── Bottom loading ── */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          zIndex: 2,
        }}
      >
        {/* loading dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="splash-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: i === 0 ? "#F2B705" : "#3a3020",
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>
        {/* LOADING text */}
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 5,
            color: "#8a7a60",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Loading...
        </p>
      </div>

      {/* ── CSS Animations ── */}
      <style>{`
        .splash-root.enter .splash-logo {
          animation: sp-scale-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .splash-root.enter .splash-text,
        .splash-root.hold .splash-text {
          animation: sp-fade-up 0.7s ease-out 0.3s both;
        }
        .splash-root.enter .splash-subtitle,
        .splash-root.hold .splash-subtitle {
          animation: sp-fade-up 0.7s ease-out 0.5s both;
        }
        .splash-sparkle {
          animation: sp-sparkle 2s ease-in-out infinite;
        }
        .splash-wave {
          opacity: 0;
          animation: sp-wave-in 1.2s ease-out 0.2s both;
        }
        .splash-wave-2 {
          animation-delay: 0.4s;
        }
        .splash-dot {
          animation: sp-dot-pulse 1.25s ease-in-out infinite;
        }

        @keyframes sp-scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sp-fade-up {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes sp-sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes sp-wave-in {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-dot-pulse {
          0%, 80%, 100% { background-color: #3a3020; transform: scale(1); }
          40% { background-color: #F2B705; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
