const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "demo-montseapp";
const CENTER_ID = "montse-main";

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
  const headers = {
    "Content-Type": "application/json",
  };

  if (uid) {
    assert.ok(tokens[uid], `Falta token de ${uid}`);
    headers.Authorization = `Bearer ${tokens[uid]}`;
  }

  const response = await fetch(
    `http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/${name}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("Permisos de consulta de sesiones clínicas", async () => {
  // Creamos un episodio ficticio para cada paciente.
  // El paciente B no está marcado como test, pero todos
  // los datos existen exclusivamente en el emulador.

  const episodeIds = {};

  for (const clientId of [
    "test-patient-a",
    "test-patient-b",
  ]) {
    const response = await callFunction(
      "createPatientClinicalEpisode",
      "test-owner-montse",
      {
        clientId,
        title: `TEST SESIONES ${Date.now()}`,
        reasonForConsultation: "Prueba automatizada",
        affectedArea: "Zona ficticia",
        observations: "Sin datos reales",
      }
    );

    assert.equal(
      response.status,
      200,
      JSON.stringify(response.body)
    );

    const episodeId = response.body?.result?.episodeId;

    assert.ok(episodeId, "Falta episodeId");

    episodeIds[clientId] = episodeId;

    // Creamos una sesión mediante la función real.
    const session = await callFunction(
      "createPatientClinicalSession",
      "test-owner-montse",
      {
        clientId,
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
      session.status,
      200,
      JSON.stringify(session.body)
    );

    // Comprobamos que realmente se guardó.
    const sessions = await db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("clients")
      .doc(clientId)
      .collection("clinicalEpisodes")
      .doc(episodeId)
      .collection("sessions")
      .get();

    assert.equal(sessions.size, 1);
  }

  const cases = [
    {
      name: "Montse consulta sesiones A",
      uid: "test-owner-montse",
      clientId: "test-patient-a",
      expected: 200,
    },
    {
      name: "Montse consulta sesiones B",
      uid: "test-owner-montse",
      clientId: "test-patient-b",
      expected: 200,
    },
    {
      name: "Desarrollador consulta sesiones ficticias",
      uid: "test-developer",
      clientId: "test-patient-a",
      expected: 200,
    },
    {
      name: "Desarrollador bloqueado en paciente B",
      uid: "test-developer",
      clientId: "test-patient-b",
      expected: 403,
    },
    {
      name: "Paciente bloqueado en sesiones A",
      uid: "test-patient",
      clientId: "test-patient-a",
      expected: 403,
    },
    {
      name: "Paciente bloqueado en sesiones B",
      uid: "test-patient",
      clientId: "test-patient-b",
      expected: 403,
    },
    {
      name: "Acceso sin autenticación bloqueado",
      uid: null,
      clientId: "test-patient-a",
      expected: 401,
    },
  ];

  for (const item of cases) {
    const response = await callFunction(
      "getPatientClinicalSessions",
      item.uid,
      {
        clientId: item.clientId,
        episodeId: episodeIds[item.clientId],
      }
    );

    assert.equal(
      response.status,
      item.expected,
      `${item.name}: ${JSON.stringify(response.body)}`
    );

    console.log(`  ✅ ${item.name}`);
  }
});

test("Permisos de creación de sesiones clínicas", async () => {
  const owner = "test-owner-montse";

  // Crear un episodio de prueba para cada paciente.
  const episodeIds = {};

  for (const clientId of [
    "test-patient-a",
    "test-patient-b",
  ]) {
    const response = await callFunction(
      "createPatientClinicalEpisode",
      owner,
      {
        clientId,
        title: `TEST PERMISOS SESIONES ${Date.now()}`,
        reasonForConsultation: "Prueba automatizada",
        affectedArea: "Zona ficticia",
        observations: "Sin datos reales",
      }
    );

    assert.equal(
      response.status,
      200,
      JSON.stringify(response.body)
    );

    const episodeId = response.body?.result?.episodeId;

    assert.ok(episodeId, "Falta episodeId");

    episodeIds[clientId] = episodeId;
  }

  const cases = [
    {
      name: "Montse crea sesión del paciente A",
      uid: "test-owner-montse",
      clientId: "test-patient-a",
      expected: 200,
    },
    {
      name: "Montse crea sesión del paciente B",
      uid: "test-owner-montse",
      clientId: "test-patient-b",
      expected: 200,
    },
    {
      name: "Desarrollador crea sesión ficticia",
      uid: "test-developer",
      clientId: "test-patient-a",
      expected: 200,
    },
    {
      name: "Desarrollador bloqueado en paciente B",
      uid: "test-developer",
      clientId: "test-patient-b",
      expected: 403,
    },
    {
      name: "Paciente bloqueado al crear sesión",
      uid: "test-patient",
      clientId: "test-patient-a",
      expected: 403,
    },
    {
      name: "Sin autenticación no puede crear sesión",
      uid: null,
      clientId: "test-patient-a",
      expected: 401,
    },
  ];

  for (const item of cases) {
    const response = await callFunction(
      "createPatientClinicalSession",
      item.uid,
      {
        clientId: item.clientId,
        episodeId: episodeIds[item.clientId],
        sessionDate: "2026-11-20",
        painLevel: 4,
        symptoms: "Síntomas ficticios",
        treatment: "Tratamiento ficticio",
        exercises: "Ejercicios ficticios",
        evolution: "Evolución de prueba",
      }
    );

    assert.equal(
      response.status,
      item.expected,
      `${item.name}: ${JSON.stringify(response.body)}`
    );

    console.log(`  ✅ ${item.name}`);
  }

  // Verificar que solo se crearon las sesiones autorizadas.
  for (const [clientId, expectedCount] of [
    ["test-patient-a", 2],
    ["test-patient-b", 1],
  ]) {
    const sessions = await db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("clients")
      .doc(clientId)
      .collection("clinicalEpisodes")
      .doc(episodeIds[clientId])
      .collection("sessions")
      .get();

    assert.equal(
      sessions.size,
      expectedCount,
      `Número inesperado de sesiones en ${clientId}`
    );
  }

  console.log("  ✅ No se crearon sesiones no autorizadas");
});
