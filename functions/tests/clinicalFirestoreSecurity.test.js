const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const PROJECT_ID = "demo-montseapp";
const DATABASE_ID = "default";

const expectedEnv = {
  GCLOUD_PROJECT: PROJECT_ID,
  GOOGLE_CLOUD_PROJECT: PROJECT_ID,
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  GOOGLE_APPLICATION_CREDENTIALS: "/dev/null",
};

for (const [key, value] of Object.entries(expectedEnv)) {
  if (process.env[key] !== value) {
    throw new Error(`Entorno no permitido: ${key}`);
  }
}

const tokens = JSON.parse(
  fs.readFileSync("/tmp/montse-emulator-tokens.json", "utf8")
);

const BASE_URL =
  `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}` +
  `/databases/${DATABASE_ID}/documents`;

async function firestoreRequest(path, uid, method = "GET") {
  const headers = {
    "Content-Type": "application/json",
  };

  if (uid) {
    assert.ok(tokens[uid], `Falta token de ${uid}`);
    headers.Authorization = `Bearer ${tokens[uid]}`;
  }

  const response = await fetch(
    `${BASE_URL}/${path}`,
    {
      method,
      headers,
      ...(method === "PATCH"
        ? {
            body: JSON.stringify({
              fields: {
                title: {
                  stringValue: "MODIFICACIÓN NO AUTORIZADA",
                },
              },
            }),
          }
        : {}),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("Firestore bloquea accesos clínicos directos", async () => {
  const episodePath =
    "centers/montse-main/clients/test-patient-a/" +
    "clinicalEpisodes/episodio-inexistente";

  const sessionPath =
    episodePath + "/sessions/sesion-inexistente";

  const cases = [
    {
      name: "Propietario no puede leer episodios directamente",
      uid: "test-owner-montse",
      path: episodePath,
      method: "GET",
    },
    {
      name: "Desarrollador no puede leer episodios directamente",
      uid: "test-developer",
      path: episodePath,
      method: "GET",
    },
    {
      name: "Paciente no puede leer episodios directamente",
      uid: "test-patient",
      path: episodePath,
      method: "GET",
    },
    {
      name: "Propietario no puede modificar episodios directamente",
      uid: "test-owner-montse",
      path: episodePath,
      method: "PATCH",
    },
    {
      name: "Paciente no puede leer sesiones directamente",
      uid: "test-patient",
      path: sessionPath,
      method: "GET",
    },
    {
      name: "Usuario anónimo no puede leer episodios",
      uid: null,
      path: episodePath,
      method: "GET",
    },
  ];

  for (const item of cases) {
    const response = await firestoreRequest(
      item.path,
      item.uid,
      item.method
    );

    assert.equal(
      response.status,
      403,
      `${item.name}: ${JSON.stringify(response.body)}`
    );

    console.log(`  ✅ ${item.name}`);
  }
});


test("Firestore bloquea documentos clínicos existentes", async () => {
  const { initializeApp, getApps } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ projectId: PROJECT_ID });
  }

  // MONTSE_APP utiliza la base de datos llamada "default".
  const db = getFirestore("default");

  const clientRef = db
    .collection("centers")
    .doc("montse-main")
    .collection("clients")
    .doc("test-patient-a");

  // Buscar un episodio que ya exista.
  const episodes = await clientRef
    .collection("clinicalEpisodes")
    .limit(100)
    .get();

  assert.ok(
    !episodes.empty,
    "No existen episodios de prueba. Ejecuta primero las pruebas clínicas."
  );

  const episode = episodes.docs[0];

  const episodePath =
    `centers/montse-main/clients/test-patient-a/` +
    `clinicalEpisodes/${episode.id}`;

  const ownerRead = await firestoreRequest(
    episodePath,
    "test-owner-montse"
  );

  assert.equal(
    ownerRead.status,
    403,
    JSON.stringify(ownerRead.body)
  );

  console.log("  ✅ Propietario bloqueado al leer episodio existente");

  const developerRead = await firestoreRequest(
    episodePath,
    "test-developer"
  );

  assert.equal(
    developerRead.status,
    403,
    JSON.stringify(developerRead.body)
  );

  console.log("  ✅ Desarrollador bloqueado al leer episodio existente");

  const patientRead = await firestoreRequest(
    episodePath,
    "test-patient"
  );

  assert.equal(
    patientRead.status,
    403,
    JSON.stringify(patientRead.body)
  );

  console.log("  ✅ Paciente bloqueado al leer episodio existente");

  const ownerWrite = await firestoreRequest(
    episodePath,
    "test-owner-montse",
    "PATCH"
  );

  assert.equal(
    ownerWrite.status,
    403,
    JSON.stringify(ownerWrite.body)
  );

  console.log("  ✅ Modificación directa del episodio bloqueada");

  // Buscar una sesión real entre los episodios existentes.
  let existingSession = null;
  let sessionEpisodeId = null;

  for (const episodeDoc of episodes.docs) {
    const sessions = await episodeDoc.ref
      .collection("sessions")
      .limit(1)
      .get();

    if (!sessions.empty) {
      existingSession = sessions.docs[0];
      sessionEpisodeId = episodeDoc.id;
      break;
    }
  }

  assert.ok(
    existingSession,
    "No existen sesiones de prueba. Ejecuta primero las pruebas clínicas."
  );

  const sessionPath =
    `centers/montse-main/clients/test-patient-a/` +
    `clinicalEpisodes/${sessionEpisodeId}/` +
    `sessions/${existingSession.id}`;

  const sessionRead = await firestoreRequest(
    sessionPath,
    "test-patient"
  );

  assert.equal(
    sessionRead.status,
    403,
    JSON.stringify(sessionRead.body)
  );

  console.log("  ✅ Paciente bloqueado al leer sesión existente");

  // Comprobar que el intento de escritura no alteró el episodio.
  const episodeAfter = await episode.ref.get();

  assert.equal(
    episodeAfter.data().title,
    episode.data().title,
    "El episodio fue modificado por una petición no autorizada"
  );

  console.log("  ✅ Documento original sin modificaciones");
});
