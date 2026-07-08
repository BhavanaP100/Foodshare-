import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";

// ─── Floating Particle Background ──────────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background:
              p.id % 3 === 0
                ? "rgba(0,255,180,0.55)"
                : p.id % 3 === 1
                ? "rgba(0,200,255,0.45)"
                : "rgba(255,140,60,0.4)",
            boxShadow:
              p.id % 3 === 0
                ? "0 0 6px rgba(0,255,180,0.8)"
                : p.id % 3 === 1
                ? "0 0 6px rgba(0,200,255,0.7)"
                : "0 0 6px rgba(255,140,60,0.7)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Globe Hero Visual ──────────────────────────────────────────────────────
function GlobeHero() {
  const foodItems = [
    { emoji: "🍎", x: -120, y: -80, size: 36, delay: 0 },
    { emoji: "🥦", x: 130, y: -60, size: 32, delay: 0.4 },
    { emoji: "🌽", x: -100, y: 90, size: 30, delay: 0.8 },
    { emoji: "🍊", x: 110, y: 80, size: 34, delay: 1.2 },
    { emoji: "🥕", x: -60, y: -130, size: 28, delay: 0.6 },
    { emoji: "📦", x: 70, y: 130, size: 38, delay: 1.0 },
    { emoji: "🥛", x: 150, y: 20, size: 30, delay: 1.5 },
    { emoji: "🍞", x: -150, y: 20, size: 32, delay: 0.2 },
  ];

  return (
    <div className="relative flex items-center justify-center" style={{ width: 420, height: 420 }}>
      {/* Outer glow backdrop */}
      <div
        className="absolute"
        style={{
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,255,180,0.08) 0%, rgba(0,150,255,0.06) 50%, transparent 75%)",
          filter: "blur(30px)",
        }}
      />

      {/* Orbit Ring 1 */}
      <motion.div
        className="absolute"
        style={{
          width: 340,
          height: 340,
          borderRadius: "50%",
          border: "1.5px solid rgba(0,255,180,0.25)",
          boxShadow: "0 0 20px rgba(0,255,180,0.12)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        {/* Orbit dot */}
        <div
          style={{
            position: "absolute",
            top: -5,
            left: "50%",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#00ffb4",
            boxShadow: "0 0 12px #00ffb4, 0 0 24px rgba(0,255,180,0.6)",
          }}
        />
      </motion.div>

      {/* Orbit Ring 2 */}
      <motion.div
        className="absolute"
        style={{
          width: 280,
          height: 280,
          borderRadius: "50%",
          border: "1px solid rgba(0,180,255,0.2)",
          boxShadow: "0 0 15px rgba(0,180,255,0.1)",
          transform: "rotateX(60deg)",
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#00c8ff",
            boxShadow: "0 0 10px #00c8ff",
          }}
        />
      </motion.div>

      {/* Orbit Ring 3 — tilted */}
      <motion.div
        className="absolute"
        style={{
          width: 390,
          height: 390,
          borderRadius: "50%",
          border: "1px solid rgba(255,140,60,0.15)",
          transform: "rotateX(75deg) rotateZ(30deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />

      {/* Globe */}
      <motion.div
        style={{
          width: 210,
          height: 210,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 35%, rgba(0,255,180,0.18) 0%, rgba(0,80,160,0.85) 45%, rgba(0,20,60,0.97) 80%)",
          boxShadow:
            "0 0 60px rgba(0,200,255,0.35), 0 0 120px rgba(0,100,200,0.2), inset 0 0 50px rgba(0,255,180,0.08)",
          border: "1.5px solid rgba(0,255,180,0.22)",
          position: "relative",
          zIndex: 10,
        }}
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Globe grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(0,255,180,0.07) 23px),
              repeating-linear-gradient(90deg, transparent, transparent 22px, rgba(0,255,180,0.07) 23px)
            `,
            opacity: 0.7,
          }}
        />
        {/* Globe highlight */}
        <div
          style={{
            position: "absolute",
            top: "18%",
            left: "20%",
            width: "40%",
            height: "30%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
            filter: "blur(6px)",
          }}
        />
        {/* Continent blobs */}
        <div style={{ position: "absolute", top: "28%", left: "22%", width: "28%", height: "20%", borderRadius: "40%", background: "rgba(0,255,150,0.18)", filter: "blur(3px)" }} />
        <div style={{ position: "absolute", top: "50%", left: "45%", width: "22%", height: "15%", borderRadius: "40%", background: "rgba(0,255,150,0.14)", filter: "blur(3px)" }} />
        <div style={{ position: "absolute", top: "38%", left: "58%", width: "18%", height: "22%", borderRadius: "40%", background: "rgba(0,255,150,0.12)", filter: "blur(3px)" }} />
      </motion.div>

      {/* Floating food items */}
      {foodItems.map((item) => (
        <motion.div
          key={item.emoji}
          style={{
            position: "absolute",
            fontSize: item.size,
            left: "50%",
            top: "50%",
            x: item.x,
            y: item.y,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
            zIndex: 20,
          }}
          animate={{
            y: [item.y - 8, item.y + 8, item.y - 8],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 4 + item.delay,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Scroll Reveal Wrapper ──────────────────────────────────────────────────
function ScrollReveal({ children, delay = 0, direction = "up" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0 },
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated Counter ───────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "+" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = parseInt(target.replace(/[^0-9]/g, ""));
    const duration = 1800;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  const formatted = count.toLocaleString();
  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

// ─── Main Home Component ────────────────────────────────────────────────────
export default function Home() {
  const [lateNightMode, setLateNightMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const lnBg = lateNightMode ? "#0a0d12" : undefined;

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        fontFamily: "'Syne', 'Space Grotesk', sans-serif",
        background: lateNightMode ? "#0a0d12" : "#050b14",
        color: "#e8f4f0",
        transition: "background 0.6s ease",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        .nav-link {
          position: relative;
          color: rgba(220,240,235,0.75);
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          transition: color 0.25s;
          text-decoration: none;
          padding-bottom: 2px;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          width: 0; height: 1.5px;
          background: #00ffb4;
          transition: width 0.3s ease;
        }
        .nav-link:hover { color: #00ffb4; }
        .nav-link:hover::after { width: 100%; }

        .glow-btn {
          background: linear-gradient(135deg, #00c97a, #00a8e8);
          color: #000;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.06em;
          padding: 9px 22px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(0,200,180,0.35);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .glow-btn:hover {
          transform: scale(1.06) translateY(-1px);
          box-shadow: 0 0 32px rgba(0,220,170,0.55);
        }

        .outline-btn {
          background: transparent;
          color: #e8f4f0;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 10px 24px;
          border-radius: 8px;
          border: 1.5px solid rgba(0,255,180,0.35);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: border-color 0.2s, background 0.2s, transform 0.18s;
        }
        .outline-btn:hover {
          border-color: rgba(0,255,180,0.7);
          background: rgba(0,255,180,0.06);
          transform: scale(1.04);
        }

        .feature-card {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-8px) scale(1.015);
          box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 30px rgba(0,255,180,0.12);
        }

        .stat-card {
          border-radius: 14px;
          padding: 22px 28px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 40px rgba(0,200,150,0.15);
        }

        .benefit-card {
          border-radius: 16px;
          padding: 28px 24px;
          background: #fff;
          border: 1.5px solid #e8f0eb;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
        }
        .benefit-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px rgba(0,160,120,0.15);
          border-color: #00c97a;
        }

        .toggle-switch {
          width: 46px; height: 24px;
          border-radius: 99px;
          position: relative;
          cursor: pointer;
          transition: background 0.3s;
          border: none;
          flex-shrink: 0;
        }
        .toggle-knob {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          top: 3px;
          transition: left 0.3s;
        }

        .step-connector {
          flex: 1;
          height: 2px;
          background: linear-gradient(to right, #00c97a44, #00a8e844);
          margin: 0 12px;
          position: relative;
          top: -30px;
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #050b14; }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,150,0.25); border-radius: 3px; }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(5,11,20,0.82)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(0,255,180,0.1)",
          padding: "0 5%",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>🌿</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em", color: "#e8f4f0" }}>
              FoodShare <span style={{ color: "#00ffb4" }}>Nexus</span>
            </div>
            <div style={{ fontSize: "0.62rem", color: "rgba(200,230,220,0.5)", letterSpacing: "0.1em", marginTop: -1 }}>
              WASTE TODAY, FEED TOMORROW
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Home", "About", "How It Works", "Dashboard"].map((link) => (
            <a key={link} href="#" className="nav-link">
              {link}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Late Night Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(200,230,220,0.6)" }}>
              {lateNightMode ? "🌙" : "☀️"} Late Night Mode
            </span>
            <button
              className="toggle-switch"
              style={{ background: lateNightMode ? "#00c97a" : "rgba(255,255,255,0.15)" }}
              onClick={() => setLateNightMode(!lateNightMode)}
            >
              <div
                className="toggle-knob"
                style={{ left: lateNightMode ? 25 : 3 }}
              />
            </button>
          </div>

          <motion.button
            className="glow-btn"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.96 }}
          >
            Get Started
          </motion.button>
        </div>
      </motion.nav>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "0 5%",
          paddingTop: 80,
          position: "relative",
          overflow: "hidden",
          background: lateNightMode
            ? "radial-gradient(ellipse at 60% 40%, rgba(0,30,20,0.9) 0%, #0a0d12 70%)"
            : "radial-gradient(ellipse at 60% 40%, rgba(0,50,40,0.5) 0%, #050b14 70%)",
        }}
      >
        <ParticleField />

        {/* Background glow blobs */}
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,120,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,140,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 1200, margin: "0 auto", gap: 40, flexWrap: "wrap" }}>
          {/* Left copy */}
          <div style={{ flex: "1 1 440px", maxWidth: 560 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,255,180,0.08)", border: "1px solid rgba(0,255,180,0.2)", borderRadius: 99, padding: "5px 14px", fontSize: "0.72rem", letterSpacing: "0.1em", color: "#00ffb4", marginBottom: 24 }}
            >
              ✦ Smart Food Donation Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(2.8rem, 5vw, 4.2rem)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0 0 20px" }}
            >
              Reduce Waste.{" "}
              <br />
              <span style={{ background: "linear-gradient(135deg, #00ffb4, #00c8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Feed Lives.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.55 }}
              style={{ color: "rgba(200,230,220,0.72)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 36, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}
            >
              Join the mission to save surplus food and fight hunger.
              <br />
              Connect donors, volunteers, and communities — all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
            >
              <motion.button
                className="glow-btn"
                style={{ fontSize: "0.95rem", padding: "12px 28px", borderRadius: 10 }}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started →
              </motion.button>
              <button className="outline-btn" style={{ fontSize: "0.95rem" }}>
                <span style={{ fontSize: 18 }}>▶</span> Watch Demo
              </button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 40 }}
            >
              <div style={{ display: "flex" }}>
                {["🧑", "👩", "👨", "🧕"].map((e, i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #050b14", background: `hsl(${i * 60 + 140},60%,30%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginLeft: i ? -8 : 0 }}>{e}</div>
                ))}
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(200,230,220,0.6)" }}>
                <span style={{ color: "#00ffb4", fontWeight: 700 }}>2,400+</span> people joined this month
              </div>
            </motion.div>
          </div>

          {/* Right: Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ flex: "1 1 380px", display: "flex", justifyContent: "center" }}
          >
            <GlobeHero />
          </motion.div>
        </div>
      </section>

      {/* ── THREE FEATURE CARDS ─────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 5% 90px",
          background: "linear-gradient(180deg, #050b14 0%, #071018 100%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ScrollReveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: "0.75rem", letterSpacing: "0.15em", color: "#00ffb4", marginBottom: 10, fontWeight: 600 }}>JOIN THE MOVEMENT</div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", margin: 0 }}>
                How You Can Help
              </h2>
            </div>
          </ScrollReveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              {
                icon: "📦",
                title: "Donate Food",
                desc: "Share surplus food safely with those in need. Post listings in minutes.",
                gradient: "linear-gradient(135deg, rgba(0,80,40,0.85) 0%, rgba(0,30,50,0.95) 100%)",
                glow: "rgba(0,200,120,0.2)",
                accent: "#00c97a",
                bg: "🥕🍎🥦🌽",
                cta: "Start Donating",
              },
              {
                icon: "🤝",
                title: "Become a Volunteer",
                desc: "Help pick up and deliver meals to NGOs and families near you.",
                gradient: "linear-gradient(135deg, rgba(80,30,0,0.85) 0%, rgba(30,10,50,0.95) 100%)",
                glow: "rgba(255,140,60,0.2)",
                accent: "#ff8c3c",
                bg: "🚚👩‍🍳🏘️",
                cta: "Join as Volunteer",
              },
              {
                icon: "📍",
                title: "Find Resources",
                desc: "Locate nearby NGOs and food support resources in your area.",
                gradient: "linear-gradient(135deg, rgba(0,30,80,0.85) 0%, rgba(0,50,60,0.95) 100%)",
                glow: "rgba(0,180,255,0.2)",
                accent: "#00b4ff",
                bg: "🗺️🏠🌐",
                cta: "Explore Map",
              },
            ].map((card, i) => (
              <ScrollReveal key={card.title} delay={i * 0.12}>
                <motion.div
                  className="feature-card"
                  style={{
                    background: card.gradient,
                    border: `1px solid ${card.accent}30`,
                    boxShadow: `0 8px 40px ${card.glow}, inset 0 0 60px rgba(0,0,0,0.3)`,
                    minHeight: 280,
                    padding: "32px 28px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                  whileHover={{ scale: 1.02, y: -8 }}
                >
                  {/* Big emoji background */}
                  <div style={{ position: "absolute", top: 12, right: 16, fontSize: 48, opacity: 0.12, filter: "blur(1px)", letterSpacing: 6 }}>{card.bg}</div>

                  <div style={{ fontSize: 36, filter: `drop-shadow(0 0 12px ${card.accent})` }}>{card.icon}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.25rem" }}>{card.title}</div>
                  <div style={{ color: "rgba(220,240,235,0.65)", fontSize: "0.88rem", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{card.desc}</div>

                  <motion.button
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: `1.5px solid ${card.accent}55`,
                      color: card.accent,
                      borderRadius: 8,
                      padding: "8px 18px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "background 0.2s",
                    }}
                    whileHover={{ background: `${card.accent}15`, x: 3 }}
                  >
                    {card.cta} →
                  </motion.button>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACT STATS ───────────────────────────────────────────── */}
      <section style={{ padding: "70px 5%", background: "rgba(0,20,12,0.6)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ScrollReveal>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#00ffb4", marginBottom: 6 }}>REAL-TIME DATA</div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", margin: 0 }}>Impact Preview</h2>
              </div>
              <button style={{ background: "transparent", border: "1.5px solid rgba(0,255,180,0.3)", color: "#00ffb4", borderRadius: 8, padding: "9px 20px", fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 }}>
                View Full Impact →
              </button>
            </div>
          </ScrollReveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18 }}>
            {[
              { icon: "🍽️", value: "12450", suffix: "+", label: "Meals Donated", color: "#00ffb4" },
              { icon: "🏢", value: "850", suffix: "+", label: "Active NGOs", color: "#00c8ff" },
              { icon: "♻️", value: "320", suffix: "+", label: "Tons of Food Saved", color: "#ff8c3c" },
              { icon: "❤️", value: "18200", suffix: "+", label: "Lives Impacted", color: "#ff6080" },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1}>
                <div className="stat-card">
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{stat.icon}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2rem", color: stat.color, lineHeight: 1 }}>
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div style={{ color: "rgba(200,230,220,0.6)", fontSize: "0.82rem", marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHITE LOWER SECTIONS ────────────────────────────────────── */}
      <div style={{ background: "#f5f9f7", color: "#0d1f18" }}>

        {/* WHY DONATE FOOD */}
        <section style={{ padding: "90px 5%" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <ScrollReveal>
              <div style={{ textAlign: "center", marginBottom: 56 }}>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#00a862", marginBottom: 10, fontWeight: 600 }}>SMALL ACTION. BIG IMPACT.</div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", margin: "0 0 12px", color: "#0d1f18" }}>
                  Why donate food?
                </h2>
                <p style={{ color: "#6b8880", maxWidth: 480, margin: "0 auto", fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif" }}>
                  Every meal shared creates a ripple effect of positive change across communities.
                </p>
              </div>
            </ScrollReveal>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 22 }}>
              {[
                { icon: "👥", title: "Reduce Hunger", desc: "Help feed those who truly need it in your community.", color: "#00a862" },
                { icon: "♻️", title: "Reduce Waste", desc: "Prevent good food from being wasted every single day.", color: "#0094cc" },
                { icon: "🌍", title: "Protect Planet", desc: "Lower carbon footprint and build a sustainable future.", color: "#e67e22" },
                { icon: "🤝", title: "Build Community", desc: "Stronger communities come together to fight hunger.", color: "#9b59b6" },
              ].map((b, i) => (
                <ScrollReveal key={b.title} delay={i * 0.1}>
                  <div className="benefit-card">
                    <div style={{ fontSize: 38, marginBottom: 14, filter: `drop-shadow(0 2px 8px ${b.color}40)` }}>{b.icon}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#0d1f18", marginBottom: 8 }}>{b.title}</div>
                    <div style={{ color: "#6b8880", fontSize: "0.87rem", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{b.desc}</div>
                    <div style={{ width: 32, height: 3, background: b.color, borderRadius: 2, marginTop: 16 }} />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: "80px 5%", background: "#eef5f1" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <ScrollReveal>
              <div style={{ textAlign: "center", marginBottom: 60 }}>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#00a862", marginBottom: 10, fontWeight: 600 }}>SIMPLE STEPS TO CREATE BIG CHANGE</div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem, 3vw, 2.5rem)", margin: 0, color: "#0d1f18" }}>
                  How it works
                </h2>
              </div>
            </ScrollReveal>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap" }}>
              {[
                { step: "01", icon: "📋", title: "Donate", desc: "Donors post surplus food with details. Simple form, instant listing." },
                { step: "02", icon: "🗺️", title: "We Match", desc: "Our smart system matches with the nearest NGOs or volunteers." },
                { step: "03", icon: "🌱", title: "Deliver & Feed", desc: "Food reaches people who need it the most — tracked in real time." },
              ].map((s, i) => (
                <ScrollReveal key={s.step} delay={i * 0.15} style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
                    <div style={{ textAlign: "center", flex: 1, minWidth: 200, padding: "0 16px" }}>
                      <div style={{ fontSize: "0.7rem", letterSpacing: "0.15em", color: "#00a862", fontWeight: 700, marginBottom: 12 }}>Step {s.step}</div>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #e8f5ef, #d0ede2)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 6px 20px rgba(0,160,100,0.15)" }}>{s.icon}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#0d1f18", marginBottom: 8 }}>{s.title}</div>
                      <div style={{ color: "#6b8880", fontSize: "0.87rem", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{s.desc}</div>
                    </div>
                    {i < 2 && (
                      <div style={{ width: 48, height: 2, background: "linear-gradient(to right, #00a862, #00c8ff)", marginTop: 44, flexShrink: 0 }}>
                        <div style={{ textAlign: "center", marginTop: -10, fontSize: 18, color: "#00a862" }}>→</div>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* LATE NIGHT MODE CTA */}
        <section
          style={{
            padding: "70px 5%",
            background: lateNightMode
              ? "linear-gradient(135deg, #060e18 0%, #0a1a10 100%)"
              : "linear-gradient(135deg, #0b1824 0%, #0d2018 100%)",
            color: "#e8f4f0",
            transition: "background 0.6s",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
            <ScrollReveal>
              <div style={{ flex: "1 1 400px" }}>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#00ffb4", marginBottom: 12 }}>🌙 BECAUSE HUNGER DOESN'T SLEEP</div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 14px" }}>
                  Late Night Mode
                </h2>
                <p style={{ color: "rgba(200,230,220,0.65)", fontSize: "0.92rem", lineHeight: 1.75, marginBottom: 24, fontFamily: "'DM Sans', sans-serif" }}>
                  Our late-night access ensures food reaches those who need it anytime. Volunteers and NGOs stay active 24/7 so no surplus is ever wasted.
                </p>
                <motion.button
                  className="glow-btn"
                  style={{ fontSize: "0.9rem", padding: "11px 26px" }}
                  whileHover={{ scale: 1.06 }}
                  onClick={() => setLateNightMode(true)}
                >
                  Explore Late Night Access →
                </motion.button>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div style={{ flex: "1 1 300px", display: "flex", justifyContent: "center" }}>
                <div style={{ fontSize: 100, filter: "drop-shadow(0 0 30px rgba(0,255,180,0.2))", textAlign: "center" }}>
                  🌙<br />
                  <span style={{ fontSize: 50 }}>🚚</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: "#060f0a", padding: "40px 5%", borderTop: "1px solid rgba(0,255,180,0.08)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🌿</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#e8f4f0" }}>
                FoodShare <span style={{ color: "#00ffb4" }}>Nexus</span>
              </span>
            </div>
            <div style={{ color: "rgba(200,230,220,0.35)", fontSize: "0.78rem" }}>
              © 2026 FoodShare Nexus. Built to feed communities.
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy", "Terms", "Contact"].map((l) => (
                <a key={l} href="#" style={{ color: "rgba(200,230,220,0.4)", fontSize: "0.78rem", textDecoration: "none" }}>{l}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
