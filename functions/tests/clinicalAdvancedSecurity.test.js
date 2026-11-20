const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const PROJECT_ID = "demo-montseapp";
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

const auth = getAuth();

const tokens = JSON.parse(
  fs.readFileSync("/tmp/montse-emulator-tokens.json", "utf8")
);

test("Usuario desactivado no puede consultar episodios clínicos", async () => {
  assert.ok(tokens[OWNER_UID], "Falta token del propietario");

  const user = await auth.getUser(OWNER_UID);
  const originalDisabled = user.disabled;

  // Verificar primero que el usuario tiene acceso.
  const endpoint =
    `http://127.0.0.1:5001/${PROJECT_ID}` +
    "/europe-west1/getPatientClinicalEpisodes";

  async function requestEpisodes() {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens[OWNER_UID]}`,
      },
      body: JSON.stringify({
        data: {
          clientId: "test-patient-a",
        },
      }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  }

  const before = await requestEpisodes();

  assert.equal(
    before.status,
    200,
    `El propietario no tenía acceso inicial: ${JSON.stringify(before.body)}`
  );

  console.log("  ✅ Propietario activo: acceso permitido");

  try {
    // Desactivar únicamente al usuario del emulador.
    await auth.updateUser(OWNER_UID, {
      disabled: true,
    });

    const disabledUser = await auth.getUser(OWNER_UID);

    assert.equal(disabledUser.disabled, true);

    const response = await requestEpisodes();

    assert.notEqual(
      response.status,
      200,
      "Un usuario desactivado ha podido consultar episodios"
    );

    assert.ok(
      [401, 403].includes(response.status),
      `Respuesta inesperada: ${JSON.stringify(response.body)}`
    );

    console.log("  ✅ Usuario desactivado: acceso bloqueado");
  } finally {
    // Restaurar siempre el estado original.
    await auth.updateUser(OWNER_UID, {
      disabled: originalDisabled,
    });

    console.log("  ✅ Estado original del usuario restaurado");
  }

  const restored = await auth.getUser(OWNER_UID);

  assert.equal(restored.disabled, originalDisabled);

  if (!originalDisabled) {
    const after = await requestEpisodes();

    assert.equal(
      after.status,
      200,
      `El propietario no recuperó el acceso: ${JSON.stringify(after.body)}`
    );

    console.log("  ✅ Propietario restaurado: acceso permitido");
  }
});


test("Retirar el rol owner bloquea el acceso clínico", async () => {
  const { getFirestore } = require("firebase-admin/firestore");

  // IMPORTANTE: MONTSE_APP utiliza la base de datos
  // con identificador "default".
  const db = getFirestore("default");

  const userRef = db
    .collection("users")
    .doc(OWNER_UID);

  const userSnapshot = await userRef.get();

  assert.equal(
    userSnapshot.exists,
    true,
    "No existe el usuario ficticio"
  );

  const originalRoles = userSnapshot.data().roles;

  assert.ok(
    Array.isArray(originalRoles),
    "El usuario no tiene un array de roles"
  );

  assert.ok(
    originalRoles.includes("owner"),
    "El usuario no tiene inicialmente el rol owner"
  );

  const endpoint =
    `http://127.0.0.1:5001/${PROJECT_ID}` +
    "/europe-west1/getPatientClinicalEpisodes";

  async function requestEpisodes() {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens[OWNER_UID]}`,
      },
      body: JSON.stringify({
        data: {
          clientId: "test-patient-a",
        },
      }),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  }

  // Comprobar acceso inicial.
  const before = await requestEpisodes();

  assert.equal(
    before.status,
    200,
    JSON.stringify(before.body)
  );

  console.log("  ✅ Rol owner: acceso permitido");

  try {
    // Retirar únicamente el rol owner.
    const rolesWithoutOwner = originalRoles.filter(
      role => role !== "owner"
    );

    await userRef.update({
      roles: rolesWithoutOwner,
    });

    const changedUser = await userRef.get();

    assert.equal(
      changedUser.data().roles.includes("owner"),
      false
    );

    // Comprobar que la función rechaza el acceso.
    const blocked = await requestEpisodes();

    assert.equal(
      blocked.status,
      403,
      JSON.stringify(blocked.body)
    );

    console.log("  ✅ Sin rol owner: acceso bloqueado");

    assert.ok(
      rolesWithoutOwner.includes("admin"),
      "El usuario debería conservar el rol admin"
    );

    console.log("  ✅ El rol admin no permite acceder a la historia clínica");
  } finally {
    // Restaurar siempre los roles originales.
    await userRef.update({
      roles: originalRoles,
    });

    console.log("  ✅ Roles originales restaurados");
  }

  // Verificar recuperación del acceso.
  const after = await requestEpisodes();

  assert.equal(
    after.status,
    200,
    JSON.stringify(after.body)
  );

  console.log("  ✅ Rol owner restaurado: acceso permitido");
});
