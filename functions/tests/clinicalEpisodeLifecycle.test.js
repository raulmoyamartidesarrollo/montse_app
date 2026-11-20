const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "demo-montseapp";
const CENTER_ID = "montse-main";
const CLIENT_ID = "test-patient-a";

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

initializeApp({ projectId: PROJECT_ID });

const db = getFirestore("default");

const tokens = JSON.parse(
  fs.readFileSync("/tmp/montse-emulator-tokens.json", "utf8")
);

async function callFunction(name, uid, data) {
  const response = await fetch(
    `http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens[uid]}`,
      },
      body: JSON.stringify({ data }),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("Ciclo completo: crear, cerrar, bloquear sesión y reabrir", async () => {
  const uid = "test-owner-montse";

  assert.ok(tokens[uid], "Falta token de Montse");

  // 1. Crear episodio ficticio.
  const created = await callFunction(
    "createPatientClinicalEpisode",
    uid,
    {
      clientId: CLIENT_ID,
      title: `TEST CICLO CLÍNICO ${Date.now()}`,
      reasonForConsultation: "Prueba de cierre y reapertura",
      affectedArea: "Zona ficticia",
      observations: "Datos de prueba",
    }
  );

  assert.equal(
    created.status,
    200,
    JSON.stringify(created.body)
  );

  const episodeId = created.body?.result?.episodeId;

  assert.ok(episodeId, "No se recibió episodeId");

  const episodeRef = db
    .collection("centers")
    .doc(CENTER_ID)
    .collection("clients")
    .doc(CLIENT_ID)
    .collection("clinicalEpisodes")
    .doc(episodeId);

  // 2. Cerrar episodio.
  const closed = await callFunction(
    "closePatientClinicalEpisode",
    uid,
    {
      clientId: CLIENT_ID,
      episodeId,
      closingReason: "Fin de tratamiento ficticio",
    }
  );

  assert.equal(
    closed.status,
    200,
    JSON.stringify(closed.body)
  );

  let episode = await episodeRef.get();

  assert.equal(episode.data().status, "closed");

  // 3. Intentar crear sesión en episodio cerrado.
  const blockedSession = await callFunction(
    "createPatientClinicalSession",
    uid,
    {
      clientId: CLIENT_ID,
      episodeId,
      sessionDate: "2026-11-20",
      painLevel: 3,
      symptoms: "Síntomas ficticios",
      treatment: "Tratamiento ficticio",
      exercises: "Ejercicios ficticios",
      evolution: "Evolución ficticia",
    }
  );

  assert.equal(
    blockedSession.status,
    400,
    JSON.stringify(blockedSession.body)
  );

  assert.equal(
    blockedSession.body?.error?.status,
    "FAILED_PRECONDITION"
  );

  const sessionsWhileClosed = await episodeRef
    .collection("sessions")
    .get();

  assert.equal(
    sessionsWhileClosed.size,
    0,
    "Se ha creado una sesión en un episodio cerrado"
  );

  // 4. Reabrir episodio.
  const reopened = await callFunction(
    "reopenPatientClinicalEpisode",
    uid,
    {
      clientId: CLIENT_ID,
      episodeId,
    }
  );

  assert.equal(
    reopened.status,
    200,
    JSON.stringify(reopened.body)
  );

  episode = await episodeRef.get();

  assert.equal(episode.data().status, "open");

  // 5. Crear una sesión después de reabrir.
  const newSession = await callFunction(
    "createPatientClinicalSession",
    uid,
    {
      clientId: CLIENT_ID,
      episodeId,
      sessionDate: "2026-11-20",
      painLevel: 3,
      symptoms: "Dolor ficticio",
      treatment: "Tratamiento de prueba",
      exercises: "Ejercicios de prueba",
      evolution: "Evolución favorable ficticia",
    }
  );

  assert.equal(
    newSession.status,
    200,
    JSON.stringify(newSession.body)
  );

  const sessionsAfterReopen = await episodeRef
    .collection("sessions")
    .get();

  assert.equal(
    sessionsAfterReopen.size,
    1,
    "Debería existir una sesión después de reabrir"
  );

  // 6. Comprobar auditoría.
  const audit = await episodeRef
    .collection("events")
    .get();

  const eventTypes = audit.docs.map(
    doc => doc.data().type
  );

  assert.ok(
    eventTypes.includes("created"),
    "Falta evento created"
  );

  assert.ok(
    eventTypes.includes("closed"),
    "Falta evento closed"
  );

  assert.ok(
    eventTypes.includes("reopened"),
    "Falta evento reopened"
  );

  assert.ok(
    eventTypes.includes("session_created"),
    "Falta evento session_created"
  );

  console.log("  ✅ Sesión creada después de reabrir");
  console.log("  ✅ Auditoría de sesión verificada");

  console.log("  ✅ Episodio creado:", episodeId);
  console.log("  ✅ Cierre registrado");
  console.log("  ✅ Sesión bloqueada durante el cierre");
  console.log("  ✅ Episodio reabierto");
  console.log("  ✅ Auditoría verificada");
});
