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

const OWNER_UID = "test-owner-montse";

async function callFunction(name, data) {
  assert.ok(tokens[OWNER_UID], "Falta token de Montse");

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

test("Validaciones de datos clínicos", async () => {
  // Crear un episodio exclusivo para estas pruebas.
  const created = await callFunction(
    "createPatientClinicalEpisode",
    {
      clientId: CLIENT_ID,
      title: `TEST VALIDACIONES ${Date.now()}`,
      reasonForConsultation: "Pruebas de validación",
      affectedArea: "Zona ficticia",
      observations: "Sin información real",
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

  const validData = {
    clientId: CLIENT_ID,
    episodeId,
    sessionDate: "2026-11-20",
    painLevel: 4,
    symptoms: "Síntomas ficticios",
    treatment: "Tratamiento ficticio",
    exercises: "Ejercicios ficticios",
    evolution: "Evolución ficticia",
  };

  const cases = [
    {
      name: "EVA superior a 10",
      changes: { painLevel: 11 },
    },
    {
      name: "EVA negativa",
      changes: { painLevel: -1 },
    },
    {
      name: "EVA decimal",
      changes: { painLevel: 4.5 },
    },
    {
      name: "EVA enviada como texto",
      changes: { painLevel: "4" },
    },
    {
      name: "Fecha inexistente",
      changes: { sessionDate: "2026-02-30" },
    },
    {
      name: "Formato de fecha incorrecto",
      changes: { sessionDate: "20/11/2026" },
    },
    {
      name: "Campo no autorizado",
      changes: { professionalId: "otro-profesional" },
    },
    {
      name: "Texto clínico demasiado largo",
      changes: { symptoms: "X".repeat(5001) },
    },
  ];

  for (const item of cases) {
    const response = await callFunction(
      "createPatientClinicalSession",
      {
        ...validData,
        ...item.changes,
      }
    );

    assert.equal(
      response.status,
      400,
      `${item.name}: ${JSON.stringify(response.body)}`
    );

    console.log(`  ✅ Rechazado: ${item.name}`);
  }

  // Ninguna petición inválida debe crear sesiones.
  const sessions = await episodeRef
    .collection("sessions")
    .get();

  assert.equal(
    sessions.size,
    0,
    "Se ha creado una sesión con datos inválidos"
  );

  // Tampoco deben existir eventos de creación de sesión.
  const events = await episodeRef
    .collection("events")
    .get();

  const sessionCreatedEvents = events.docs.filter(
    doc => doc.data().type === "session_created"
  );

  assert.equal(
    sessionCreatedEvents.length,
    0,
    "Se ha registrado una sesión inválida en la auditoría"
  );

  console.log("  ✅ No se crearon sesiones inválidas");
  console.log("  ✅ No se generaron eventos de sesión inválidos");
});
