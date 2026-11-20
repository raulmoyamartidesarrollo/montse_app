const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const {
  initializeApp,
} = require("firebase-admin/app");

const {
  getFirestore,
} = require("firebase-admin/firestore");

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
    throw new Error(`Entorno no permitido: ${key}`);
  }
}

initializeApp({ projectId: PROJECT_ID });

const db = getFirestore("default");

const tokens = JSON.parse(
  fs.readFileSync(
    "/tmp/montse-emulator-tokens.json",
    "utf8"
  )
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

const cases = [
  {
    name: "Montse crea episodio del paciente A",
    uid: "test-owner-montse",
    clientId: "test-patient-a",
    expected: 200,
  },
  {
    name: "Montse crea episodio del paciente B",
    uid: "test-owner-montse",
    clientId: "test-patient-b",
    expected: 200,
  },
  {
    name: "Desarrollador crea episodio ficticio",
    uid: "test-developer",
    clientId: "test-patient-a",
    expected: 200,
  },
  {
    name: "Desarrollador no puede crear episodio del paciente B",
    uid: "test-developer",
    clientId: "test-patient-b",
    expected: 403,
  },
  {
    name: "Paciente no puede crear episodios",
    uid: "test-patient",
    clientId: "test-patient-a",
    expected: 403,
  },
];

for (const item of cases) {
  test(item.name, async () => {
    const title = `TEST AUTOMATIZADO ${Date.now()} ${item.uid}`;

    const response = await callFunction(
      "createPatientClinicalEpisode",
      item.uid,
      {
        clientId: item.clientId,
        title,
        reasonForConsultation: "Prueba automatizada",
        affectedArea: "Zona ficticia",
        observations: "Datos exclusivamente de prueba",
      }
    );

    assert.equal(
      response.status,
      item.expected,
      JSON.stringify(response.body)
    );

    if (item.expected === 200) {
      const episodeId = response.body?.result?.episodeId;

      assert.ok(
        episodeId,
        "La función no devolvió episodeId"
      );

      const episodeRef = db
        .collection("centers")
        .doc("montse-main")
        .collection("clients")
        .doc(item.clientId)
        .collection("clinicalEpisodes")
        .doc(episodeId);

      const episode = await episodeRef.get();

      assert.equal(episode.exists, true);
      assert.equal(episode.data().title, title);
      assert.equal(episode.data().status, "open");

      const audit = await episodeRef
        .collection("events")
        .get();

      assert.ok(
        audit.docs.some(
          doc => doc.data().type === "created"
        ),
        "No existe evento de auditoría de creación"
      );
    }
  });
}
