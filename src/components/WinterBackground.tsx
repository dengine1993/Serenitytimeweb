import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  opacity: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
}

export const WinterBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars
    const stars: Star[] = [];
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Create snowflakes
    const snowflakes: Snowflake[] = [];
    const snowflakeCount = 100;
    for (let i = 0; i < snowflakeCount; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.3,
        drift: Math.random() * 0.3 - 0.15,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }

    // Enhanced aurora orbs with more dynamic colors
    const auroraOrbs = [
      { x: canvas.width * 0.2, y: canvas.height * 0.3, radius: 300, color: 'rgba(59, 130, 246, 0.12)', speed: 0.3 },
      { x: canvas.width * 0.8, y: canvas.height * 0.5, radius: 350, color: 'rgba(168, 85, 247, 0.15)', speed: 0.25 },
      { x: canvas.width * 0.5, y: canvas.height * 0.7, radius: 280, color: 'rgba(6, 182, 212, 0.1)', speed: 0.35 },
      { x: canvas.width * 0.6, y: canvas.height * 0.2, radius: 220, color: 'rgba(139, 92, 246, 0.08)', speed: 0.4 },
    ];

    const animationFrameRef = { current: 0 };
    let time = 0;

    const animate = () => {
      time += 0.001;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars with twinkling effect
      stars.forEach((star) => {
        star.opacity = Math.abs(Math.sin(time * star.twinkleSpeed * 100));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.8})`;
        ctx.fill();
      });

      // Draw enhanced aurora effect with blur
      ctx.filter = 'blur(40px)';
      auroraOrbs.forEach((orb, index) => {
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(0.5, orb.color.replace(/[\d.]+\)$/, '0.05)'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Smooth organic movement
        orb.x = canvas.width * (0.5 + Math.sin(time * orb.speed + index * 2) * 0.3);
        orb.y = canvas.height * (0.5 + Math.cos(time * orb.speed * 0.8 + index * 1.5) * 0.25);
      });
      ctx.filter = 'none';

      // Draw snowflakes with subtle glow
      snowflakes.forEach((flake) => {
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Update position
        flake.y += flake.speed;
        flake.x += flake.drift;

        // Reset if out of bounds
        if (flake.y > canvas.height) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) flake.x = 0;
        if (flake.x < 0) flake.x = canvas.width;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'radial-gradient(ellipse at top, hsl(240, 25%, 12%) 0%, hsl(240, 20%, 8%) 50%, hsl(280, 30%, 10%) 100%)'
      }}
    />
  );
};
