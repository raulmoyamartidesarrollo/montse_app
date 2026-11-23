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

async function callFunction(name, uid, data) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (uid) {
    assert.ok(tokens[uid], `Falta token para ${uid}`);
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

async function createTestSession() {
  const episodeResponse = await callFunction(
    "createPatientClinicalEpisode",
    OWNER_UID,
    {
      clientId: CLIENT_ID,
      title: `TEST MUTACIONES ${Date.now()}`,
      reasonForConsultation: "Prueba automatizada",
      affectedArea: "Zona ficticia",
      observations: "Sin datos clínicos reales",
    }
  );

  assert.equal(
    episodeResponse.status,
    200,
    JSON.stringify(episodeResponse.body)
  );

  const episodeId = episodeResponse.body?.result?.episodeId;
  assert.ok(episodeId);

  const sessionData = {
    clientId: CLIENT_ID,
    episodeId,
    sessionDate: "2026-11-20",
    painLevel: 4,
    symptoms: "Síntomas originales",
    treatment: "Tratamiento original",
    exercises: "Ejercicios originales",
    evolution: "Evolución original",
  };

  const sessionResponse = await callFunction(
    "createPatientClinicalSession",
    OWNER_UID,
    sessionData
  );

  assert.equal(
    sessionResponse.status,
    200,
    JSON.stringify(sessionResponse.body)
  );

  const sessionId = sessionResponse.body?.result?.sessionId;
  assert.ok(sessionId);

  const episodeRef = db
    .collection("centers")
    .doc(CENTER_ID)
    .collection("clients")
    .doc(CLIENT_ID)
    .collection("clinicalEpisodes")
    .doc(episodeId);

  const sessionRef = episodeRef
    .collection("sessions")
    .doc(sessionId);

  return {
    episodeId,
    sessionId,
    episodeRef,
    sessionRef,
    sessionData,
  };
}

test("Editar sesión y conservar auditoría", async () => {
  const fixture = await createTestSession();

  const updatedData = {
    ...fixture.sessionData,
    sessionId: fixture.sessionId,
    sessionDate: "2026-11-21",
    painLevel: 2,
    symptoms: "Síntomas modificados",
    treatment: "Tratamiento modificado",
    exercises: "Ejercicios modificados",
    evolution: "Evolución favorable",
  };

  const response = await callFunction(
    "updatePatientClinicalSession",
    OWNER_UID,
    updatedData
  );

  assert.equal(response.status, 200, JSON.stringify(response.body));

  const snapshot = await fixture.sessionRef.get();
  const data = snapshot.data();

  assert.equal(data.sessionDate, updatedData.sessionDate);
  assert.equal(data.painLevel, updatedData.painLevel);
  assert.equal(data.symptoms, updatedData.symptoms);
  assert.equal(data.treatment, updatedData.treatment);
  assert.equal(data.exercises, updatedData.exercises);
  assert.equal(data.evolution, updatedData.evolution);

  assert.equal(data.professionalId, OWNER_UID);
  assert.equal(data.createdBy, OWNER_UID);
  assert.equal(data.updatedBy, OWNER_UID);
  assert.ok(data.createdAt);
  assert.ok(data.updatedAt);

  const events = await fixture.sessionRef
    .collection("events")
    .get();

  const updatedEvent = events.docs.find(
    (doc) => doc.data().type === "updated"
  );

  assert.ok(updatedEvent, "Falta auditoría de edición");

  assert.equal(
    updatedEvent.data().previousValues.symptoms,
    "Síntomas originales"
  );

  assert.equal(
    updatedEvent.data().newValues.symptoms,
    "Síntomas modificados"
  );

  assert.equal(updatedEvent.data().performedBy, OWNER_UID);

  console.log("  ✅ Edición y auditoría verificadas");
});

test("Eliminar sesión y ocultarla de la consulta", async () => {
  const fixture = await createTestSession();

  const payload = {
    clientId: CLIENT_ID,
    episodeId: fixture.episodeId,
    sessionId: fixture.sessionId,
  };

  const deleted = await callFunction(
    "deletePatientClinicalSession",
    OWNER_UID,
    payload
  );

  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));

  const snapshot = await fixture.sessionRef.get();
  const data = snapshot.data();

  assert.equal(data.deleted, true);
  assert.equal(data.deletedBy, OWNER_UID);
  assert.ok(data.deletedAt);

  // Los datos clínicos originales deben permanecer almacenados.
  assert.equal(data.symptoms, "Síntomas originales");
  assert.equal(data.treatment, "Tratamiento original");

  const events = await fixture.sessionRef
    .collection("events")
    .get();

  assert.ok(
    events.docs.some((doc) => doc.data().type === "deleted"),
    "Falta auditoría de eliminación"
  );

  const list = await callFunction(
    "getPatientClinicalSessions",
    OWNER_UID,
    {
      clientId: CLIENT_ID,
      episodeId: fixture.episodeId,
    }
  );

  assert.equal(list.status, 200, JSON.stringify(list.body));

  assert.equal(
    list.body.result.sessions.some(
      (session) => session.sessionId === fixture.sessionId
    ),
    false
  );

  const repeatedDelete = await callFunction(
    "deletePatientClinicalSession",
    OWNER_UID,
    payload
  );

  assert.equal(repeatedDelete.status, 400);

  const editDeleted = await callFunction(
    "updatePatientClinicalSession",
    OWNER_UID,
    {
      ...fixture.sessionData,
      sessionId: fixture.sessionId,
    }
  );

  assert.equal(editDeleted.status, 400);

  console.log("  ✅ Borrado lógico y protección verificados");
});

test("Usuarios sin permisos no pueden modificar sesiones", async () => {
  const fixture = await createTestSession();

  const payload = {
    ...fixture.sessionData,
    sessionId: fixture.sessionId,
  };

  for (const uid of ["test-patient", null]) {
    const update = await callFunction(
      "updatePatientClinicalSession",
      uid,
      payload
    );

    const remove = await callFunction(
      "deletePatientClinicalSession",
      uid,
      {
        clientId: CLIENT_ID,
        episodeId: fixture.episodeId,
        sessionId: fixture.sessionId,
      }
    );

    assert.equal(update.status, uid ? 403 : 401);
    assert.equal(remove.status, uid ? 403 : 401);
  }

  console.log("  ✅ Accesos no autorizados bloqueados");
});

test("Episodios cerrados bloquean edición y eliminación", async () => {
  const fixture = await createTestSession();

  const close = await callFunction(
    "closePatientClinicalEpisode",
    OWNER_UID,
    {
      clientId: CLIENT_ID,
      episodeId: fixture.episodeId,
      closingReason: "Cierre de prueba",
    }
  );

  assert.equal(close.status, 200, JSON.stringify(close.body));

  const update = await callFunction(
    "updatePatientClinicalSession",
    OWNER_UID,
    {
      ...fixture.sessionData,
      sessionId: fixture.sessionId,
    }
  );

  const remove = await callFunction(
    "deletePatientClinicalSession",
    OWNER_UID,
    {
      clientId: CLIENT_ID,
      episodeId: fixture.episodeId,
      sessionId: fixture.sessionId,
    }
  );

  assert.equal(update.status, 400);
  assert.equal(remove.status, 400);

  console.log("  ✅ Episodios cerrados protegidos");
});
