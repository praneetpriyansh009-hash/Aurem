import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const StarryBackground = ({ density = 100, speed = 0.5, connectDistance = 120 }) => {
    const canvasRef = useRef(null);
    const { isDark, theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        // Calculate particles based on screen size
        const particleCount = Math.floor((canvas.width * canvas.height) / (15000 * (100 / density)));

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = (Math.random() - 0.5) * speed;
                this.radius = Math.random() * 2 + 0.5;
                this.baseAlpha = Math.random() * 0.5 + 0.2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
            }

            draw(ctx, colorPrefix) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `${colorPrefix}${this.baseAlpha})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const getColor = () => {
            if (theme === 'premium') return isDark ? 'rgba(201, 165, 90, ' : 'rgba(168, 132, 57, ';
            if (theme === 'vibrant') return 'rgba(108, 99, 255, ';
            return isDark ? 'rgba(255, 255, 255, ' : 'rgba(0, 0, 0, ';
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const colorPrefix = getColor();

            particles.forEach((particle, i) => {
                particle.update();
                particle.draw(ctx, colorPrefix);

                // Draw connections
                if (theme === 'vibrant' || theme === 'premium') {
                    for (let j = i + 1; j < particles.length; j++) {
                        const dx = particle.x - particles[j].x;
                        const dy = particle.y - particles[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < connectDistance) {
                            ctx.beginPath();
                            ctx.moveTo(particle.x, particle.y);
                            ctx.lineTo(particles[j].x, particles[j].y);
                            const opacity = (1 - (dist / connectDistance)) * 0.2;
                            ctx.strokeStyle = `${colorPrefix}${opacity})`;
                            ctx.stroke();
                        }
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isDark, theme, density, speed, connectDistance]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[-1]"
            style={{ opacity: 0.6 }}
        />
    );
};

export default StarryBackground;
