const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const PROJECT_ID = "demo-montseapp";
const CENTER_ID = "montse-main";

const EXPECTED_ENV = {
  GCLOUD_PROJECT: PROJECT_ID,
  GOOGLE_CLOUD_PROJECT: PROJECT_ID,
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  GOOGLE_APPLICATION_CREDENTIALS: "/dev/null",
};

for (const [key, value] of Object.entries(EXPECTED_ENV)) {
  if (process.env[key] !== value) {
    throw new Error(
      `Entorno no permitido: ${key}. Solo se admiten emuladores locales.`
    );
  }
}

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
    name: "Montse puede consultar episodios del paciente A",
    uid: "test-owner-montse",
    clientId: "test-patient-a",
    expected: 200,
  },
  {
    name: "Montse puede consultar episodios del paciente B",
    uid: "test-owner-montse",
    clientId: "test-patient-b",
    expected: 200,
  },
  {
    name: "Desarrollador puede consultar episodios ficticios",
    uid: "test-developer",
    clientId: "test-patient-a",
    expected: 200,
  },
  {
    name: "Desarrollador no puede consultar pacientes no marcados como test",
    uid: "test-developer",
    clientId: "test-patient-b",
    expected: 403,
  },
  {
    name: "Paciente no puede consultar episodios del paciente A",
    uid: "test-patient",
    clientId: "test-patient-a",
    expected: 403,
  },
  {
    name: "Paciente no puede consultar episodios del paciente B",
    uid: "test-patient",
    clientId: "test-patient-b",
    expected: 403,
  },
];

for (const item of cases) {
  test(item.name, async () => {
    assert.ok(
      tokens[item.uid],
      `Falta token para ${item.uid}`
    );

    const response = await callFunction(
      "getPatientClinicalEpisodes",
      item.uid,
      {
        clientId: item.clientId,
      }
    );

    assert.equal(
      response.status,
      item.expected,
      `HTTP inesperado: ${JSON.stringify(response.body)}`
    );
  });
}

test("La función requiere autenticación", async () => {
  const response = await fetch(
    `http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/getPatientClinicalEpisodes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          clientId: "test-patient-a",
        },
      }),
    }
  );

  assert.equal(response.status, 401);
});
