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
  // 0.58.25 : modes spéciaux
  mode = "default",   // "default" | "multicolor" | "flow"
  flowDirection = "diagonal", // "right" | "down" | "diagonal" (mode flow)
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  // 0.58.25 : palette multicolor Aveho
  const MULTICOLORS = [
    "rgba(124, 200, 200, 0.65)",  // teal
    "rgba(24, 95, 165, 0.55)",    // blue
    "rgba(122, 111, 176, 0.55)",  // violet
    "rgba(201, 134, 127, 0.55)",  // terra
  ];

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
    // 0.58.25 : si mode=multicolor, chaque particule a sa propre couleur
    //           si mode=flow, drift directionnel au lieu de bounce
    particlesRef.current = Array.from({ length: count }, (_, i) => {
      let vx, vy;
      if (mode === "flow") {
        // Drift directionnel
        if (flowDirection === "right") {
          vx = speed * (0.6 + Math.random() * 0.6);  // toujours vers la droite
          vy = (Math.random() - 0.5) * speed * 0.3;
        } else if (flowDirection === "down") {
          vx = (Math.random() - 0.5) * speed * 0.3;
          vy = speed * (0.6 + Math.random() * 0.6);
        } else {
          // diagonal
          vx = speed * (0.4 + Math.random() * 0.5);
          vy = speed * (0.3 + Math.random() * 0.4);
        }
      } else {
        vx = (Math.random() - 0.5) * speed;
        vy = (Math.random() - 0.5) * speed;
      }
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx,
        vy,
        r: Math.random() * 1.5 + 0.6,
        // 0.58.25 : couleur dédiée par particule en mode multicolor
        c: mode === "multicolor" ? MULTICOLORS[i % MULTICOLORS.length] : null,
      };
    });

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
        // 0.58.25 : mode flow → wrap around au lieu de bounce
        if (mode === "flow") {
          if (p.x > width + 10) p.x = -10;
          if (p.x < -10) p.x = width + 10;
          if (p.y > height + 10) p.y = -10;
          if (p.y < -10) p.y = height + 10;
        } else {
          // Bounce on edges
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
          // Clamp
          p.x = Math.max(0, Math.min(width, p.x));
          p.y = Math.max(0, Math.min(height, p.y));
        }
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
      // 0.58.25 : mode multicolor → chaque particule a sa couleur dédiée
      if (mode === "multicolor") {
        for (const p of particles) {
          ctx.fillStyle = p.c || color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = color;
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
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
  }, [count, color, lineColor, speed, linkDistance, showOnMobile, mode, flowDirection]);

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
