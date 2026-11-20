const {
  initializeApp,
  getApps,
} = require("firebase-admin/app");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const {
  getAuth,
} = require("firebase-admin/auth");

const PROJECT_ID = "demo-montseapp";
const CENTER_ID = "montse-main";

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
        `Entorno no permitido: ${key}. ` +
        "Este script solo funciona en Firebase Emulator."
      );
    }
  }
}

async function ensureAuthUser(auth, user) {
  try {
    await auth.getUser(user.uid);

    console.log(`✅ Usuario existente: ${user.uid}`);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    await auth.createUser({
      uid: user.uid,
      email: user.email,
      emailVerified: true,
      disabled: false,
    });

    console.log(`✅ Usuario creado: ${user.uid}`);
  }
}

async function main() {
  assertEmulatorEnvironment();

  if (!getApps().length) {
    initializeApp({
      projectId: PROJECT_ID,
    });
  }

  // MONTSE_APP utiliza la base de datos
  // con identificador "default".
  const db = getFirestore("default");
  const auth = getAuth();

  console.log("\n=== PREPARANDO DATOS FICTICIOS ===\n");

  const users = [
    {
      uid: "test-owner-montse",
      email: "montse@example.test",
      roles: ["admin", "worker", "owner"],
    },
    {
      uid: "test-developer",
      email: "developer@example.test",
      roles: ["admin", "developer"],
    },
    {
      uid: "test-patient",
      email: "patient@example.test",
      roles: ["client"],
    },
  ];

  for (const user of users) {
    await ensureAuthUser(auth, user);

    await db.collection("users").doc(user.uid).set(
      {
        email: user.email,
        roles: user.roles,
        centerId: CENTER_ID,
        isTest: true,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  console.log("\n=== CENTRO ===\n");

  const centerRef = db
    .collection("centers")
    .doc(CENTER_ID);

  await centerRef.set(
    {
      name: "Centro Fisioterapia Pruebas",
      ownerUid: "test-owner-montse",
      ownerActivated: true,
      isTest: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`✅ Centro preparado: ${CENTER_ID}`);

  console.log("\n=== PACIENTES ===\n");

  const patients = [
    {
      id: "test-patient-a",
      firstName: "Paciente",
      lastName: "Pruebas A",
      isTest: true,
    },
    {
      id: "test-patient-b",
      firstName: "Paciente",
      lastName: "Pruebas B",
      isTest: false,
    },
  ];

  for (const patient of patients) {
    await centerRef
      .collection("clients")
      .doc(patient.id)
      .set(
        {
          firstName: patient.firstName,
          lastName: patient.lastName,
          isTest: patient.isTest,
          deleted: false,
          status: "active",
          updatedAt: new Date(),
        },
        { merge: true }
      );

    console.log(
      `✅ ${patient.id} | isTest: ${patient.isTest}`
    );
  }

  console.log("\n✅ DATOS DE PRUEBA PREPARADOS");
  console.log("Proyecto:", PROJECT_ID);
  console.log("Base de datos:", "default");
}

main().catch(error => {
  console.error("\n❌ ERROR:", error.message);
  process.exitCode = 1;
});
