"use client";
// =============================================================
//  ParticlesBackground — Canvas avec particules teal flottantes (0.58.20)
//
//  Effet d'ambiance discret en arrière-plan : ~30 particules
//  teal qui flottent doucement, avec connexions entre particules
//  proches (effet "constellation").
//
//  Optimisé :
//   - Canvas pleine largeur, requestAnimationFrame
//   - Respecte prefers-reduced-motion (pas d'animation si reduce)
//   - Pause si la tab n'est pas visible
//   - Pause sur mobile par défaut (économise la batterie)
//
//  Usage :
//    <ParticlesBackground />  ← se rend en absolute, fond derrière
// =============================================================

import { useEffect, useRef } from "react";

export default function ParticlesBackground({
  count = 30,
  color = "rgba(124, 200, 200, 0.6)",     // teal Aveho
  lineColor = "rgba(124, 200, 200, 0.15)", // teal pour les lignes
  speed = 0.3,
  linkDistance = 140,
  showOnMobile = false,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion
    if (typeof window !== "undefined") {
      const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduce) return;
    }

    // Skip mobile si showOnMobile=false (économie batterie)
    if (!showOnMobile && typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0, height = 0, dpr = 1;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();

    // Initialiser les particules
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      r: Math.random() * 1.5 + 0.6,
    }));

    let isVisible = true;
    function onVisibility() { isVisible = !document.hidden; }
    document.addEventListener("visibilitychange", onVisibility);

    function tick() {
      if (!isVisible) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      // Update positions
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Bounce on edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        // Clamp
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));
      }

      // Draw connections (lines between close particles)
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            // Opacity dépend de la distance
            const opacity = (1 - dist / linkDistance) * 0.4;
            ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/, `${opacity})`);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      ctx.fillStyle = color;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glow effect (subtle)
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(124, 200, 200, 0.6)";

      animRef.current = requestAnimationFrame(tick);
    }
    tick();

    // Resize handler
    function onResize() { resize(); }
    window.addEventListener("resize", onResize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [count, color, lineColor, speed, linkDistance, showOnMobile]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}
