// Prints, at the start of every build, which environment the build runs in and
// whether each lead-capture credential is set, empty or unset. It never prints
// a value. On a publication Preview (the `seo-review` custom environment) all
// four must be empty or unset; the build fails if one is set there.

const KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'RESEND_API_KEY', 'GHL_WEBHOOK_URL'];
const state = key => (process.env[key] === undefined ? 'unset' : process.env[key] === '' ? 'empty' : 'set');
const target = process.env.VERCEL_TARGET_ENV ?? process.env.VERCEL_ENV ?? 'local';
const branch = process.env.VERCEL_GIT_COMMIT_REF ?? '-';

console.log(`Isolation probe: target=${target} env=${process.env.VERCEL_ENV ?? 'local'} branch=${branch} ${KEYS.map(key => `${key}=${state(key)}`).join(' ')}`);

if (target === 'seo-review') {
  const leaking = KEYS.filter(key => state(key) === 'set');
  if (leaking.length) {
    console.error(`A publication Preview must not hold lead-capture credentials: ${leaking.join(', ')} set. Fix the seo-review environment variables before building.`);
    process.exit(1);
  }
}
