const fs = require("node:fs");

const {
  initializeApp,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const PROJECT_ID = "demo-montseapp";

const TOKEN_FILE = "/tmp/montse-emulator-tokens.json";

const USERS = [
  "test-owner-montse",
  "test-developer",
  "test-patient",
];

function assertEmulatorEnvironment() {
  const expected = {
    GCLOUD_PROJECT: PROJECT_ID,
    GOOGLE_CLOUD_PROJECT: PROJECT_ID,
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    GOOGLE_APPLICATION_CREDENTIALS: "/dev/null",
  };

  for (const [key, value] of Object.entries(expected)) {
    if (process.env[key] !== value) {
      throw new Error(
        `Entorno no permitido: ${key}`
      );
    }
  }
}

async function createIdToken(auth, uid) {
  // Comprobamos que el usuario existe.
  await auth.getUser(uid);

  // Token personalizado firmado por el Auth Emulator.
  const customToken = await auth.createCustomToken(uid);

  // Intercambiamos el token personalizado por un ID token.
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.idToken) {
    throw new Error(
      `Error generando token para ${uid}: ` +
      JSON.stringify(data)
    );
  }

  // Comprobamos que pertenece al usuario esperado.
  const decoded = await auth.verifyIdToken(data.idToken);

  if (decoded.uid !== uid) {
    throw new Error(
      `El token no corresponde al usuario ${uid}`
    );
  }

  return data.idToken;
}

async function main() {
  assertEmulatorEnvironment();

  initializeApp({
    projectId: PROJECT_ID,
  });

  const auth = getAuth();

  const tokens = {};

  console.log("\n=== GENERANDO TOKENS DE PRUEBA ===\n");

  for (const uid of USERS) {
    tokens[uid] = await createIdToken(auth, uid);

    console.log(`✅ Token generado: ${uid}`);
  }

  // Los tokens no se guardan dentro del repositorio.
  fs.writeFileSync(
    TOKEN_FILE,
    JSON.stringify(tokens, null, 2),
    {
      mode: 0o600,
      flag: "w",
    }
  );

  fs.chmodSync(TOKEN_FILE, 0o600);

  console.log("\n✅ TOKENS GENERADOS CORRECTAMENTE");
  console.log("Archivo:", TOKEN_FILE);
  console.log("Usuarios:", USERS.length);
}

main().catch(error => {
  console.error("\n❌ ERROR:", error.message);
  process.exitCode = 1;
});
