import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [
  /(?:pub|prv)_(?:prod|test|stagtest)_[A-Za-z0-9]{16,}/,
  /(?:prod|test|stagtest)_(?:events|integrity)_[A-Za-z0-9]{16,}/,
  /(?:AKIA|ASIA)[A-Z0-9]{16}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const blocked = [];
for (const name of new Set(names)) {
  if (/(^|\/)\.env(?:\.|$)/.test(name) && !name.endsWith('.env.example')) {
    blocked.push(name);
    continue;
  }
  let body;
  try {
    if (!statSync(name).isFile()) continue;
    body = readFileSync(name, 'utf8');
  } catch { continue; }
  if (patterns.some(pattern => pattern.test(body))) blocked.push(name);
}
if (blocked.length) {
  console.error('Potential credentials detected in these files; values intentionally omitted:');
  blocked.forEach(name => console.error(`- ${name}`));
  process.exitCode = 1;
} else {
  console.log(`Secret-pattern scan passed for ${new Set(names).size} repository files.`);
}
