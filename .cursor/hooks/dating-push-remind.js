/**
 * beforeSubmitPrompt — user said "push" in the Dating repo.
 * Inject the git + both Docker images + ECR (+ ECS) playbook.
 */
const fs = require('fs');

let input = '';
try {
  input = fs.readFileSync(0, 'utf8');
} catch {
  process.stdout.write('{}');
  process.exit(0);
}

let payload = {};
try {
  payload = JSON.parse(input || '{}');
} catch {
  process.stdout.write('{}');
  process.exit(0);
}

const text = [
  payload.prompt,
  payload.command,
  payload.content,
  payload.user_prompt,
  typeof payload.message === 'string' ? payload.message : '',
]
  .filter(Boolean)
  .join('\n');

const t = String(text).trim();
const isPush =
  /^(push|push it|push now)(\s*[.!]?)?$/i.test(t) ||
  /^push\s+(to\s+)?(git|aws|docker|ecr|prod|production|both|images?)\b/i.test(t);

if (!isPush) {
  process.stdout.write('{}');
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    additional_context: [
      'Dating PUSH: follow project skill dating-push (read .cursor/skills/dating-push/SKILL.md now).',
      '1) git: commit dating source if dirty (never terraform.tfvars, .env, secrets, tfplan); then git push. No force-push main.',
      '2) Docker linux/amd64: dating-api AND dating-ui → ECR eu-central-1 907390934996.dkr.ecr.eu-central-1.amazonaws.com. Tag git SHA + latest.',
      'UI build-args: API_PROXY_TARGET=http://dating-api.internal:3001 NEXT_PUBLIC_ADMIN_ENABLED=0 NEXT_PUBLIC_GOOGLE_CLIENT_ID from gitignored terraform.tfvars (do not print the id).',
      '3) Point ECS dating-dev-api and dating-dev-ui at the new images (services ignore Terraform task_definition). Profile pizza. Never food-*.',
      'Consent hook may ask before docker push / ecs update-service.',
    ].join(' '),
  })
);
process.exit(0);
