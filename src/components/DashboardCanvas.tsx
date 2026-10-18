import { useEffect, useRef } from "react";

/** Decorative canvas layer. Content remains available as normal DOM beneath it. */
export function DashboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let isVisible = true;
    let width = 0;
    let height = 0;
    const dots = Array.from({ length: 22 }, (_, index) => ({
      x: (index * 47) % 100,
      y: (index * 29) % 100,
      radius: 1.2 + (index % 3) * 0.5,
      speed: 0.0025 + (index % 4) * 0.0007,
    }));

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time: number) => {
      if (!isVisible) {
        frame = 0;
        return;
      }
      context.clearRect(0, 0, width, height);
      const gradient = context.createRadialGradient(width * 0.78, height * 0.1, 5, width * 0.78, height * 0.1, width * 0.55);
      gradient.addColorStop(0, "rgba(102, 211, 255, .23)");
      gradient.addColorStop(1, "rgba(102, 211, 255, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      dots.forEach((dot) => {
        const x = (dot.x / 100) * width + Math.sin(time * dot.speed) * 15;
        const y = (dot.y / 100) * height + Math.cos(time * dot.speed) * 10;
        context.beginPath();
        context.fillStyle = "rgba(220, 247, 255, .46)";
        context.arc(x, y, dot.radius, 0, Math.PI * 2);
        context.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? true;
      if (isVisible && !frame) frame = requestAnimationFrame(draw);
    });
    visibilityObserver.observe(canvas);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="dashboard-canvas" aria-hidden="true" />;
}
