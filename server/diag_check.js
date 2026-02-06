import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aiPath = path.join(__dirname, 'routes', 'ai.js');
console.log(`Checking AI Route File at: ${aiPath}`);

if (fs.existsSync(aiPath)) {
    const content = fs.readFileSync(aiPath, 'utf8');
    console.log("--- START OF FILE CONTENT ---");
    console.log(content.substring(0, 500)); // First 500 chars
    console.log("--- END OF FILE CONTENT ---");

    if (content.includes('callAIEndpoint')) {
        console.log("SUCCESS: File contains new 'Raw Fetch' logic.");
    } else {
        console.log("FAILURE: File still contains OLD SDK logic.");
    }
} else {
    console.log("ERROR: File not found at this path!");
}
