const admin = require("firebase-admin");
const crypto = require("node:crypto");

// ==========================================
// CONFIGURACIÓN FIREBASE
// ==========================================

admin.initializeApp({
  projectId: "montseapp-302eb",
});

// La base de datos se llama "default",
// no "(default)".
const db = admin.firestore();

db.settings({
  databaseId: "default",
});

const CENTER_ID = "montse-main";

const VALID_ROLES = ["owner", "developer"];

// ==========================================
// GENERACIÓN DEL CÓDIGO
// ==========================================

function generateActivationCode(role) {
  const prefix = role === "owner" ? "MTS-OWN" : "MTS-DEV";

  // 32 bytes aleatorios: 256 bits de entropía.
  const randomCode = crypto
    .randomBytes(32)
    .toString("hex")
    .toUpperCase();

  return `${prefix}-${randomCode}`;
}

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

// ==========================================
// CREAR INVITACIÓN
// ==========================================

async function createAdminInvitation() {
  const [, , role] = process.argv;

  if (!VALID_ROLES.includes(role)) {
    throw new Error(
      "Rol inválido. Utiliza: owner o developer."
    );
  }

  const centerRef = db
    .collection("centers")
    .doc(CENTER_ID);

  const invitationRef = db
    .collection("adminInvitations")
    .doc(role);

  // Comprobamos que existe el centro.
  const centerSnapshot = await centerRef.get();

  if (!centerSnapshot.exists) {
    throw new Error(
      `El centro ${CENTER_ID} no existe en Firestore.`
    );
  }

  const code = generateActivationCode(role);
  const codeHash = hashCode(code);

  // Transacción para evitar generar dos
  // invitaciones para el mismo rol.
  await db.runTransaction(async (transaction) => {
    const invitationSnapshot =
      await transaction.get(invitationRef);

    if (invitationSnapshot.exists) {
      const data = invitationSnapshot.data();

      if (data?.status === "pending") {
        throw new Error(
          `Ya existe una invitación pendiente para ${role}. ` +
          "Debes revocarla antes de generar otra."
        );
      }

      if (data?.status === "used") {
        throw new Error(
          `El rol ${role} ya tiene una invitación utilizada. ` +
          "No se permite generar otra automáticamente."
        );
      }

      if (data?.status !== "revoked") {
        throw new Error(
          "Estado de invitación desconocido. Operación cancelada."
        );
      }
    }

    transaction.set(invitationRef, {
      role,
      centerId: CENTER_ID,

      // Solo almacenamos el hash.
      codeHash,

      status: "pending",

      // Sin fecha de caducidad.
      expiresAt: null,

      createdAt: admin.firestore.FieldValue.serverTimestamp(),

      usedAt: null,
      usedBy: null,

      revokedAt: null,
    });
  });

  // ==========================================
  // MOSTRAR CÓDIGO
  // ==========================================

  console.log("\n==========================================");
  console.log("INVITACIÓN ADMINISTRATIVA CREADA");
  console.log("==========================================");

  console.log("Centro:", CENTER_ID);
  console.log("Rol:", role);

  console.log(
    "Tipo:",
    role === "owner"
      ? "Propietaria - Montse"
      : "Administrador de desarrollo - Raúl"
  );

  console.log("\nCÓDIGO DE ACTIVACIÓN:\n");
  console.log(code);

  console.log("\nCaducidad: SIN CADUCIDAD");
  console.log("Usos permitidos: 1");

  console.log("\nIMPORTANTE:");
  console.log("- Guarda el código en un lugar seguro.");
  console.log("- No lo subas a GitHub.");
  console.log("- No lo incluyas en el código de la app.");
  console.log("- No lo compartas públicamente.");

  console.log("==========================================\n");
}

// ==========================================
// EJECUCIÓN
// ==========================================

createAdminInvitation().catch((error) => {
  console.error("\nError creando invitación:");
  console.error(error.message);

  process.exitCode = 1;
});