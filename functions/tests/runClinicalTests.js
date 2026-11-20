const { spawnSync } = require("node:child_process");

const PROJECT_ID = "demo-montseapp";

const expectedEnv = {
  GCLOUD_PROJECT: PROJECT_ID,
  GOOGLE_CLOUD_PROJECT: PROJECT_ID,
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  GOOGLE_APPLICATION_CREDENTIALS: "/dev/null",
};

for (const [key, value] of Object.entries(expectedEnv)) {
  if (process.env[key] !== value) {
    console.error(`❌ Entorno no permitido: ${key}`);
    process.exit(1);
  }
}

const tests = [
  "tests/clinicalSecurity.test.js",
  "tests/clinicalEpisodes.test.js",
  "tests/clinicalEpisodeLifecycle.test.js",
  "tests/clinicalSessions.test.js",
  "tests/clinicalValidation.test.js",
  "tests/clinicalAdvancedSecurity.test.js",
  "tests/clinicalFirestoreSecurity.test.js",
  "tests/clinicalAudit.test.js",
];

console.log("\n=== PRUEBAS CLÍNICAS MONTSE_APP ===\n");

const result = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", ...tests],
  {
    stdio: "inherit",
    env: process.env,
  }
);

if (result.error) {
  console.error("❌ Error ejecutando las pruebas:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
