import { useCallback, useRef, useState, type ReactNode } from "react";

/**
 * Carte avec effet de profondeur 3D (tilt + reflet de lumière) qui suit le
 * pointeur ou le doigt. Aucune dépendance externe — juste des transforms CSS.
 */
export function Tilt3D({
  children,
  className = "",
  maxTilt = 12,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
  const [transition, setTransition] = useState("transform 0.5s cubic-bezier(0.23,1,0.32,1)");
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 2 * maxTilt;
      const rotateX = -(py - 0.5) * 2 * maxTilt;
      setTransition("transform 0.08s ease-out");
      setTransform(
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015,1.015,1.015)`
      );
      setGlare({ x: px * 100, y: py * 100, opacity: 0.22 });
    },
    [maxTilt]
  );

  const reset = useCallback(() => {
    setTransition("transform 0.5s cubic-bezier(0.23,1,0.32,1)");
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)");
    setGlare((g) => ({ ...g, opacity: 0 }));
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ transform, transition, willChange: "transform" }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) handleMove(t.clientX, t.clientY);
      }}
      onTouchEnd={reset}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 mix-blend-overlay"
        style={{
          opacity: glare.opacity,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, white, transparent 55%)`,
        }}
      />
    </div>
  );
}
