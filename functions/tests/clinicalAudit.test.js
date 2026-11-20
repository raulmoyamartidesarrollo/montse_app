const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "demo-montseapp";
const CENTER_ID = "montse-main";
const CLIENT_ID = "test-patient-a";
const OWNER_UID = "test-owner-montse";

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

async function callFunction(name, data) {
  assert.ok(tokens[OWNER_UID], "Falta token del propietario");

  const response = await fetch(
    `http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens[OWNER_UID]}`,
      },
      body: JSON.stringify({ data }),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("Auditoría de creación de sesiones clínicas", async () => {
  // Crear un episodio ficticio exclusivo para esta prueba.
  const createdEpisode = await callFunction(
    "createPatientClinicalEpisode",
    {
      clientId: CLIENT_ID,
      title: `TEST AUDITORÍA ${Date.now()}`,
      reasonForConsultation: "Comprobación de auditoría",
      affectedArea: "Zona ficticia",
      observations: "Sin información real",
    }
  );

  assert.equal(
    createdEpisode.status,
    200,
    JSON.stringify(createdEpisode.body)
  );

  const episodeId = createdEpisode.body?.result?.episodeId;

  assert.ok(episodeId, "No se recibió episodeId");

  const episodeRef = db
    .collection("centers")
    .doc(CENTER_ID)
    .collection("clients")
    .doc(CLIENT_ID)
    .collection("clinicalEpisodes")
    .doc(episodeId);

  const sessionData = {
    clientId: CLIENT_ID,
    episodeId,
    sessionDate: "2026-11-20",
    painLevel: 4,
    symptoms: "Molestias ficticias",
    treatment: "Tratamiento de prueba",
    exercises: "Ejercicios de prueba",
    evolution: "Evolución favorable ficticia",
  };

  // Crear la sesión mediante la Cloud Function.
  const createdSession = await callFunction(
    "createPatientClinicalSession",
    sessionData
  );

  assert.equal(
    createdSession.status,
    200,
    JSON.stringify(createdSession.body)
  );

  // Localizar la sesión creada dentro de este episodio.
  const sessions = await episodeRef
    .collection("sessions")
    .get();

  assert.equal(
    sessions.size,
    1,
    "Se esperaba exactamente una sesión"
  );

  const sessionDoc = sessions.docs[0];
  const session = sessionDoc.data();
  const sessionId = sessionDoc.id;

  assert.equal(session.professionalId, OWNER_UID);
  assert.equal(session.sessionDate, sessionData.sessionDate);
  assert.equal(session.painLevel, sessionData.painLevel);
  assert.equal(session.symptoms, sessionData.symptoms);
  assert.equal(session.treatment, sessionData.treatment);
  assert.equal(session.exercises, sessionData.exercises);
  assert.equal(session.evolution, sessionData.evolution);

  console.log("  ✅ Profesional y datos clínicos verificados");

  assert.ok(
    session.createdAt,
    "Falta la fecha de creación"
  );

  console.log("  ✅ Fecha de creación registrada");

  // Comprobar auditoría dentro de la sesión.
  const sessionEvents = await sessionDoc.ref
    .collection("events")
    .get();

  const createdEvent = sessionEvents.docs.find(
    doc => doc.data().type === "created"
  );

  assert.ok(
    createdEvent,
    "Falta evento created en la sesión"
  );

  assert.equal(
    createdEvent.data().performedBy,
    OWNER_UID
  );

  console.log("  ✅ Auditoría de sesión verificada");

  // Comprobar auditoría dentro del episodio.
  const episodeEvents = await episodeRef
    .collection("events")
    .get();

  const sessionCreatedEvent = episodeEvents.docs.find(
    doc =>
      doc.data().type === "session_created" &&
      doc.data().sessionId === sessionId
  );

  assert.ok(
    sessionCreatedEvent,
    "Falta evento session_created en el episodio"
  );

  assert.equal(
    sessionCreatedEvent.data().performedBy,
    OWNER_UID
  );

  assert.equal(
    sessionCreatedEvent.data().sessionDate,
    sessionData.sessionDate
  );

  console.log("  ✅ Auditoría del episodio verificada");
  console.log("  ✅ Identificador de sesión relacionado correctamente");
});
