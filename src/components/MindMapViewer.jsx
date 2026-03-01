import React, { useState, useRef, useEffect } from 'react';
import { Network, Maximize2, Minimize2, ZoomIn, ZoomOut, Compass } from 'lucide-react';

const MindMapViewer = ({ data }) => {
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Tree Layout Logic (Simplified Horizontal Reingold-Tilford approach)
    // We strictly assume data is: { name: "", children: [...] }
    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 60;
    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 80;

    const computeLayout = (node, depth = 0, yOffset = 0) => {
        let currentY = yOffset;
        let childrenLayouts = [];
        let totalChildrenHeight = 0;

        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                const childLayout = computeLayout(child, depth + 1, currentY);
                childrenLayouts.push(childLayout);
                currentY += childLayout.height + VERTICAL_SPACING;
                totalChildrenHeight += childLayout.height + (index < node.children.length - 1 ? VERTICAL_SPACING : 0);
            });
        }

        const height = Math.max(NODE_HEIGHT, totalChildrenHeight);
        const x = depth * HORIZONTAL_SPACING;
        // The node's Y center should be the exact middle of all its children's Y centers
        let y = yOffset;
        if (childrenLayouts.length > 0) {
            const firstChildY = childrenLayouts[0].node.y;
            const lastChildY = childrenLayouts[childrenLayouts.length - 1].node.y;
            y = (firstChildY + lastChildY) / 2;
        } else {
            y = yOffset + (NODE_HEIGHT / 2);
        }

        return {
            node: { ...node, x, y, depth },
            children: childrenLayouts,
            height,
            width: NODE_WIDTH
        };
    };

    // Use memoization or effect to only compute once per data change
    const [layout, setLayout] = useState(null);
    useEffect(() => {
        if (data) {
            const l = computeLayout(data, 0, 0);
            // Auto-center root
            const rootY = l.node.y;
            setPan({ x: 100, y: -rootY + 300 }); // Roughly center horizontally and vertically
            setLayout(l);
        }
    }, [data]);

    // Pan & Zoom Handlers
    const handleWheel = (e) => {
        // e.preventDefault(); // Prevented by passive listener issues in React, managed via container CSS
        if (e.ctrlKey) {
            setScale(s => Math.min(Math.max(0.2, s - e.deltaY * 0.002), 3));
        } else {
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (!data || !layout) return null;

    // SVG Line Generator (Smooth Bezier)
    const renderLinks = (nodeLayout) => {
        let lines = [];
        if (nodeLayout.children && nodeLayout.children.length > 0) {
            const startX = nodeLayout.node.x + NODE_WIDTH;
            const startY = nodeLayout.node.y;

            nodeLayout.children.forEach(childLayout => {
                const endX = childLayout.node.x;
                const endY = childLayout.node.y;

                // Cubic bezier curve for organic feel
                const controlPointX = (startX + endX) / 2;
                const pathData = `M ${startX} ${startY} C ${controlPointX} ${startY}, ${controlPointX} ${endY}, ${endX} ${endY}`;

                // Color depth based
                const strokeColor = nodeLayout.node.depth === 0 ? "url(#primaryGradient)" : "rgba(99, 102, 241, 0.3)";

                lines.push(
                    <path
                        key={`link-${startX}-${startY}-${endX}-${endY}`}
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={nodeLayout.node.depth === 0 ? 3 : 2}
                        className="transition-all duration-500 stroke-dasharray animate-dash"
                    />
                );

                // Recursively render children links
                lines = lines.concat(renderLinks(childLayout));
            });
        }
        return lines;
    };

    const renderNodes = (nodeLayout) => {
        let nodes = [];

        const isRoot = nodeLayout.node.depth === 0;

        nodes.push(
            <div
                key={`node-${nodeLayout.node.x}-${nodeLayout.node.y}`}
                className={`absolute p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center text-center cursor-default
                    ${isRoot ?
                        'bg-gradient-to-br from-indigo-600 to-violet-700 border-indigo-400/50 text-white font-black shadow-indigo-500/30 ring-4 ring-indigo-500/20' :
                        'bg-slate-900/80 border-slate-700/80 text-slate-200 font-bold hover:border-indigo-500/50 hover:bg-slate-800'
                    }`}
                style={{
                    width: NODE_WIDTH,
                    minHeight: NODE_HEIGHT,
                    left: nodeLayout.node.x,
                    top: nodeLayout.node.y - (NODE_HEIGHT / 2),
                    transformOrigin: 'center left'
                }}
            >
                {isRoot && <Compass className="absolute -top-3 -right-3 w-8 h-8 text-amber-400 drop-shadow-lg" />}
                <p className="text-sm tracking-wide leading-snug">{nodeLayout.node.name || nodeLayout.node.label || nodeLayout.node.topic}</p>
            </div>
        );

        if (nodeLayout.children) {
            nodeLayout.children.forEach(child => {
                nodes = nodes.concat(renderNodes(child));
            });
        }

        return nodes;
    };

    return (
        <div className="relative w-full h-[600px] bg-[#0b0f19] rounded-3xl border border-slate-800/60 overflow-hidden shadow-2xl flex flex-col group">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-20 flex gap-2 p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><ZoomIn className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-slate-700 my-auto"></div>
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.2))} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><ZoomOut className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-slate-700 my-auto"></div>
                <button onClick={() => { setScale(1); setPan({ x: 100, y: -layout.node.y + 300 }); }} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-center transition-colors tooltip"><Maximize2 className="w-5 h-5" /></button>
            </div>

            {/* Instruction overlay */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-800">
                <Network className="w-4 h-4 text-indigo-500" />
                Drag to pan • Scroll to zoom
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className={`flex-1 w-full h-full relative overflow-hidden outline-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `radial-gradient(#4f46e5 1px, transparent 1px)`,
                        backgroundSize: `${40 * scale}px ${40 * scale}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`
                    }}
                />

                {/* Transform Layer */}
                <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }} className="absolute inset-0 pointer-events-none">

                    {/* SVG Connections */}
                    <svg className="absolute inset-0 overflow-visible" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                        <defs>
                            <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                        {renderLinks(layout)}
                    </svg>

                    {/* HTML Nodes */}
                    <div className="absolute top-0 left-0 pointer-events-auto">
                        {renderNodes(layout)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MindMapViewer;
