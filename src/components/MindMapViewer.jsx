import React, { useEffect, useRef } from 'react';
// I should use a simple SVG recursive renderer instead of adding D3 dependency if possible.
// Or I can use a simple tree layout algorithm.

// Let's build a simple SVG renderer using flexbox-like logic or simple recursion.

const MindMapNode = ({ node, depth = 0, x, y, parentX, parentY }) => {
    // This is getting complicated to layout manually without a library.
    // Let's use a simplified list-based view that LOOKS like a mind map using CSS connectors.
    // OR just use a simple recursive component.
    return (
        <div className="mm-node-wrapper" style={{ marginLeft: depth * 20 }}>
            {/* Connection line would go here */}
            <div className="mm-node-content">
                {node.name}
            </div>
            {node.children && node.children.map((child, i) => (
                <MindMapNode key={i} node={child} depth={depth + 1} />
            ))}
        </div>
    );
};

// Actually, the user asked for Markmap.js in the plan but I said "No external library for now" in Phase 2 plan.
// "Pure CSS/SVG implementation"
// Let's do a nice CSS tree.

const MindMapViewer = ({ data }) => {
    if (!data) return null;

    return (
        <div className="mindmap-container p-8 overflow-auto bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[500px]">
            <div className="mm-tree">
                <TreeNode node={data} isRoot={true} />
            </div>
            <style>{`
                .mm-tree {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .mm-node {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    padding-top: 20px;
                }
                .mm-content {
                    padding: 10px 16px;
                    border-radius: 99px;
                    border: 1px solid var(--border-color, #e2e8f0);
                    background: var(--bg-color, white);
                    font-size: 14px;
                    font-weight: 500;
                    white-space: nowrap;
                    z-index: 2;
                    position: relative;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: all 0.2s;
                    color: var(--text-color, #0f172a);
                }
                .dark .mm-content {
                    --border-color: #334155;
                    --bg-color: #1e293b;
                    --text-color: #f1f5f9;
                }
                .mm-root-content {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    font-weight: 700;
                    padding: 12px 24px;
                }
                .mm-children {
                    display: flex;
                    flex-direction: row;
                    padding-top: 20px;
                    position: relative;
                    gap: 20px;
                }
                .mm-children::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 1px;
                    height: 20px;
                    background: #cbd5e1;
                }
                .dark .mm-children::before { background: #475569; }
                
                /* Horizontal connector */
                .mm-children::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: calc(0% + 10px); /* Adjust based on first/last child centers - simplified here */
                    right: calc(0% + 10px);
                    height: 1px;
                    background: #cbd5e1;
                    /* This naive approach for horizontal line needs JS to calculate exact widths or specific structure */
                    /* Let's ignore the horizontal bar for pure CSS simplicity and just use vertical lines from parent */
                }

                /* Better simplified tree without horizontal connecting bar issues: */
                .tree ul {
                    padding-top: 20px; position: relative;
                    transition: all 0.5s;
                    display: flex; justify-content: center; gap: 10px;
                }
                .tree li {
                    float: left; text-align: center;
                    list-style-type: none;
                    position: relative;
                    padding: 20px 5px 0 5px;
                    transition: all 0.5s;
                }
                .tree li::before, .tree li::after {
                    content: ''; position: absolute; top: 0; right: 50%;
                    border-top: 1px solid #ccc; width: 50%; height: 20px;
                }
                .tree li::after {
                    right: auto; left: 50%;
                    border-left: 1px solid #ccc;
                }
                .tree li:only-child::after, .tree li:only-child::before {
                    display: none;
                }
                .tree li:only-child { padding-top: 0; }
                .tree li:first-child::before, .tree li:last-child::after {
                    border: 0 none;
                }
                .tree li:last-child::before{
                    border-right: 1px solid #ccc;
                    border-radius: 0 5px 0 0;
                }
                .tree li:first-child::after{
                    border-radius: 5px 0 0 0;
                }
                .tree ul ul::before{
                    content: ''; position: absolute; top: 0; left: 50%;
                    border-left: 1px solid #ccc; width: 0; height: 20px;
                }
                .tree a {
                    border: 1px solid #ccc; padding: 10px 15px;
                    text-decoration: none; color: #666;
                    font-family: arial, verdana, tahoma;
                    font-size: 11px; display: inline-block;
                    border-radius: 5px; transition: all 0.5s;
                    background: white;
                }
                
                .dark .tree li::before, .dark .tree li::after, .dark .tree ul ul::before {
                    border-color: #475569;
                }
                .dark .tree a {
                    background: #1e293b; color: #f1f5f9; border-color: #334155;
                }
                .dark .tree a:hover {
                    background: #334155; color: white;
                }
                .tree-root { background: linear-gradient(135deg, #6366f1, #a855f7) !important; color: white !important; border: none !important; font-weight: bold; }
            `}</style>

            <div className="tree">
                <ul>
                    <TreeRecursive node={data} isRoot />
                </ul>
            </div>
        </div>
    );
};

const TreeRecursive = ({ node, isRoot }) => {
    return (
        <li>
            <a href="#" onClick={(e) => e.preventDefault()} className={isRoot ? 'tree-root' : ''}>
                {node.name || node.label || node.topic}
            </a>
            {node.children && node.children.length > 0 && (
                <ul>
                    {node.children.map((child, index) => (
                        <TreeRecursive key={index} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export default MindMapViewer;
