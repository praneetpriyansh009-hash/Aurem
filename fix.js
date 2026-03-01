const fs = require('fs');
let code = fs.readFileSync('src/components/QuizAssessment.jsx', 'utf8');

// Fix spaces in className strings only!
// Match strings like this: className="something - something"
code = code.replace(/className=\{`([^`]+)`\}/g, (match, p1) => {
    return 'className={`' + p1.replace(/ - /g, '-') + '`}';
});

code = code.replace(/className=\"([^\"]+)\"/g, (match, p1) => {
    return 'className="' + p1.replace(/ - /g, '-') + '"';
});

// also fix backticks with spaces inside them
code = code.replace(/className=\'([^\']+)\'/g, (match, p1) => {
    return 'className=\'' + p1.replace(/ - /g, '-') + '\'';
});

fs.writeFileSync('src/components/QuizAssessment.jsx', code);
console.log("Fixed!");
