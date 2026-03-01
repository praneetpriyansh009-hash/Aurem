const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = [
    [/text-indigo-\d+/g, 'text-gold'],
    [/text-violet-\d+/g, 'text-gold'],
    [/text-purple-\d+/g, 'text-gold'],
    [/text-fuchsia-\d+/g, 'text-gold'],
    [/bg-indigo-\d+/g, 'bg-gold'],
    [/bg-violet-\d+/g, 'bg-gold'],
    [/bg-purple-\d+/g, 'bg-gold'],
    [/bg-fuchsia-\d+/g, 'bg-gold'],
    [/border-indigo-\d+/g, 'border-gold'],
    [/border-violet-\d+/g, 'border-gold'],
    [/border-purple-\d+/g, 'border-gold'],
    [/from-indigo-\d+/g, 'from-gold'],
    [/from-violet-\d+/g, 'from-gold'],
    [/from-purple-\d+/g, 'from-gold'],
    [/from-fuchsia-\d+/g, 'from-gold'],
    [/to-indigo-\d+/g, 'to-gold-light'],
    [/to-violet-\d+/g, 'to-gold-light'],
    [/to-purple-\d+/g, 'to-gold-light'],
    [/to-fuchsia-\d+/g, 'to-gold-light'],
    [/via-violet-\d+/g, 'via-gold'],
    [/via-purple-\d+/g, 'via-gold'],
    [/via-indigo-\d+/g, 'via-gold'],
    [/via-fuchsia-\d+/g, 'via-gold-light'],
    [/ring-indigo-\d+/g, 'ring-gold'],
    [/ring-violet-\d+/g, 'ring-gold'],
    [/shadow-indigo-\d+/g, 'shadow-gold'],
    [/shadow-violet-\d+/g, 'shadow-gold'],
    [/shadow-purple-\d+/g, 'shadow-gold'],
    [/focus:ring-violet-\d+/g, 'focus:ring-gold'],
    [/focus:border-violet-\d+/g, 'focus:border-gold'],
    [/hover:bg-indigo-\d+/g, 'hover:bg-gold/20'],
    [/hover:bg-violet-\d+/g, 'hover:bg-gold/20'],
    [/hover:from-indigo-\d+/g, 'hover:from-gold'],
    [/hover:from-violet-\d+/g, 'hover:from-gold'],
    [/hover:to-violet-\d+/g, 'hover:to-gold-light'],
    [/hover:to-purple-\d+/g, 'hover:to-gold-light'],
    [/hover:text-violet-\d+/g, 'hover:text-gold-light'],
    // Inline color hex replacements for SVG/style attributes
    [/#818cf8/g, '#c9a55a'],
    [/#6366f1/g, '#c9a55a'],
    [/#a78bfa/g, '#e0c07a'],
    [/#7c3aed/g, '#a89880'],
    [/#c084fc/g, '#e0c07a'],
    [/#8b5cf6/g, '#c9a55a'],
    [/#8B5CF6/g, '#c9a55a'],
    // rgba replacements
    [/rgba\(139,92,246/g, 'rgba(201,165,90'],
    [/rgba\(99,102,241/g, 'rgba(201,165,90'],
    [/rgba\(129,140,248/g, 'rgba(201,165,90'],
    [/rgba\(167,139,250/g, 'rgba(224,192,122'],
    [/rgba\(124,58,237/g, 'rgba(168,152,128'],
];

let fixedCount = 0;
for (const file of files) {
    const filepath = path.join(dir, file);
    let content = fs.readFileSync(filepath, 'utf8');
    const original = content;
    for (const [pattern, replacement] of replacements) {
        content = content.replace(pattern, replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log('FIXED:', file);
        fixedCount++;
    }
}
console.log(`\nDone. Fixed ${fixedCount} files.`);
