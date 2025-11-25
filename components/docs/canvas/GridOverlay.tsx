import React, { useCallback, useEffect, useRef } from 'react';
import { snapToGrid } from '../../../lib/docs/layoutUtils';

interface GridOverlayProps {
    show: boolean;
    zoom: number;
    gridSize: number;
    majorLineEvery?: number;
    children: React.ReactNode;
    className?: string;
}

/**
 * Lightweight canvas grid overlay with requestAnimationFrame throttling.
 */
export const GridOverlay: React.FC<GridOverlayProps> = ({
    show,
    zoom,
    gridSize,
    majorLineEvery = 4,
    children,
    className = '',
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);

    const drawGrid = useCallback(() => {
        if (!show) {
            return;
        }
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) {
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) {
            return;
        }

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const scaledStep = Math.max(4, snapToGrid((gridSize * zoom) / 100, 1));
        const majorGap = scaledStep * majorLineEvery;

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        for (let x = 0.5; x <= width; x += scaledStep) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0.5; y <= height; y += scaledStep) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
        for (let x = 0.5; x <= width; x += majorGap) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0.5; y <= height; y += majorGap) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    }, [gridSize, majorLineEvery, show, zoom]);

    const scheduleDraw = useCallback(() => {
        if (!show) {
            return;
        }
        if (typeof window === 'undefined' || typeof window.requestAnimationFrame === 'undefined') {
            drawGrid();
            return;
        }
        if (rafRef.current) {
            window.cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = window.requestAnimationFrame(() => {
            drawGrid();
        });
    }, [drawGrid, show]);

    useEffect(() => {
        if (!show) {
            return;
        }
        scheduleDraw();
    }, [gridSize, show, scheduleDraw, zoom]);

    useEffect(() => {
        if (!show || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(() => scheduleDraw());
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [scheduleDraw, show]);

    useEffect(() => {
        return () => {
            if (rafRef.current && typeof window !== 'undefined') {
                window.cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {show && (
                <canvas
                    ref={canvasRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10 opacity-70 mix-blend-multiply"
                />
            )}
            <div className="relative z-20">{children}</div>
        </div>
    );
};
