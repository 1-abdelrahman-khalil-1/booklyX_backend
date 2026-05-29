import fs from 'node:fs';
import path from 'node:path';

const openApiPath = path.resolve('openapi.yaml');
let content = fs.readFileSync(openApiPath, 'utf8');

function applyStep(stepNum) {
  const targetPath = `step_${stepNum}_target.txt`;
  const replacementPath = `step_${stepNum}_replacement.txt`;
  
  if (!fs.existsSync(targetPath) || !fs.existsSync(replacementPath)) {
    console.warn(`WARNING: Missing files for step ${stepNum}`);
    return false;
  }
  
  const target = fs.readFileSync(targetPath, 'utf8');
  const replacement = fs.readFileSync(replacementPath, 'utf8');
  
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log(`Successfully applied Step ${stepNum}!`);
    return true;
  } else {
    console.error(`ERROR: Target NOT found for Step ${stepNum}`);
    return false;
  }
}

// Re-apply Step 125, then Step 543, then Step 555
applyStep(125);
applyStep(543);
applyStep(555);

fs.writeFileSync(openApiPath, content, 'utf8');
console.log('Restoration complete!');
