import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import './MatrixInfinity.css';

export default function MatrixInfinity() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const [isPaused, setIsPaused] = useState(false);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let lastFrameTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    // Responsive canvas sizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ===== LIGHT MODE: Cyberpunk Data Fragments =====
    if (theme === 'light') {
      const config = {
        fragmentCount: 50,
        connectionDistance: 180,
        clusterThreshold: 120,
        disperseChance: 0.002,
      };

      // Data Particle types - pure data visualization
      const fragmentTypes = ['dot', 'stream', 'cluster'];
      const colors = {
        electricBlue: { r: 100, g: 180, b: 255 },
        softPurple: { r: 180, g: 140, b: 255 },
        mintCyan: { r: 120, g: 220, b: 200 },
        coralPink: { r: 255, g: 150, b: 180 },
        pearlWhite: { r: 240, g: 245, b: 255 },
      };

      class DataFragment {
        constructor(index) {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.vx = (Math.random() - 0.5) * 1.5;
          this.vy = (Math.random() - 0.5) * 1.5;

          // Weighted particle type distribution: 60% dots, 25% streams, 15% clusters
          const rand = Math.random();
          if (rand < 0.6) this.type = 'dot';
          else if (rand < 0.85) this.type = 'stream';
          else this.type = 'cluster';

          this.size = 20 + Math.random() * 40;
          this.rotation = Math.random() * Math.PI * 2;
          this.rotationSpeed = (Math.random() - 0.5) * 0.02;
          this.cluster = null;
          this.connections = [];

          // Color - sophisticated palette
          const colorKeys = Object.keys(colors);
          this.colorKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
          this.color = colors[this.colorKey];

          // Animation
          this.glitchTimer = Math.random() * 200;
          this.pulsePhase = Math.random() * Math.PI * 2;
        }

        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.rotation += this.rotationSpeed;
          this.pulsePhase += 0.05;
          this.glitchTimer++;

          // Boundary wrap
          if (this.x < -this.size) this.x = canvas.width + this.size;
          if (this.x > canvas.width + this.size) this.x = -this.size;
          if (this.y < -this.size) this.y = canvas.height + this.size;
          if (this.y > canvas.height + this.size) this.y = -this.size;

          // Attraction to nearby fragments
          this.connections = [];
          particlesRef.current.forEach(other => {
            if (other === this) return;
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < config.clusterThreshold && dist > 0) {
              // Attraction force
              const force = 0.002;
              this.vx += (dx / dist) * force;
              this.vy += (dy / dist) * force;
            }

            if (dist < config.connectionDistance) {
              this.connections.push({ fragment: other, distance: dist });
            }
          });

          // Velocity damping
          this.vx *= 0.99;
          this.vy *= 0.99;

          // Random disperse
          if (Math.random() < config.disperseChance) {
            this.vx += (Math.random() - 0.5) * 2;
            this.vy += (Math.random() - 0.5) * 2;
          }
        }

        drawDot(context) {
          const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
          const { r, g, b } = this.color;

          // Clean radial gradient glow - NO shadows
          const gradient = context.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 3
          );
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulse * 0.8})`);
          gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${pulse * 0.4})`);
          gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${pulse * 0.15})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          context.fillStyle = gradient;
          context.beginPath();
          context.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
          context.fill();

          // Core particle
          context.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
          context.beginPath();
          context.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
          context.fill();
        }

        drawStream(context) {
          const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
          const { r, g, b } = this.color;

          context.save();
          context.translate(this.x, this.y);

          // Soft glow - NO shadows
          const gradient = context.createRadialGradient(0, 0, 0, 0, 0, this.size * 2.5);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulse * 0.3})`);
          gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${pulse * 0.12})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          context.fillStyle = gradient;
          context.fillRect(-this.size * 2.5, -this.size * 2.5, this.size * 5, this.size * 5);

          // Binary stream text - clean rendering
          context.font = `${this.size * 0.35}px "Courier New", monospace`;
          context.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse * 0.9})`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';

          const binaryStrings = ['1010', '0101', '1100', '0011', '1111', '0000'];
          const text = binaryStrings[Math.floor((this.glitchTimer / 10) % binaryStrings.length)];

          context.fillText(text, 0, 0);

          // Data flow line
          const flowY = ((this.glitchTimer % 80) / 80) * this.size * 2 - this.size;
          context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pulse * 0.25})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(-this.size * 0.8, flowY);
          context.lineTo(this.size * 0.8, flowY);
          context.stroke();

          context.restore();
        }

        drawCluster(context) {
          const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
          const { r, g, b } = this.color;

          context.save();
          context.translate(this.x, this.y);
          context.rotate(this.rotation);

          // Soft ambient glow - NO shadows
          const ambientGlow = context.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
          ambientGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulse * 0.25})`);
          ambientGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${pulse * 0.1})`);
          ambientGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          context.fillStyle = ambientGlow;
          context.fillRect(-this.size * 2, -this.size * 2, this.size * 4, this.size * 4);

          // Pixel cluster grid - 5x5 pattern
          const pixelSize = this.size * 0.12;
          const spacing = this.size * 0.18;
          const gridSize = 5;
          const startOffset = -(gridSize - 1) * spacing / 2;

          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              // Random pixel appearance based on position
              const randomFactor = (row * gridSize + col + this.glitchTimer / 20) % 17;
              if (randomFactor > 11) continue; // Skip some pixels for variety

              const x = startOffset + col * spacing;
              const y = startOffset + row * spacing;

              // Individual pixel glow
              const pixelGlow = context.createRadialGradient(x, y, 0, x, y, pixelSize * 3);
              pixelGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulse * 0.7})`);
              pixelGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${pulse * 0.3})`);
              pixelGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

              context.fillStyle = pixelGlow;
              context.fillRect(x - pixelSize * 3, y - pixelSize * 3, pixelSize * 6, pixelSize * 6);

              // Pixel core
              context.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
              context.fillRect(x - pixelSize / 2, y - pixelSize / 2, pixelSize, pixelSize);
            }
          }

          context.restore();
        }

        draw(context) {
          // Draw connections first (behind)
          this.connections.forEach(({ fragment, distance }) => {
            const alpha = 1 - distance / config.connectionDistance;
            const gradient = context.createLinearGradient(
              this.x, this.y, fragment.x, fragment.y
            );

            const { r: r1, g: g1, b: b1 } = this.color;
            const { r: r2, g: g2, b: b2 } = fragment.color;

            gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, ${alpha * 0.2})`);
            gradient.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, ${alpha * 0.2})`);

            context.strokeStyle = gradient;
            context.lineWidth = 0.8;
            context.beginPath();
            context.moveTo(this.x, this.y);
            context.lineTo(fragment.x, fragment.y);
            context.stroke();
          });

          // Draw particle based on type
          if (this.type === 'dot') this.drawDot(context);
          else if (this.type === 'stream') this.drawStream(context);
          else this.drawCluster(context);
        }
      }

      // Initialize fragments
      particlesRef.current = [];
      for (let i = 0; i < config.fragmentCount; i++) {
        particlesRef.current.push(new DataFragment(i));
      }

      const animate = (currentTime) => {
        if (isPaused) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        if (currentTime - lastFrameTime < frameInterval) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        lastFrameTime = currentTime;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particlesRef.current.forEach(fragment => {
          fragment.update();
          fragment.draw(ctx);
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // ===== DARK MODE: Infinity Mobius Strip =====
    else {
      // Keep existing dark mode code
      const config = {
        dotCount: window.innerWidth < 768 ? 400 : 800,
        dotSizeMin: 3,
        dotSizeMax: 8,
        infinityWidth: Math.min(canvas.width * 0.7, 900),
        infinityHeight: Math.min(canvas.height * 0.5, 500),
        centerX: canvas.width / 2,
        centerY: canvas.height / 2,
        speedMin: 0.0003,
        speedMax: 0.0015,
        mobiusRotationSpeed: 0.008,
        glowRadius: 20,
        trailLength: 5,
        perspectiveAngle: 25,
        tiltAngle: 15,
        depthScale: 0.6,
      };

      const colors = {
        dotColor: { r: 125, g: 90, b: 255 },
        glowColor: { r: 90, g: 210, b: 255 },
        trailColor: { r: 255, g: 255, b: 255 },
        flareColor: { r: 255, g: 255, b: 255 },
      };

      class Particle {
        constructor(index) {
          this.t = (index / config.dotCount) * Math.PI * 4;
          this.speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
          this.size = config.dotSizeMin + Math.random() * (config.dotSizeMax - config.dotSizeMin);
          this.phase = Math.random() * Math.PI * 2;
          this.trail = [];
          this.flareOffset = Math.random() * Math.PI * 2;
          this.flareSpeed = 0.02 + Math.random() * 0.03;
          this.flareIntensity = 0.3 + Math.random() * 0.7;
        }

        update() {
          this.t += this.speed;
          this.phase += config.mobiusRotationSpeed;
          this.flareOffset += this.flareSpeed;

          if (this.t > Math.PI * 4) this.t -= Math.PI * 4;
          if (this.flareOffset > Math.PI * 2) this.flareOffset -= Math.PI * 2;
        }

        getPosition() {
          const scale = 1.2;
          const a = config.infinityWidth / scale;
          const denominator = 1 + Math.sin(this.t) * Math.sin(this.t);

          let x = (a * Math.cos(this.t)) / denominator;
          let y = (a * Math.sin(this.t) * Math.cos(this.t)) / denominator;

          const depth = Math.sin(this.phase);
          const z = depth * config.depthScale;
          const perspectiveFactor = 1 / (1 - z * 0.5);
          const scale3D = 0.5 + perspectiveFactor * 0.5;

          const angleX = (config.tiltAngle * Math.PI) / 180;
          const yRotated = y * Math.cos(angleX) - z * 100 * Math.sin(angleX);

          const angleY = (config.perspectiveAngle * Math.PI) / 180;
          const xRotated = x * Math.cos(angleY) + z * 100 * Math.sin(angleY);

          x = xRotated * scale3D + config.centerX;
          y = yRotated * scale3D + config.centerY;

          return { x, y, depth, scale: scale3D, z };
        }

        draw(context) {
          const pos = this.getPosition();
          const depthOpacity = 0.2 + (pos.depth + 1) * 0.4;
          const zOpacity = pos.z > 0 ? 1.0 : 0.5 + pos.z;
          const opacity = depthOpacity * zOpacity;

          const colorMix = (this.t % (Math.PI * 2)) / (Math.PI * 2);
          const depthColorMix = (pos.z + 0.6) / 1.2;

          const r = Math.floor(colors.dotColor.r + (colors.glowColor.r - colors.dotColor.r) * colorMix * depthColorMix);
          const g = Math.floor(colors.dotColor.g + (colors.glowColor.g - colors.dotColor.g) * colorMix);
          const b = Math.floor(colors.dotColor.b + (colors.glowColor.b - colors.dotColor.b) * colorMix * (1 - depthColorMix * 0.3));

          const glowIntensity = pos.z > 0 ? 1.2 : 0.8;
          const gradient = context.createRadialGradient(
            pos.x, pos.y, 0,
            pos.x, pos.y, config.glowRadius * pos.scale * glowIntensity
          );
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.9})`);
          gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          context.fillStyle = gradient;
          context.beginPath();
          context.arc(pos.x, pos.y, config.glowRadius * pos.scale * glowIntensity, 0, Math.PI * 2);
          context.fill();

          const flareValue = Math.sin(this.flareOffset);
          const isFlaring = flareValue > 0.85;

          if (isFlaring) {
            const flareMagnitude = (flareValue - 0.85) / 0.15;
            const flareSize = config.glowRadius * 2.5 * pos.scale * flareMagnitude * this.flareIntensity;

            const flareGradient = context.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, flareSize);
            flareGradient.addColorStop(0, `rgba(${colors.flareColor.r}, ${colors.flareColor.g}, ${colors.flareColor.b}, ${flareMagnitude * 0.8})`);
            flareGradient.addColorStop(0.3, `rgba(${colors.flareColor.r}, ${colors.flareColor.g}, ${colors.flareColor.b}, ${flareMagnitude * 0.4})`);
            flareGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            context.fillStyle = flareGradient;
            context.beginPath();
            context.arc(pos.x, pos.y, flareSize, 0, Math.PI * 2);
            context.fill();

            context.save();
            context.globalAlpha = flareMagnitude * 0.6;
            context.strokeStyle = `rgba(${colors.flareColor.r}, ${colors.flareColor.g}, ${colors.flareColor.b}, 0.8)`;
            context.lineWidth = 2 * pos.scale;
            context.lineCap = 'round';

            const flareLength = flareSize * 1.5;
            context.beginPath();
            context.moveTo(pos.x - flareLength, pos.y);
            context.lineTo(pos.x + flareLength, pos.y);
            context.stroke();
            context.beginPath();
            context.moveTo(pos.x, pos.y - flareLength);
            context.lineTo(pos.x, pos.y + flareLength);
            context.stroke();
            context.restore();
          }

          const coreBrightness = isFlaring ? 1.3 : 1.0;
          context.fillStyle = `rgba(${Math.min(255, r * coreBrightness)}, ${Math.min(255, g * coreBrightness)}, ${Math.min(255, b * coreBrightness)}, ${opacity})`;
          context.beginPath();
          context.arc(pos.x, pos.y, this.size * pos.scale, 0, Math.PI * 2);
          context.fill();

          this.trail.unshift({ x: pos.x, y: pos.y, opacity: opacity * 0.3 });
          if (this.trail.length > config.trailLength) this.trail.pop();

          this.trail.forEach((point, index) => {
            const trailOpacity = point.opacity * (1 - index / config.trailLength);
            context.fillStyle = `rgba(${colors.trailColor.r}, ${colors.trailColor.g}, ${colors.trailColor.b}, ${trailOpacity})`;
            context.beginPath();
            context.arc(point.x, point.y, this.size * 0.5, 0, Math.PI * 2);
            context.fill();
          });
        }
      }

      particlesRef.current = [];
      for (let i = 0; i < config.dotCount; i++) {
        particlesRef.current.push(new Particle(i));
      }

      const animate = (currentTime) => {
        if (isPaused) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        if (currentTime - lastFrameTime < frameInterval) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        lastFrameTime = currentTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particlesRef.current.forEach(particle => {
          particle.update();
          particle.draw(ctx);
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsPaused(!entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );

    if (canvas) observer.observe(canvas);

    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [theme, isPaused]);

  return (
    <div className="matrix-infinity-wrapper">
      <canvas
        ref={canvasRef}
        className="matrix-infinity-canvas"
        aria-hidden="true"
        role="presentation"
      />
    </div>
  );
}
