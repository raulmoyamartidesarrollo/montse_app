import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  FieldPath,
  Timestamp,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  createHash,
  randomInt,
} from "node:crypto";

import {
  createEmptyWeeklySchedule,
  validateWeeklySchedule,
  SCHEDULE_TIMEZONE,
} from "./schedules/weeklySchedule";

import {
  validateSpecialScheduleInput,
  validateSpecialScheduleDateInput,
  validateSpecialScheduleQuery,
} from "./schedules/specialSchedule";

import {
  validateVacationInput,
  validateVacationUpdateInput,
  validateVacationId,
  validateVacationIdInput,
  validateVacationQuery,
  doVacationRangesOverlap,
  assertVacationCreationAllowed,
  assertVacationUpdateAllowed,
  assertVacationDeletionAllowed,
  type VacationDateRange,
} from "./schedules/vacationSchedule";


initializeApp();

const db = getFirestore("default");

const CENTER_ID = "montse-main";


/**
 * Comprueba los permisos de administración del centro.
 *
 * Owner: propietaria activada y vinculada al centro.
 * Developer: desarrollador autorizado del centro.
 */
function validateCenterManagementPermissions(
  uid: string,
  userData: FirebaseFirestore.DocumentData | undefined,
  centerData: FirebaseFirestore.DocumentData | undefined
): void {
  if (!userData || !centerData) {
    throw new HttpsError(
      "failed-precondition",
      "No se ha encontrado el usuario o el centro."
    );
  }

  const roles: string[] = Array.isArray(userData.roles)
    ? userData.roles
    : [];

  const isOwner =
    roles.includes("owner") &&
    centerData.ownerActivated === true &&
    centerData.ownerUid === uid;

  const isDeveloper =
    roles.includes("developer");

  if (
    userData.centerId !== CENTER_ID ||
    (!isOwner && !isDeveloper)
  ) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para gestionar este centro."
    );
  }
}

/**
 * Comprueba el acceso administrativo al centro.
 *
 * Las operaciones de escritura deberán volver a validar
 * los permisos dentro de su propia transacción.
 */
async function assertCenterManagementAccess(
  uid: string
): Promise<void> {
  const userRecord = await getAuth().getUser(uid);

  if (userRecord.disabled) {
    throw new HttpsError(
      "permission-denied",
      "La cuenta está deshabilitada."
    );
  }

  const userRef = db
    .collection("users")
    .doc(uid);

  const centerRef = db
    .collection("centers")
    .doc(CENTER_ID);

  const [userSnapshot, centerSnapshot] =
    await Promise.all([
      userRef.get(),
      centerRef.get(),
    ]);

  validateCenterManagementPermissions(
    uid,
    userSnapshot.data(),
    centerSnapshot.data()
  );
}


/**
 * Comprueba si un usuario puede acceder a los datos clínicos
 * de un paciente.
 *
 * Owner: pacientes del centro.
 * Developer: únicamente pacientes de prueba.
 */
async function assertClinicalPatientAccess(
  uid: string,
  clientId: string
): Promise<void> {
  const userRecord = await getAuth().getUser(uid);

  if (userRecord.disabled) {
    throw new HttpsError(
      "permission-denied",
      "La cuenta está deshabilitada."
    );
  }

  const userRef = db.collection("users").doc(uid);
  const centerRef = db.collection("centers").doc(CENTER_ID);
  const clientRef = centerRef
    .collection("clients")
    .doc(clientId);

  const [userSnapshot, centerSnapshot, clientSnapshot] =
    await Promise.all([
      userRef.get(),
      centerRef.get(),
      clientRef.get(),
    ]);

  if (
    !userSnapshot.exists ||
    !centerSnapshot.exists ||
    !clientSnapshot.exists
  ) {
    throw new HttpsError(
      "not-found",
      "No se ha encontrado el usuario, centro o paciente."
    );
  }

  const userData = userSnapshot.data();
  const centerData = centerSnapshot.data();
  const clientData = clientSnapshot.data();

  const roles: string[] = Array.isArray(userData?.roles)
    ? userData.roles
    : [];

  const isOwner =
    roles.includes("owner") &&
    centerData?.ownerActivated === true &&
    centerData?.ownerUid === uid;

  const isDeveloper =
    roles.includes("developer") &&
    clientData?.isTest === true;

  if (
    userData?.centerId !== CENTER_ID ||
    (!isOwner && !isDeveloper)
  ) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para acceder a este paciente."
    );
  }

  if (clientData?.deleted === true) {
    throw new HttpsError(
      "failed-precondition",
      "El paciente está en la papelera."
    );
  }
}

// ==================================================
// GESTIÓN DE SERVICIOS DEL CENTRO
// ==================================================

interface CenterServiceInput {
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
}

/**
 * Valida y normaliza los datos de un servicio.
 *
 * Utilizada tanto para crear como para editar servicios.
 */
function validateCenterServiceInput(
  payload: unknown
): CenterServiceInput {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Los datos del servicio no son válidos."
    );
  }

  const input = payload as Record<string, unknown>;

  const allowedKeys = [
    "name",
    "description",
    "priceCents",
    "durationMinutes",
    "active",
  ];

  if (
    Object.keys(input).some(
      (key) => !allowedKeys.includes(key)
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El servicio contiene campos no permitidos."
    );
  }

  // Nombre del servicio.
  if (
    typeof input.name !== "string" ||
    input.name.trim().length === 0 ||
    input.name.length > 120
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Introduce un nombre de servicio válido."
    );
  }

  const name = input.name.trim();

  // Descripción opcional.
  const rawDescription =
    input.description === undefined
      ? ""
      : input.description;

  if (
    typeof rawDescription !== "string" ||
    rawDescription.length > 1000
  ) {
    throw new HttpsError(
      "invalid-argument",
      "La descripción no puede superar los 1000 caracteres."
    );
  }

  const description = rawDescription.trim();

  // Precio expresado en céntimos.
  const priceCents = input.priceCents;

  if (
    typeof priceCents !== "number" ||
    !Number.isSafeInteger(priceCents) ||
    priceCents < 0 ||
    priceCents > 1000000
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El precio del servicio no es válido."
    );
  }

  // Duración expresada en minutos.
  const durationMinutes = input.durationMinutes;

  if (
    typeof durationMinutes !== "number" ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 480
  ) {
    throw new HttpsError(
      "invalid-argument",
      "La duración debe estar entre 5 y 480 minutos."
    );
  }

  // Estado del servicio.
  if (typeof input.active !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "El estado del servicio no es válido."
    );
  }

  return {
    name,
    description,
    priceCents,
    durationMinutes,
    active: input.active,
  };
}

/**
 * Valida el identificador de un servicio.
 */
function validateCenterServiceId(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(value)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El identificador del servicio no es válido."
    );
  }

  return value;
}


/**
 * Recupera los servicios del centro.
 *
 * Permisos:
 * - Owner activado.
 * - Developer autorizado.
 *
 * Devuelve servicios activos e inactivos.
 * Excluye los servicios eliminados.
 */
export const getCenterServices = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    await assertCenterManagementAccess(uid);

    // Esta función no admite parámetros.
    const payload = request.data;

    if (
      payload !== undefined &&
      payload !== null &&
      (
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        Object.keys(payload).length > 0
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La consulta contiene parámetros no permitidos."
      );
    }

    const servicesSnapshot = await db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("services")
      .get();

    const services = servicesSnapshot.docs
      .filter((document) => {
        return document.data().deleted !== true;
      })
      .map((document) => {
        const data = document.data();

        return {
          serviceId: document.id,

          name:
            typeof data.name === "string"
              ? data.name
              : "",

          description:
            typeof data.description === "string"
              ? data.description
              : "",

          priceCents:
            typeof data.priceCents === "number" &&
            Number.isSafeInteger(data.priceCents) &&
            data.priceCents >= 0 &&
            data.priceCents <= 1000000
              ? data.priceCents
              : null,

          currency: "EUR",

          durationMinutes:
            typeof data.durationMinutes === "number" &&
            Number.isInteger(data.durationMinutes) &&
            data.durationMinutes >= 5 &&
            data.durationMinutes <= 480
              ? data.durationMinutes
              : null,

          active: data.active === true,

          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : null,

          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate().toISOString()
              : null,
        };
      });

    // Mostrar primero los servicios activos.
    // Dentro de cada grupo, ordenar por nombre.
    services.sort((first, second) => {
      if (first.active !== second.active) {
        return first.active ? -1 : 1;
      }

      return (
        first.name.localeCompare(second.name, "es") ||
        first.serviceId.localeCompare(second.serviceId)
      );
    });

    return {
      success: true,
      services,
    };
  }
);


/**
 * Crea un nuevo servicio del centro.
 *
 * Permisos:
 * - Owner activado.
 * - Developer autorizado.
 *
 * Los campos internos y de auditoría se generan
 * exclusivamente desde el servidor.
 */
export const createCenterService = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // Comprobar permisos administrativos.
    await assertCenterManagementAccess(uid);

    // Validar y normalizar los datos recibidos.
    const service = validateCenterServiceInput(
      request.data
    );

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const serviceRef = centerRef
      .collection("services")
      .doc();

    await db.runTransaction(async (transaction) => {
      const userSnapshot =
        await transaction.get(userRef);

      const centerSnapshot =
        await transaction.get(centerRef);

      // Volver a comprobar los permisos dentro
      // de la transacción de escritura.
      validateCenterManagementPermissions(
        uid,
        userSnapshot.data(),
        centerSnapshot.data()
      );

      transaction.create(serviceRef, {
        name: service.name,
        description: service.description,
        priceCents: service.priceCents,
        currency: "EUR",
        durationMinutes: service.durationMinutes,
        active: service.active,

        // Eliminación lógica.
        deleted: false,
        deletedAt: null,
        deletedBy: null,

        // Auditoría.
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: uid,
        updatedBy: uid,
      });
    });

    return {
      success: true,
      serviceId: serviceRef.id,
    };
  }
);


/**
 * Actualiza un servicio existente del centro.
 *
 * Conserva los datos originales de creación.
 * No permite modificar servicios eliminados.
 */
export const updateCenterService = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    await assertCenterManagementAccess(uid);

    const payload = request.data;

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos del servicio no son válidos."
      );
    }

    const input = payload as Record<string, unknown>;

    const {
      serviceId: rawServiceId,
      ...serviceInput
    } = input;

    const serviceId = validateCenterServiceId(
      rawServiceId
    );

    const service = validateCenterServiceInput(
      serviceInput
    );

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const serviceRef = centerRef
      .collection("services")
      .doc(serviceId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot =
        await transaction.get(userRef);

      const centerSnapshot =
        await transaction.get(centerRef);

      validateCenterManagementPermissions(
        uid,
        userSnapshot.data(),
        centerSnapshot.data()
      );

      const serviceSnapshot =
        await transaction.get(serviceRef);

      if (!serviceSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "No se ha encontrado el servicio."
        );
      }

      const currentService = serviceSnapshot.data();

      if (currentService?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "No se puede modificar un servicio eliminado."
        );
      }

      transaction.update(serviceRef, {
        name: service.name,
        description: service.description,
        priceCents: service.priceCents,
        currency: "EUR",
        durationMinutes: service.durationMinutes,
        active: service.active,

        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      });
    });

    return {
      success: true,
      serviceId,
    };
  }
);


/**
 * Activa o desactiva un servicio del centro.
 *
 * No modifica el nombre, precio ni duración.
 * No permite reactivar servicios eliminados.
 */
export const setCenterServiceStatus = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    await assertCenterManagementAccess(uid);

    const payload = request.data;

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos recibidos no son válidos."
      );
    }

    const input = payload as Record<string, unknown>;

    const allowedKeys = [
      "serviceId",
      "active",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La solicitud contiene campos no permitidos."
      );
    }

    const serviceId = validateCenterServiceId(
      input.serviceId
    );

    if (typeof input.active !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "El estado del servicio no es válido."
      );
    }

    const active = input.active;

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const serviceRef = centerRef
      .collection("services")
      .doc(serviceId);

    const changed = await db.runTransaction(
      async (transaction) => {
        const userSnapshot =
          await transaction.get(userRef);

        const centerSnapshot =
          await transaction.get(centerRef);

        validateCenterManagementPermissions(
          uid,
          userSnapshot.data(),
          centerSnapshot.data()
        );

        const serviceSnapshot =
          await transaction.get(serviceRef);

        if (!serviceSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "No se ha encontrado el servicio."
          );
        }

        const serviceData = serviceSnapshot.data();

        if (serviceData?.deleted === true) {
          throw new HttpsError(
            "failed-precondition",
            "No se puede cambiar el estado de un servicio eliminado."
          );
        }

        // Evitar escrituras innecesarias.
        if (serviceData?.active === active) {
          return false;
        }

        transaction.update(serviceRef, {
          active,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: uid,
        });

        return true;
      }
    );

    return {
      success: true,
      serviceId,
      active,
      changed,
    };
  }
);


/**
 * Elimina lógicamente un servicio del centro.
 *
 * Conserva sus datos originales para mantener
 * la integridad de las futuras reservas e históricos.
 *
 * No elimina físicamente el documento de Firestore.
 */
export const deleteCenterService = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    await assertCenterManagementAccess(uid);

    const payload = request.data;

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos recibidos no son válidos."
      );
    }

    const input = payload as Record<string, unknown>;

    if (
      Object.keys(input).some(
        (key) => key !== "serviceId"
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La solicitud contiene campos no permitidos."
      );
    }

    const serviceId = validateCenterServiceId(
      input.serviceId
    );

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const serviceRef = centerRef
      .collection("services")
      .doc(serviceId);

    const changed = await db.runTransaction(
      async (transaction) => {
        const userSnapshot =
          await transaction.get(userRef);

        const centerSnapshot =
          await transaction.get(centerRef);

        validateCenterManagementPermissions(
          uid,
          userSnapshot.data(),
          centerSnapshot.data()
        );

        const serviceSnapshot =
          await transaction.get(serviceRef);

        if (!serviceSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "No se ha encontrado el servicio."
          );
        }

        const serviceData = serviceSnapshot.data();

        // Si ya está eliminado, no modificar
        // los datos originales de eliminación.
        if (serviceData?.deleted === true) {
          return false;
        }

        transaction.update(serviceRef, {
          active: false,
          deleted: true,

          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: uid,

          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: uid,
        });

        return true;
      }
    );

    return {
      success: true,
      serviceId,
      deleted: true,
      changed,
    };
  }
);

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
// Los códigos de vinculación caducan a los 7 días.
const PATIENT_LINK_CODE_EXPIRY_MS =
  7 * 24 * 60 * 60 * 1000;
/**
 * Genera un código de vinculación para pacientes.
 *
 * Formato:
 * 3 letras + 4 números.
 *
 * Ejemplo: KPM4827
 *
 * El código original se entrega una sola vez.
 * En Firestore se almacena únicamente su hash.
 */
function generatePatientLinkCode(): {
  code: string;
  codeHash: string;
} {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "0123456789";

  let code = "";

  // Generar tres letras aleatorias.
  for (let i = 0; i < 3; i++) {
    code += letters[randomInt(letters.length)];
  }

  // Generar cuatro números aleatorios.
  for (let i = 0; i < 4; i++) {
    code += numbers[randomInt(numbers.length)];
  }

  const codeHash = createHash("sha256")
    .update(code)
    .digest("hex");

  return {
    code,
    codeHash,
  };
}

type AdminRole = "owner" | "developer";

function activationError(
  code: "invalid-argument" | "permission-denied" | "failed-precondition",
  message: string
): HttpsError {
  return new HttpsError(code, message);
}

/**
 * Crea el perfil de un usuario autenticado.
 *
 * No permite asignar ni modificar roles administrativos.
 */
/**
 * Crea el perfil de un usuario autenticado.
 *
 * No permite asignar ni modificar roles administrativos.
 *
 * IMPORTANTE:
 * - Crea únicamente la cuenta de usuario.
 * - NO crea automáticamente una ficha de paciente.
 * - La ficha se vinculará posteriormente mediante un código.
 * - Conserva los datos de usuarios existentes.
 */
export const ensureUserProfile = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const centerRef = db.collection("centers").doc(CENTER_ID);

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
      const centerSnapshot = await transaction.get(centerRef);
      const userSnapshot = await transaction.get(userRef);

      if (!centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "El centro todavía no está configurado."
        );
      }

      if (!userSnapshot.exists) {
        transaction.create(userRef, {
          uid,

          name: userRecord.displayName || "",
          surname: "",
          email: userRecord.email || "",
          phone: userRecord.phoneNumber || "",
          photoURL: userRecord.photoURL || "",

          roles: ["client"],
          centerId: CENTER_ID,

          // Todavía no tiene expediente vinculado.
          clientId: null,

          // Control del proceso inicial de activación.
          activationOnboardingCompleted: false,

          notificationsEnabled: false,

          notificationPreferences: {
            bookingCreated: true,
            bookingModified: true,
            bookingCancelled: true,
            reminder24h: true,
            reminder2h: true,
            availableSlots: false,
          },

          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const userData = userSnapshot.data();

        // Mantener los datos y permisos existentes.
        // No sobrescribir clientId ni roles.
        if (!userData?.centerId) {
          transaction.update(userRef, {
            centerId: CENTER_ID,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      /*
       * IMPORTANTE
       *
       * Ya NO creamos automáticamente:
       *
       * centers/{centerId}/clients/{uid}
       *
       * Los expedientes se gestionarán de manera
       * independiente y podrán vincularse mediante
       * un código de paciente.
       */
    });

    return {
      success: true,
      centerId: CENTER_ID,
    };
  }
);

/**
 * Activa una cuenta administrativa mediante
 * una invitación de un solo uso.
 *
 * Requiere:
 * - Usuario autenticado.
 * - Correo electrónico verificado.
 * - Coincidencia con el correo de la invitación.
 * - Código válido y sin utilizar.
 * - Invitación dentro de su periodo de validez.
 */
export const activateAccountWithCode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled || !userRecord.emailVerified) {
      throw new HttpsError(
        "failed-precondition",
        "Debes verificar tu correo electrónico antes de activar la cuenta."
      );
    }

    // Obtener el correo verificado directamente de Firebase Auth.
    // Nunca confiar en un correo enviado desde la aplicación.
    const verifiedEmail = userRecord.email?.trim().toLowerCase();

    if (!verifiedEmail) {
    throw new HttpsError(
        "failed-precondition",
        "Tu cuenta debe tener un correo electrónico verificado."
    );
    }


    const rawCode = request.data?.code;
    const normalizedCode =
      typeof rawCode === "string"
        ? rawCode.trim().toUpperCase()
        : "";

    const validFormat =
      /^MTS-(OWN|DEV)-[A-F0-9]{64}$/.test(normalizedCode);

    const role: AdminRole | null = validFormat
      ? normalizedCode.startsWith("MTS-OWN-")
        ? "owner"
        : "developer"
      : null;

    const codeHash = createHash("sha256")
      .update(normalizedCode)
      .digest("hex");

    const attemptsRef = db
      .collection("adminActivationAttempts")
      .doc(uid);

    const userRef = db.collection("users").doc(uid);

    const invitationRef = role
      ? db.collection("adminInvitations").doc(role)
      : null;

        // Documento principal del centro.
        const centerRef = db
        .collection("centers")
        .doc(CENTER_ID);
    const workerRef = db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("workers")
      .doc("montse");

    const auditRef = db
      .collection("adminActivationAudit")
      .doc();

    const now = Date.now();

    /*
     * FASE 1
     *
     * Registrar el intento antes de validar
     * la invitación.
     *
     * Esta transacción se confirma por separado
     * para que los intentos incorrectos no se pierdan.
     */
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(attemptsRef);
      const data = snapshot.data();

      const windowStartedAt =
        data?.windowStartedAt instanceof Timestamp
          ? data.windowStartedAt.toMillis()
          : 0;

      const currentCount =
        typeof data?.count === "number"
          ? data.count
          : 0;

      const windowIsActive =
        windowStartedAt > 0 &&
        now - windowStartedAt < ATTEMPT_WINDOW_MS;

      const count = windowIsActive ? currentCount : 0;

      if (count >= MAX_ATTEMPTS) {
        throw new HttpsError(
          "resource-exhausted",
          "Has alcanzado el límite de intentos. Inténtalo más tarde."
        );
      }

      transaction.set(attemptsRef, {
        count: count + 1,
        windowStartedAt: Timestamp.fromMillis(
          windowIsActive ? windowStartedAt : now
        ),
        lastAttemptAt: FieldValue.serverTimestamp(),
      });
    });

    /*
     * FASE 2
     *
     * Validar la invitación y asignar permisos.
     * Todas las escrituras se realizan en
     * una única transacción.
     */
    if (!role || !invitationRef) {
      throw activationError(
        "invalid-argument",
        "El código de activación no es válido."
      );
    }

    await db.runTransaction(async (transaction) => {
      // Todas las lecturas antes de las escrituras.
      const invitationSnapshot =
        await transaction.get(invitationRef);

      const userSnapshot =
        await transaction.get(userRef);
        const centerSnapshot =
            await transaction.get(centerRef);
      const workerSnapshot =
        role === "owner"
          ? await transaction.get(workerRef)
          : null;

      const invitation = invitationSnapshot.data();

      if (
        !invitationSnapshot.exists ||
        invitation?.status !== "pending" ||
        invitation?.codeHash !== codeHash ||
        invitation?.role !== role ||
        invitation?.centerId !== CENTER_ID ||
        invitation?.allowedEmail !== verifiedEmail ||
        !(invitation?.expiresAt instanceof Timestamp) ||
        invitation.expiresAt.toMillis() <= Date.now()
        ) {
        throw activationError(
            "permission-denied",
            "El código no es válido, no corresponde a tu cuenta o ha caducado."
        );
        }

      if (!userSnapshot.exists) {
        throw activationError(
          "failed-precondition",
          "Debes completar el registro antes de activar tu cuenta."
        );
      }

      const userData = userSnapshot.data();

      if (userData?.centerId !== CENTER_ID) {
        throw activationError(
          "failed-precondition",
          "La cuenta no pertenece al centro indicado."
        );
      }

      const currentRoles = Array.isArray(userData?.roles)
        ? userData.roles
        : ["client"];

      if (
        currentRoles.includes("admin") ||
        currentRoles.includes("owner") ||
        currentRoles.includes("developer")
      ) {
        throw activationError(
          "failed-precondition",
          "Esta cuenta ya tiene permisos administrativos."
        );
      }

      if (role === "owner") {
  if (!centerSnapshot.exists) {
    throw activationError(
      "failed-precondition",
      "El centro no existe."
    );
  }

  if (centerSnapshot.data()?.ownerActivated === true) {
    throw activationError(
      "failed-precondition",
      "El centro ya tiene una propietaria activada."
    );
  }

  if (!workerSnapshot?.exists) {
    throw activationError(
      "failed-precondition",
      "No existe el perfil profesional de Montse."
    );
  }

  if (workerSnapshot.data()?.userId) {
    throw activationError(
      "failed-precondition",
      "La propietaria ya tiene una cuenta vinculada."
    );
  }
}

      const newRoles =
        role === "owner"
          ? ["admin", "worker", "owner"]
          : ["admin", "developer"];

      transaction.update(userRef, {
        roles: newRoles,
        activationOnboardingCompleted: true,
        updatedAt: FieldValue.serverTimestamp(),
        });

      if (role === "owner") {
        transaction.update(workerRef, {
            userId: uid,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // El negocio ya tiene propietaria.
        transaction.update(centerRef, {
            ownerActivated: true,
            ownerUid: uid,
            ownerActivatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        }

      transaction.update(invitationRef, {
        status: "used",
        usedAt: FieldValue.serverTimestamp(),
        usedBy: uid,
      });

      transaction.create(auditRef, {
        action: "admin_account_activated",
        userId: uid,
        role,
        centerId: CENTER_ID,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      role,
      centerId: CENTER_ID,
    };
  }
);
/**
 * Marca como completada la pantalla inicial
 * de activación del usuario.
 *
 * No modifica roles ni permisos.
 */
export const completeActivationOnboarding = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);

      if (!userSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "El perfil del usuario todavía no existe."
        );
      }

      const userData = userSnapshot.data();

      if (userData?.centerId !== CENTER_ID) {
        throw new HttpsError(
          "permission-denied",
          "El usuario no pertenece a este centro."
        );
      }

      // Si ya completó el proceso, no hacemos nada.
      if (userData?.activationOnboardingCompleted === true) {
        return;
      }

      transaction.update(userRef, {
        activationOnboardingCompleted: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      activationOnboardingCompleted: true,
    };
  }
);
/**
 * Consulta si el centro ya tiene una propietaria activada.
 *
 * No devuelve información personal ni permisos.
 * Solo informa del estado de activación del negocio.
 */
export const getCenterActivationStatus = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const centerSnapshot = await centerRef.get();

    if (!centerSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El centro no está configurado."
      );
    }

    const centerData = centerSnapshot.data();

    return {
      ownerActivated:
        centerData?.ownerActivated === true &&
        typeof centerData?.ownerUid === "string" &&
        centerData.ownerUid.length > 0,
    };
  }
);
// ==================================================
// HORARIOS DEL CENTRO
// ==================================================

/**
 * Actualiza el horario semanal del centro.
 *
 * Permisos:
 * - Owner activado.
 * - Developer autorizado.
 *
 * No modifica horarios especiales, vacaciones,
 * festivos ni citas existentes.
 */
export const updateCenterWeeklySchedule = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // --------------------------------------------------
    // COMPROBAR PERMISOS
    // --------------------------------------------------

    await assertCenterManagementAccess(uid);

    // --------------------------------------------------
    // VALIDAR PETICIÓN
    // --------------------------------------------------

    const payload = request.data;

    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos del horario no son válidos."
      );
    }

    const keys = Object.keys(payload);

    if (
      keys.length !== 1 ||
      !Object.prototype.hasOwnProperty.call(
        payload,
        "weekly"
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La petición contiene campos no permitidos."
      );
    }

    // Validar los siete días, horas y solapamientos.
    // También ordenar los tramos cronológicamente.

    const weekly = validateWeeklySchedule(
      payload.weekly
    );

    // --------------------------------------------------
    // REFERENCIAS FIRESTORE
    // --------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    // --------------------------------------------------
    // GUARDAR HORARIO MEDIANTE TRANSACCIÓN
    // --------------------------------------------------

    await db.runTransaction(async (transaction) => {
      const [userSnapshot, centerSnapshot] =
        await Promise.all([
          transaction.get(userRef),
          transaction.get(centerRef),
        ]);

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();

      // Volver a comprobar los permisos dentro
      // de la transacción.

      validateCenterManagementPermissions(
        uid,
        userData,
        centerData
      );

      const storedSchedule = centerData?.schedule;

      if (
        storedSchedule !== undefined &&
        (
          typeof storedSchedule !== "object" ||
          storedSchedule === null ||
          Array.isArray(storedSchedule)
        )
      ) {
        throw new HttpsError(
          "failed-precondition",
          "La configuración de horarios almacenada no es válida."
        );
      }

      // Actualizar exclusivamente el horario semanal.
      // Conservar el resto de la configuración.

      transaction.update(centerRef, {
        "schedule.weekly": weekly,

        "schedule.weeklyConfigured": true,

        "schedule.weeklyUpdatedAt":
          FieldValue.serverTimestamp(),

        "schedule.weeklyUpdatedBy": uid,

        updatedAt:
          FieldValue.serverTimestamp(),
      });
    });

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return {
      success: true,
    };
  }
);

/**
 * Recupera la configuración del horario semanal.
 *
 * Permisos:
 * - Owner activado.
 * - Developer autorizado.
 *
 * No realiza escrituras en Firestore.
 */
export const getCenterSchedule = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // --------------------------------------------------
    // VALIDAR PETICIÓN
    // --------------------------------------------------

    const payload = request.data;

    if (
      payload !== undefined &&
      payload !== null &&
      (
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        Object.keys(payload).length > 0
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La consulta contiene parámetros no permitidos."
      );
    }

    // --------------------------------------------------
    // COMPROBAR CUENTA
    // --------------------------------------------------

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    // --------------------------------------------------
    // RECUPERAR USUARIO Y CENTRO
    // --------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const [userSnapshot, centerSnapshot] =
      await Promise.all([
        userRef.get(),
        centerRef.get(),
      ]);

    const userData = userSnapshot.data();
    const centerData = centerSnapshot.data();

    validateCenterManagementPermissions(
      uid,
      userData,
      centerData
    );

    // --------------------------------------------------
    // RECUPERAR CONFIGURACIÓN
    // --------------------------------------------------

    const storedSchedule = centerData?.schedule;

    if (
      storedSchedule !== undefined &&
      (
        typeof storedSchedule !== "object" ||
        storedSchedule === null ||
        Array.isArray(storedSchedule)
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "La configuración de horarios almacenada no es válida."
      );
    }

    const configuredFlag =
      storedSchedule?.weeklyConfigured;

    if (
      configuredFlag !== undefined &&
      typeof configuredFlag !== "boolean"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "El estado del horario semanal no es válido."
      );
    }

    const weeklyConfigured =
      configuredFlag === true;

    let weekly = createEmptyWeeklySchedule();

    // --------------------------------------------------
    // VALIDAR HORARIO ALMACENADO
    // --------------------------------------------------

    if (weeklyConfigured) {
      try {
        weekly = validateWeeklySchedule(
          storedSchedule?.weekly
        );
      } catch (error) {
        console.error(
          "[getCenterSchedule] Horario almacenado no válido:",
          error
        );

        throw new HttpsError(
          "failed-precondition",
          "El horario semanal almacenado no es válido."
        );
      }
    } else if (storedSchedule?.weekly !== undefined) {
      throw new HttpsError(
        "failed-precondition",
        "Existe un horario semanal sin un estado de configuración válido."
      );
    }

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return {
      success: true,

      schedule: {
        timezone: SCHEDULE_TIMEZONE,

        weeklyConfigured,

        weekly,

        updatedAt:
          storedSchedule?.weeklyUpdatedAt instanceof Timestamp
            ? storedSchedule.weeklyUpdatedAt
                .toDate()
                .toISOString()
            : null,
      },
    };
  }
);

/**
 * Obtiene la configuración del centro.
 *
 * Solo pueden acceder usuarios administrativos
 * vinculados al centro.
 */
export const getCenterSettings = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const userSnapshot = await db
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnapshot.exists) {
      throw new HttpsError(
        "permission-denied",
        "No existe el perfil de usuario."
      );
    }

    const userData = userSnapshot.data();

    const roles: string[] = Array.isArray(userData?.roles)
      ? userData.roles
      : [];

    if (userData?.centerId !== CENTER_ID) {
      throw new HttpsError(
        "permission-denied",
        "No perteneces a este centro."
      );
    }

    // Acceso de lectura para la propietaria
    // y el desarrollador autorizado.
    if (
      !roles.includes("owner") &&
      !roles.includes("developer")
    ) {
      throw new HttpsError(
        "permission-denied",
        "No tienes permisos para consultar estos datos."
      );
    }

    const centerSnapshot = await db
      .collection("centers")
      .doc(CENTER_ID)
      .get();

    if (!centerSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El centro no existe."
      );
    }

    const center = centerSnapshot.data();

    // Devolver únicamente información de configuración.
    // No exponer identificadores internos de propiedad.
    return {
      name: center?.name ?? "",
      description: center?.description ?? "",

      address: {
        street: center?.address?.street ?? "",
        number: center?.address?.number ?? "",
        floor: center?.address?.floor ?? "",
        door: center?.address?.door ?? "",
        postalCode: center?.address?.postalCode ?? "",
        city: center?.address?.city ?? "",
        province: center?.address?.province ?? "",
        country: center?.address?.country ?? "ES",
        formattedAddress:
          center?.address?.formattedAddress ?? "",
      },

      contact: {
        phone: center?.contact?.phone ?? "",
        mobile: center?.contact?.mobile ?? "",
        whatsapp: center?.contact?.whatsapp ?? "",
        email: center?.contact?.email ?? "",
        website: center?.contact?.website ?? "",
      },

      socialMedia: {
        instagram: center?.socialMedia?.instagram ?? "",
        facebook: center?.socialMedia?.facebook ?? "",
        tiktok: center?.socialMedia?.tiktok ?? "",
        youtube: center?.socialMedia?.youtube ?? "",
        linkedin: center?.socialMedia?.linkedin ?? "",
        x: center?.socialMedia?.x ?? "",
      },

            timezone: center?.timezone ?? "Europe/Madrid",

      bookingSettings: {
        allowClientCancellation:
          center?.bookingSettings?.allowClientCancellation ?? true,

        allowClientRescheduling:
          center?.bookingSettings?.allowClientRescheduling ?? true,

        allowRecurringBookings:
          center?.bookingSettings?.allowRecurringBookings ?? true,

        defaultDurationMinutes:
          center?.bookingSettings?.defaultDurationMinutes ?? 60,

        recurringIntervalsWeeks:
          center?.bookingSettings?.recurringIntervalsWeeks ?? [1, 2, 3, 4],
      },
      sessionPackageSettings: {
        enabled:
          center?.sessionPackageSettings?.enabled ?? false,

        sessionsPerPackage:
          center?.sessionPackageSettings?.sessionsPerPackage ?? 10,

        priceCents:
          center?.sessionPackageSettings?.priceCents ?? 0,

        currency: "EUR",
      },
    };
  }
);
/**
 * Actualiza una sección de la configuración del centro.
 *
 * Permisos:
 * - developer: lectura y escritura.
 * - owner: lectura y escritura, con cuenta activada.
 *
 * Los permisos se comprueban en Firebase.
 */
export const updateCenterSettings = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const section = request.data?.section;
    const payload = request.data?.data;

    const allowedSections = [
      "general",
      "contact",
      "address",
      "socialMedia",
      "advanced",
      "sessionPackages",
    ] as const;

    if (
      !allowedSections.some((allowed) => allowed === section) ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La configuración enviada no es válida."
      );
    }

    const input = payload as Record<string, unknown>;

    // Rechazar propiedades desconocidas.
    const validateKeys = (allowed: string[]) => {
      const keys = Object.keys(input);

      if (
        keys.length === 0 ||
        keys.some((key) => !allowed.includes(key))
      ) {
        throw new HttpsError(
          "invalid-argument",
          "La sección contiene campos no permitidos."
        );
      }
    };

    const readString = (key: string, maxLength: number) => {
      const value = input[key];

      if (typeof value !== "string" || value.length > maxLength) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      return value.trim();
    };

    const readBoolean = (key: string) => {
      if (typeof input[key] !== "boolean") {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} debe ser verdadero o falso.`
        );
      }

      return input[key] as boolean;
    };

    let updates: Record<string, unknown> = {};

    switch (section) {
      case "general": {
        validateKeys(["name", "description"]);

        const name = readString("name", 120);
        const description = readString("description", 1000);

        if (!name) {
          throw new HttpsError(
            "invalid-argument",
            "El nombre del centro es obligatorio."
          );
        }

        updates = { name, description };
        break;
      }

      case "contact": {
        const keys = [
          "phone",
          "mobile",
          "whatsapp",
          "email",
          "website",
        ];

        validateKeys(keys);

        const values = Object.fromEntries(
          keys.map((key) => [key, readString(key, 200)])
        );

        const email = values.email;

        if (
          email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          throw new HttpsError(
            "invalid-argument",
            "El correo electrónico no es válido."
          );
        }

        if (values.website) {
          try {
            const url = new URL(values.website);
            if (!["https:", "http:"].includes(url.protocol)) {
              throw new Error("Protocolo no permitido");
            }
          } catch {
            throw new HttpsError(
              "invalid-argument",
              "La dirección web no es válida."
            );
          }
        }

        updates = { contact: values };
        break;
      }

      case "address": {
        const keys = [
          "street",
          "number",
          "floor",
          "door",
          "postalCode",
          "city",
          "province",
          "country",
        ];

        validateKeys(keys);

        const values = Object.fromEntries(
          keys.map((key) => [key, readString(key, 150)])
        );

        if (
          values.country &&
          !/^[A-Z]{2}$/.test(values.country.toUpperCase())
        ) {
          throw new HttpsError(
            "invalid-argument",
            "El país debe tener un código ISO de dos letras."
          );
        }

        values.country = values.country.toUpperCase();

        values.formattedAddress = [
          [values.street, values.number].filter(Boolean).join(", "),
          [
            values.floor ? `Piso ${values.floor}` : "",
            values.door ? `Puerta ${values.door}` : "",
          ].filter(Boolean).join(", "),
          [values.postalCode, values.city].filter(Boolean).join(" "),
          values.province,
          values.country,
        ]
          .filter(Boolean)
          .join(", ");

        updates = { address: values };
        break;
      }

      case "socialMedia": {
        const keys = [
          "instagram",
          "facebook",
          "tiktok",
          "youtube",
          "linkedin",
          "x",
        ];

        validateKeys(keys);

        const values = Object.fromEntries(
          keys.map((key) => [key, readString(key, 300)])
        );

        for (const [key, value] of Object.entries(values)) {
          if (!value) continue;

          try {
            const url = new URL(value);

            if (
              !["https:", "http:"].includes(url.protocol) ||
              !url.hostname
            ) {
              throw new Error("URL no válida");
            }
          } catch {
            throw new HttpsError(
              "invalid-argument",
              `El enlace de ${key} no es válido.`
            );
          }
        }

        updates = { socialMedia: values };
        break;
      }
      case "sessionPackages": {
  validateKeys([
    "enabled",
    "priceCents",
    "sessionsPerPackage",
  ]);

  const enabled = readBoolean("enabled");

  const priceCents = input.priceCents;

  const sessionsPerPackage =
    input.sessionsPerPackage;

  // Validar número de sesiones
  if (
    typeof sessionsPerPackage !== "number" ||
    !Number.isInteger(sessionsPerPackage) ||
    sessionsPerPackage < 1 ||
    sessionsPerPackage > 100
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El bono debe contener entre 1 y 100 sesiones."
    );
  }

  // Validar precio
  if (
    typeof priceCents !== "number" ||
    !Number.isSafeInteger(priceCents) ||
    priceCents < 0 ||
    priceCents > 10000000
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El precio del bono no es válido."
    );
  }

  if (enabled && priceCents === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Debes establecer un precio mayor que cero para activar los bonos."
    );
  }

  updates = {
    sessionPackageSettings: {
      enabled,
      sessionsPerPackage,
      priceCents,
      currency: "EUR",
    },
  };

  break;
}

      case "advanced": {
        validateKeys([
          "timezone",
          "allowClientCancellation",
          "allowClientRescheduling",
          "allowRecurringBookings",
          "defaultDurationMinutes",
          "recurringIntervalsWeeks",
        ]);

        const timezone = readString("timezone", 100);

        if (timezone !== "Europe/Madrid") {
          throw new HttpsError(
            "invalid-argument",
            "La zona horaria no está permitida."
          );
        }

        const duration = input.defaultDurationMinutes;

        if (
          typeof duration !== "number" ||
          ![30, 45, 60, 90, 120].includes(duration)
        ) {
          throw new HttpsError(
            "invalid-argument",
            "La duración de las sesiones no es válida."
          );
        }

        const intervals = input.recurringIntervalsWeeks;

        if (
          !Array.isArray(intervals) ||
          intervals.some(
            (value) =>
              typeof value !== "number" ||
              ![1, 2, 3, 4].includes(value)
          ) ||
          new Set(intervals).size !== intervals.length
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Los intervalos de recurrencia no son válidos."
          );
        }

        const allowRecurringBookings =
          readBoolean("allowRecurringBookings");

        if (allowRecurringBookings && intervals.length === 0) {
          throw new HttpsError(
            "invalid-argument",
            "Selecciona al menos un intervalo de recurrencia."
          );
        }

        updates = {
          timezone,
          bookingSettings: {
            allowClientCancellation:
              readBoolean("allowClientCancellation"),
            allowClientRescheduling:
              readBoolean("allowClientRescheduling"),
            allowRecurringBookings,
            defaultDurationMinutes: duration,
            recurringIntervalsWeeks: [...intervals].sort(
              (a, b) => a - b
            ),
          },
        };
        break;
      }
    }

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
  roles.includes("owner") &&
  centerData?.ownerActivated === true &&
  centerData?.ownerUid === uid;

const isDeveloper = roles.includes("developer");

if (
  userData?.centerId !== CENTER_ID ||
  (!isOwner && !isDeveloper)
) {
  throw new HttpsError(
    "permission-denied",
    "No tienes permisos para modificar la configuración del centro."
  );
}

      transaction.update(centerRef, {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true };
  }
);
/**
 * Consulta pacientes del centro.
 *
 * La propietaria puede consultar pacientes reales.
 * El desarrollador solo puede consultar pacientes de prueba.
 *
 * No devuelve información clínica.
 */
export const getCenterClients = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const userSnapshot = await db
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnapshot.exists) {
      throw new HttpsError(
        "permission-denied",
        "No existe el perfil de usuario."
      );
    }

    const userData = userSnapshot.data();

    const roles: string[] = Array.isArray(userData?.roles)
      ? userData.roles
      : [];

    if (userData?.centerId !== CENTER_ID) {
      throw new HttpsError(
        "permission-denied",
        "No perteneces a este centro."
      );
    }

    const centerRef = db.collection("centers").doc(CENTER_ID);
    const centerSnapshot = await centerRef.get();

    if (!centerSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El centro no existe."
      );
    }

    const centerData = centerSnapshot.data();

    const isOwner =
      roles.includes("owner") &&
      centerData?.ownerActivated === true &&
      centerData?.ownerUid === uid;

    const isDeveloper = roles.includes("developer");

    if (!isOwner && !isDeveloper) {
      throw new HttpsError(
        "permission-denied",
        "No tienes permisos para consultar pacientes."
      );
    }

    const clientsRef = centerRef.collection("clients");

    // El desarrollador solo puede consultar
    // documentos marcados como pacientes de prueba.
    const query = isOwner
      ? clientsRef
      : clientsRef.where("isTest", "==", true);

    const snapshot = await query.limit(100).get();

 const clients = snapshot.docs.map((document) => {
  const data = document.data();

  // La vinculación solo se considera completada
  // cuando existe una cuenta asociada.
  const isLinked =
    typeof data.userId === "string" &&
    data.userId.length > 0;

  let linkingStatus: "linked" | "pending" | "none" = "none";

  if (isLinked) {
    linkingStatus = "linked";
  } else if (
    data.linking?.status === "pending" &&
    typeof data.linking?.codeHash === "string"
  ) {
    linkingStatus = "pending";
  }

  return {
    id: document.id,

    name:
      typeof data.name === "string"
        ? data.name
        : "",

    surname:
      typeof data.surname === "string"
        ? data.surname
        : "",

    phone:
      typeof data.phone === "string"
        ? data.phone
        : "",

    email:
      typeof data.email === "string"
        ? data.email
        : "",

    status:
      data.status === "inactive"
        ? "inactive"
        : "active",

    isTest: data.isTest === true,

    // Papelera de pacientes.
    deleted: data.deleted === true,

    // Estado de vinculación.
    linkingStatus,

    // Fecha de vinculación, si existe.
    linkedAt:
      isLinked && data.linking?.usedAt instanceof Timestamp
        ? data.linking.usedAt.toDate().toISOString()
        : null,
  };
});

    return {
      success: true,
      clients,
    };
  }
);
/**
 * Registra un paciente manualmente.
 *
 * Owner: crea pacientes reales.
 * Developer: crea únicamente pacientes de prueba.
 *
 * No crea una cuenta de Firebase Authentication.
 * No registra información clínica.
 */
export const createCenterClient = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos del paciente no son válidos."
      );
    }

    const allowedKeys = [
      "name",
      "surname",
      "phone",
      "email",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const readString = (
      key: string,
      maxLength: number
    ): string => {
      const value = input[key];

      if (
        typeof value !== "string" ||
        value.length > maxLength
      ) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      return value.trim();
    };

    const name = readString("name", 100);
    const surname = readString("surname", 150);
    const phone = readString("phone", 30);
    const email = readString("email", 200).toLowerCase();

    if (!name || !surname || !phone) {
      throw new HttpsError(
        "invalid-argument",
        "Nombre, apellidos y teléfono son obligatorios."
      );
    }

    if (!/^\+?[0-9\s()-]{7,30}$/.test(phone)) {
      throw new HttpsError(
        "invalid-argument",
        "El teléfono no tiene un formato válido."
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El correo electrónico no es válido."
      );
    }

   

const clientRef = centerRef.collection("clients").doc();
const linking = generatePatientLinkCode();

const linkingCodeRef = centerRef
  .collection("patientLinkCodes")
  .doc(linking.codeHash);

const linkingExpiresAt = Timestamp.fromMillis(
  Date.now() + PATIENT_LINK_CODE_EXPIRY_MS
);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const linkingCodeSnapshot =
        await transaction.get(linkingCodeRef);

      if (linkingCodeSnapshot.exists) {
        throw new HttpsError(
          "already-exists",
          "Se ha producido una coincidencia al generar el código. Inténtalo de nuevo."
        );
      }

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper = roles.includes("developer");

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para registrar pacientes."
        );
      }

      // El tipo de paciente se determina en el servidor.
      // La aplicación no puede decidir si es de prueba.
      const isTest = !isOwner && isDeveloper;

      transaction.create(clientRef, {
        name,
        surname,
        phone,
        email,

        status: "active",
        source: "manual",
        isTest,

        // El paciente todavía no tiene cuenta vinculada.
        userId: null,

        // Código para vincular una futura cuenta.
        linking: {
          status: "pending",
          codeHash: linking.codeHash,

          createdAt: FieldValue.serverTimestamp(),

         expiresAt: linkingExpiresAt,

          usedAt: null,
          usedBy: null,
        },

        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(linkingCodeRef, {
        clientId: clientRef.id,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: linkingExpiresAt,
      });
  });

    return {
  success: true,
  clientId: clientRef.id,

  // Se devuelve una única vez.
  // No se almacena en texto plano.
  linkingCode: linking.code,
};
  }
);

/**
 * Actualiza los datos administrativos de un paciente.
 *
 * Owner: puede editar pacientes del centro.
 * Developer: únicamente pacientes de prueba.
 *
 * No modifica citas, bonos, datos clínicos ni vinculación.
 */
export const updateCenterClient = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos enviados no son válidos."
      );
    }

    const allowedKeys = [
      "clientId",
      "name",
      "surname",
      "phone",
      "email",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const readString = (
      key: string,
      maxLength: number
    ): string => {
      const value = input[key];

      if (
        typeof value !== "string" ||
        value.length > maxLength
      ) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      return value.trim();
    };

    const clientId = readString("clientId", 150);
    const name = readString("name", 100);
    const surname = readString("surname", 150);
    const phone = readString("phone", 30);
    const email = readString("email", 200).toLowerCase();

    if (
      !clientId ||
      clientId.includes("/") ||
      clientId === "." ||
      clientId === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    if (!name || !surname || !phone) {
      throw new HttpsError(
        "invalid-argument",
        "Nombre, apellidos y teléfono son obligatorios."
      );
    }

    if (!/^\+?[0-9\s()-]{7,30}$/.test(phone)) {
      throw new HttpsError(
        "invalid-argument",
        "El teléfono no tiene un formato válido."
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El correo electrónico no es válido."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);
    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      if (!clientSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "El paciente no existe."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper = roles.includes("developer");

      if (userData?.centerId !== CENTER_ID) {
        throw new HttpsError(
          "permission-denied",
          "No perteneces a este centro."
        );
      }

      if (!isOwner && !isDeveloper) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para editar pacientes."
        );
      }

      if (!isOwner && clientData?.isTest !== true) {
        throw new HttpsError(
          "permission-denied",
          "Solo puedes editar pacientes de prueba."
        );
      }

      transaction.update(clientRef, {
        name,
        surname,
        phone,
        email,
        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
    };
  }
);
/**
 * Activa o desactiva un paciente del centro.
 *
 * Owner:
 * - Puede modificar pacientes del centro.
 *
 * Developer:
 * - Solo puede modificar pacientes de prueba.
 *
 * No elimina fichas, citas, bonos ni historial.
 * No modifica Firebase Authentication.
 */
export const setCenterClientStatus = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos enviados no son válidos."
      );
    }

    const allowedKeys = ["clientId", "status"];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const { clientId, status } = input;

    if (
      typeof clientId !== "string" ||
      !clientId.trim() ||
      clientId.length > 150 ||
      clientId.includes("/") ||
      clientId === "." ||
      clientId === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    if (status !== "active" && status !== "inactive") {
      throw new HttpsError(
        "invalid-argument",
        "El estado del paciente no es válido."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);
    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      if (!clientSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "El paciente no existe."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper = roles.includes("developer");

      if (userData?.centerId !== CENTER_ID) {
        throw new HttpsError(
          "permission-denied",
          "No perteneces a este centro."
        );
      }

      if (!isOwner && !isDeveloper) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para modificar pacientes."
        );
      }

      // El desarrollador nunca puede modificar
      // pacientes reales.
      if (!isOwner && clientData?.isTest !== true) {
        throw new HttpsError(
          "permission-denied",
          "Solo puedes modificar pacientes de prueba."
        );
      }

      // Evitamos escrituras innecesarias.
      if (clientData?.status === status) {
        return;
      }

      transaction.update(clientRef, {
        status,
        statusUpdatedBy: uid,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
      status,
    };
  }
);
/**
 * Envía un paciente a la papelera.
 *
 * No elimina físicamente su documento.
 * Conserva sus citas, bonos y vinculación.
 */
export const deleteCenterClient = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((key) => key !== "clientId")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos enviados no son válidos."
      );
    }

    const clientId = input.clientId;

    if (
      typeof clientId !== "string" ||
      !clientId.trim() ||
      clientId.length > 150 ||
      clientId.includes("/") ||
      clientId === "." ||
      clientId === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);
    const clientRef = centerRef.collection("clients").doc(clientId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      if (!clientSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "El paciente no existe."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper = roles.includes("developer");

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para eliminar pacientes."
        );
      }

      if (!isOwner && clientData?.isTest !== true) {
        throw new HttpsError(
          "permission-denied",
          "Solo puedes eliminar pacientes de prueba."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "El paciente ya está en la papelera."
        );
      }

      transaction.update(clientRef, {
        deleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
    };
  }
);
/**
 * Restaura un paciente desde la papelera.
 *
 * Mantiene el identificador original
 * y todos sus datos asociados.
 */
export const restoreCenterClient = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
  !input ||
  typeof input !== "object" ||
  Array.isArray(input) ||
  typeof input.clientId !== "string" ||
  !input.clientId.trim() ||
  input.clientId.length > 150 ||
  input.clientId.includes("/") ||
  input.clientId.trim() === "." ||
  input.clientId.trim() === ".."
) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos enviados no son válidos."
      );
    }

    const clientId = input.clientId;

    if (
      typeof clientId !== "string" ||
      !clientId.trim() ||
      clientId.length > 150 ||
      clientId.includes("/") ||
      clientId === "." ||
      clientId === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);
    const clientRef = centerRef.collection("clients").doc(clientId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      if (!clientSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "El paciente no existe."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper = roles.includes("developer");

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para restaurar pacientes."
        );
      }

      if (!isOwner && clientData?.isTest !== true) {
        throw new HttpsError(
          "permission-denied",
          "Solo puedes restaurar pacientes de prueba."
        );
      }

      if (clientData?.deleted !== true) {
        throw new HttpsError(
          "failed-precondition",
          "El paciente no está en la papelera."
        );
      }

      transaction.update(clientRef, {
        deleted: false,
        deletedAt: FieldValue.delete(),
        deletedBy: FieldValue.delete(),
        restoredAt: FieldValue.serverTimestamp(),
        restoredBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
    };
  }
);
/**
 * Regenera el código de vinculación de un paciente.
 *
 * Owner:
 * - Puede regenerar códigos de pacientes del centro.
 *
 * Developer:
 * - Solo puede regenerar códigos de pacientes de prueba.
 *
 * Seguridad:
 * - No permite pacientes eliminados o inactivos.
 * - No permite pacientes ya vinculados.
 * - Invalida el código anterior.
 * - Evita códigos duplicados.
 * - El código original solo se devuelve una vez.
 */
export const regenerateClientLinkingCode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) => key !== "clientId"
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos enviados no son válidos."
      );
    }

    const clientId = input.clientId;

    if (
      typeof clientId !== "string" ||
      !clientId.trim() ||
      clientId.length > 150 ||
      clientId.includes("/") ||
      clientId === "." ||
      clientId === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    // Generamos el código antes de la transacción.
    const linking = generatePatientLinkCode();

    const newCodeRef = centerRef
      .collection("patientLinkCodes")
      .doc(linking.codeHash);

    const expiresAt = Timestamp.fromMillis(
      Date.now() + PATIENT_LINK_CODE_EXPIRY_MS
    );

    await db.runTransaction(async (transaction) => {
      // Todas las lecturas antes de las escrituras.
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);
      const newCodeSnapshot = await transaction.get(newCodeRef);
      const previousCodeHash =
  typeof clientSnapshot.data()?.linking?.codeHash === "string"
    ? clientSnapshot.data()!.linking.codeHash
    : null;

const previousCodeRef =
  previousCodeHash && previousCodeHash !== linking.codeHash
    ? centerRef
        .collection("patientLinkCodes")
        .doc(previousCodeHash)
    : null;

const previousCodeSnapshot = previousCodeRef
  ? await transaction.get(previousCodeRef)
  : null;

      if (!userSnapshot.exists || !centerSnapshot.exists) {
        throw new HttpsError(
          "failed-precondition",
          "No se ha encontrado el usuario o el centro."
        );
      }

      if (!clientSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "El paciente no existe."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper = roles.includes("developer");

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para regenerar códigos."
        );
      }

      if (!isOwner && clientData?.isTest !== true) {
        throw new HttpsError(
          "permission-denied",
          "Solo puedes modificar pacientes de prueba."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "No puedes generar códigos para pacientes eliminados."
        );
      }

      if (clientData?.status !== "active") {
        throw new HttpsError(
          "failed-precondition",
          "El paciente debe estar activo."
        );
      }

      if (
        typeof clientData?.userId === "string" &&
        clientData.userId.length > 0
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Este paciente ya tiene una cuenta vinculada."
        );
      }

      if (newCodeSnapshot.exists) {
        throw new HttpsError(
          "already-exists",
          "Se ha generado un código repetido. Inténtalo de nuevo."
        );
      }

      // Invalidamos el código anterior únicamente
    // si su registro corresponde a este paciente.
    if (previousCodeRef && previousCodeSnapshot?.exists) {
      const previousCodeData = previousCodeSnapshot.data();

      if (previousCodeData?.clientId !== clientId) {
        throw new HttpsError(
          "failed-precondition",
          "El código anterior pertenece a otro paciente."
        );
      }

      transaction.delete(previousCodeRef);
    }

      // Registramos el código nuevo.
      transaction.create(newCodeRef, {
        clientId,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
      });

      // Actualizamos la ficha del paciente.
      transaction.update(clientRef, {
        linking: {
          status: "pending",
          codeHash: linking.codeHash,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt,
          usedAt: null,
          usedBy: null,
        },

        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
      linkingCode: linking.code,
      expiresAt: expiresAt.toDate().toISOString(),
    };
  }
);

/**
 * Obtiene la ficha clínica de un paciente.
 *
 * Permisos:
 * - Owner: pacientes del centro.
 * - Developer: únicamente pacientes de prueba.
 * - Client: únicamente su ficha vinculada.
 *
 * Las observaciones internas nunca se devuelven
 * al paciente.
 */
export const getPatientClinicalProfile = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      typeof input.clientId !== "string" ||
      !input.clientId.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const clientId = input.clientId.trim();

    const userSnapshot = await db
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnapshot.exists) {
      throw new HttpsError(
        "permission-denied",
        "No existe el perfil de usuario."
      );
    }

    const userData = userSnapshot.data();

    if (userData?.centerId !== CENTER_ID) {
      throw new HttpsError(
        "permission-denied",
        "No perteneces a este centro."
      );
    }

    const roles: string[] = Array.isArray(userData?.roles)
      ? userData.roles
      : [];

    const centerRef = db.collection("centers").doc(CENTER_ID);

    const centerSnapshot = await centerRef.get();

    if (!centerSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El centro no existe."
      );
    }

    const centerData = centerSnapshot.data();

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    const clientSnapshot = await clientRef.get();

    if (!clientSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El paciente no existe."
      );
    }

    const clientData = clientSnapshot.data();

    if (clientData?.deleted === true) {
      throw new HttpsError(
        "failed-precondition",
        "El paciente está en la papelera."
      );
    }

    const isOwner =
      roles.includes("owner") &&
      centerData?.ownerActivated === true &&
      centerData?.ownerUid === uid;

    const isDeveloper =
      roles.includes("developer") &&
      clientData?.isTest === true;

    const isPatient =
      roles.includes("client") &&
      userData?.clientId === clientId &&
      clientData?.userId === uid &&
      clientData?.status === "active";

    if (!isOwner && !isDeveloper && !isPatient) {
      throw new HttpsError(
        "permission-denied",
        "No tienes permisos para consultar esta ficha clínica."
      );
    }
    // Acceso profesional autorizado.
    // El rol de paciente nunca concede acceso a notas internas.
    const canReadInternalNotes = isOwner || isDeveloper;
    const clinicalSnapshot = await clientRef
      .collection("clinical")
      .doc("profile")
      .get();

    const clinicalData = clinicalSnapshot.data();

    const readString = (value: unknown): string =>
      typeof value === "string" ? value : "";

    const toISOString = (value: unknown): string | null =>
      value instanceof Timestamp
        ? value.toDate().toISOString()
        : null;

    const profile = {
      clientId,

      reasonForConsultation: readString(
        clinicalData?.reasonForConsultation
      ),

      affectedArea: readString(
        clinicalData?.affectedArea
      ),

      medicalHistory: readString(
        clinicalData?.medicalHistory
      ),

      // Nunca enviar notas internas al paciente.
     observations: canReadInternalNotes
      ? readString(clinicalData?.observations)
      : "",

      patientInstructions: readString(
        clinicalData?.patientInstructions
      ),

      createdAt: toISOString(clinicalData?.createdAt),
      updatedAt: toISOString(clinicalData?.updatedAt),

      updatedBy: canReadInternalNotes
  ? readString(clinicalData?.updatedBy)
  : null,
    };

    return {
      success: true,
      profile,
    };
  }
);

/**
 * Crea o actualiza la ficha clínica.
 *
 * El paciente no puede modificarla.
 */
export const updatePatientClinicalProfile = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos clínicos no son válidos."
      );
    }

    const allowedKeys = [
      "clientId",
      "reasonForConsultation",
      "affectedArea",
      "medicalHistory",
      "observations",
      "patientInstructions",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const clientId = input.clientId;

if (
  typeof clientId !== "string" ||
  !clientId.trim() ||
  clientId.length > 150 ||
  clientId.includes("/") ||
  clientId.trim() === "." ||
  clientId.trim() === ".."
) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const readString = (
      key: string,
      maxLength: number
    ): string => {
      const value = input[key];

      if (
        typeof value !== "string" ||
        value.length > maxLength
      ) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      return value.trim();
    };

    const clinicalData = {
      reasonForConsultation: readString(
        "reasonForConsultation",
        2000
      ),

      affectedArea: readString(
        "affectedArea",
        1000
      ),

      medicalHistory: readString(
        "medicalHistory",
        5000
      ),

      observations: readString(
        "observations",
        10000
      ),

      patientInstructions: readString(
        "patientInstructions",
        5000
      ),
    };

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);
    const clientRef = centerRef
      .collection("clients")
      .doc(clientId.trim());

    const clinicalRef = clientRef
      .collection("clinical")
      .doc("profile");

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);
      const clinicalSnapshot = await transaction.get(clinicalRef);

      if (
        !userSnapshot.exists ||
        !centerSnapshot.exists ||
        !clientSnapshot.exists
      ) {
        throw new HttpsError(
          "not-found",
          "No se ha encontrado el usuario, centro o paciente."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper =
        roles.includes("developer") &&
        clientData?.isTest === true;

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para modificar esta ficha clínica."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "No se puede editar un paciente eliminado."
        );
      }

      if (clinicalSnapshot.exists) {
        transaction.update(clinicalRef, {
          ...clinicalData,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: uid,
        });
      } else {
        transaction.create(clinicalRef, {
          ...clinicalData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: uid,
        });
      }
    });

    return {
      success: true,
      clientId: clientId.trim(),
    };
  }
);
/**
 * Crea un episodio clínico para un paciente.
 *
 * Un paciente puede tener varios episodios abiertos.
 *
 * Permisos:
 * - Owner: pacientes de su centro.
 * - Developer: únicamente pacientes de prueba.
 */
export const createPatientClinicalEpisode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos del episodio no son válidos."
      );
    }

    const allowedKeys = [
      "clientId",
      "title",
      "reasonForConsultation",
      "affectedArea",
      "observations",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const clientId = input.clientId;

    if (
      typeof clientId !== "string" ||
      !clientId.trim() ||
      clientId.length > 150 ||
      clientId.includes("/") ||
      clientId.trim() === "." ||
      clientId.trim() === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const readString = (
      key: string,
      maxLength: number,
      required = false
    ): string => {
      const value = input[key];

      if (
        typeof value !== "string" ||
        value.length > maxLength
      ) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      const normalized = value.trim();

      if (required && !normalized) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} es obligatorio.`
        );
      }

      return normalized;
    };

    const episodeData = {
      title: readString("title", 200, true),
      reasonForConsultation: readString(
        "reasonForConsultation",
        2000
      ),
      affectedArea: readString("affectedArea", 1000),
      observations: readString("observations", 10000),
    };

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId.trim());

    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc();

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);

      if (
        !userSnapshot.exists ||
        !centerSnapshot.exists ||
        !clientSnapshot.exists
      ) {
        throw new HttpsError(
          "not-found",
          "No se ha encontrado el usuario, centro o paciente."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper =
        roles.includes("developer") &&
        clientData?.isTest === true;

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para crear episodios clínicos."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "No se pueden crear episodios para un paciente eliminado."
        );
      }

      transaction.create(episodeRef, {
        ...episodeData,

        status: "open",

        openedAt: FieldValue.serverTimestamp(),
        closedAt: null,
        closingReason: "",

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),

        createdBy: uid,
        updatedBy: uid,
      });
      const auditRef = episodeRef
  .collection("events")
  .doc();

transaction.create(
  auditRef,
  buildClinicalEpisodeAuditEvent("created", uid, {
    status: "open",
  })
);
    });

    return {
      success: true,
      clientId: clientId.trim(),
      episodeId: episodeRef.id,
    };
  }
);
/**
 * Obtiene los episodios clínicos de un paciente.
 *
 * Permisos:
 * - Owner: pacientes de su centro.
 * - Developer: únicamente pacientes de prueba.
 *
 * No permite acceso directo a pacientes.
 * Comprueba los permisos antes de consultar datos clínicos.
 */
export const getPatientClinicalEpisodes = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // 1. Comprobar autenticación.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    // 2. Validar los parámetros.
    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) => key !== "clientId"
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de consulta no son válidos."
      );
    }

    if (typeof input.clientId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    const clientId = input.clientId.trim();

    if (
      !clientId ||
      clientId.length > 150 ||
      clientId.includes("/") ||
      clientId === "." ||
      clientId === ".."
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del paciente no es válido."
      );
    }

    // 3. Preparar referencias.
    const userRef = db.collection("users").doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    // 4. Consultar únicamente documentos necesarios
    // para verificar los permisos.
    const [
      userSnapshot,
      centerSnapshot,
      clientSnapshot,
    ] = await Promise.all([
      userRef.get(),
      centerRef.get(),
      clientRef.get(),
    ]);

    if (
      !userSnapshot.exists ||
      !centerSnapshot.exists ||
      !clientSnapshot.exists
    ) {
      throw new HttpsError(
        "not-found",
        "No se ha encontrado el usuario, centro o paciente."
      );
    }

    const userData = userSnapshot.data();
    const centerData = centerSnapshot.data();
    const clientData = clientSnapshot.data();

    // 5. Verificar permisos.
    const roles: string[] = Array.isArray(userData?.roles)
      ? userData.roles
      : [];

    const isOwner =
      roles.includes("owner") &&
      centerData?.ownerActivated === true &&
      centerData?.ownerUid === uid;

    const isDeveloper =
      roles.includes("developer") &&
      clientData?.isTest === true;

    if (
      userData?.centerId !== CENTER_ID ||
      (!isOwner && !isDeveloper)
    ) {
      throw new HttpsError(
        "permission-denied",
        "No tienes permisos para consultar estos episodios."
      );
    }

    // 6. Impedir consultas de pacientes eliminados.
    if (clientData?.deleted === true) {
      throw new HttpsError(
        "failed-precondition",
        "El paciente está en la papelera."
      );
    }

    // 7. Los permisos ya están comprobados.
    // Ahora sí consultamos los datos clínicos.
    const episodesSnapshot = await clientRef
      .collection("clinicalEpisodes")
      .orderBy("openedAt", "desc")
      .limit(100)
      .get();

    // 8. Funciones de conversión.
    const toISOString = (
      value: unknown
    ): string | null => {
      return value instanceof Timestamp
        ? value.toDate().toISOString()
        : null;
    };

    const readString = (
      value: unknown
    ): string => {
      return typeof value === "string"
        ? value
        : "";
    };

    // 9. Preparar respuesta.
    const episodes = episodesSnapshot.docs.map(
      (document) => {
        const data = document.data();

        return {
          episodeId: document.id,
          clientId,

          title: readString(data.title),

          reasonForConsultation: readString(
            data.reasonForConsultation
          ),

          affectedArea: readString(
            data.affectedArea
          ),

          observations: readString(
            data.observations
          ),

          status:
            data.status === "closed"
              ? "closed"
              : "open",

          openedAt: toISOString(data.openedAt),

          closedAt: toISOString(data.closedAt),

          closingReason: readString(
            data.closingReason
          ),

          createdAt: toISOString(data.createdAt),

          updatedAt: toISOString(data.updatedAt),
        };
      }
    );

    // 10. Ordenar:
    // Primero abiertos, después cerrados.
    // Dentro de cada grupo, los más recientes primero.
    episodes.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "open" ? -1 : 1;
      }

      return (b.openedAt ?? "").localeCompare(
        a.openedAt ?? ""
      );
    });

    // 11. Devolver resultado.
    return {
      success: true,
      clientId,
      episodes,
    };
  }
);
/**
 * Cierra un episodio clínico.
 *
 * Un paciente puede tener varios episodios abiertos.
 * El cierre afecta únicamente al episodio indicado.
 */
export const closePatientClinicalEpisode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) =>
          !["clientId", "episodeId", "closingReason"].includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de cierre no son válidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    if (
      typeof input.closingReason !== "string" ||
      input.closingReason.trim().length > 2000
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El motivo de cierre no es válido."
      );
    }

    const closingReason = input.closingReason.trim();

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc(episodeId);

    await db.runTransaction(async (transaction) => {
  // 1. Consultar usuario, centro y paciente.
  const userSnapshot = await transaction.get(userRef);
  const centerSnapshot = await transaction.get(centerRef);
  const clientSnapshot = await transaction.get(clientRef);

  if (
    !userSnapshot.exists ||
    !centerSnapshot.exists ||
    !clientSnapshot.exists
  ) {
    throw new HttpsError(
      "not-found",
      "No se ha encontrado el usuario, centro o paciente."
    );
  }

  const userData = userSnapshot.data();
  const centerData = centerSnapshot.data();
  const clientData = clientSnapshot.data();

  const roles: string[] = Array.isArray(userData?.roles)
    ? userData.roles
    : [];

  // 2. Comprobar permisos.
  const isOwner =
    roles.includes("owner") &&
    centerData?.ownerActivated === true &&
    centerData?.ownerUid === uid;

  const isDeveloper =
    roles.includes("developer") &&
    clientData?.isTest === true;

  if (
    userData?.centerId !== CENTER_ID ||
    (!isOwner && !isDeveloper)
  ) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para cerrar este episodio."
    );
  }

  if (clientData?.deleted === true) {
    throw new HttpsError(
      "failed-precondition",
      "El paciente está en la papelera."
    );
  }

  // 3. Consultar el episodio después de autorizar.
  const episodeSnapshot = await transaction.get(episodeRef);

  if (!episodeSnapshot.exists) {
    throw new HttpsError(
      "not-found",
      "El episodio clínico no existe."
    );
  }

  const episodeData = episodeSnapshot.data();

  if (episodeData?.status !== "open") {
    throw new HttpsError(
      "failed-precondition",
      "El episodio no está abierto."
    );
  }

  // 4. Cerrar únicamente el episodio seleccionado.
  transaction.update(episodeRef, {
    status: "closed",
    closedAt: FieldValue.serverTimestamp(),
    closingReason,
    closedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });

  // 5. Registrar el cierre en la auditoría.
  const auditRef = episodeRef
    .collection("events")
    .doc();

  transaction.create(
    auditRef,
    buildClinicalEpisodeAuditEvent("closed", uid, {
      previousStatus: "open",
      newStatus: "closed",
      closingReason,
    })
  );
});

    return {
      success: true,
      clientId,
      episodeId,
      status: "closed",
    };
  }
);
/**
 * Reabre un episodio clínico cerrado.
 *
 * Permisos:
 * - Owner: pacientes de su centro.
 * - Developer: únicamente pacientes de prueba.
 */
export const reopenPatientClinicalEpisode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) => !["clientId", "episodeId"].includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de reapertura no son válidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc(episodeId);

    await db.runTransaction(async (transaction) => {
  // 1. Consultar usuario, centro y paciente.
  const userSnapshot = await transaction.get(userRef);
  const centerSnapshot = await transaction.get(centerRef);
  const clientSnapshot = await transaction.get(clientRef);

  if (
    !userSnapshot.exists ||
    !centerSnapshot.exists ||
    !clientSnapshot.exists
  ) {
    throw new HttpsError(
      "not-found",
      "No se ha encontrado el usuario, centro o paciente."
    );
  }

  const userData = userSnapshot.data();
  const centerData = centerSnapshot.data();
  const clientData = clientSnapshot.data();

  const roles: string[] = Array.isArray(userData?.roles)
    ? userData.roles
    : [];

  // 2. Comprobar permisos.
  const isOwner =
    roles.includes("owner") &&
    centerData?.ownerActivated === true &&
    centerData?.ownerUid === uid;

  const isDeveloper =
    roles.includes("developer") &&
    clientData?.isTest === true;

  if (
    userData?.centerId !== CENTER_ID ||
    (!isOwner && !isDeveloper)
  ) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para reabrir este episodio."
    );
  }

  if (clientData?.deleted === true) {
    throw new HttpsError(
      "failed-precondition",
      "El paciente está en la papelera."
    );
  }

  // 3. Consultar el episodio después de autorizar.
  const episodeSnapshot = await transaction.get(episodeRef);

  if (!episodeSnapshot.exists) {
    throw new HttpsError(
      "not-found",
      "El episodio clínico no existe."
    );
  }

  const episodeData = episodeSnapshot.data();

  if (episodeData?.status !== "closed") {
    throw new HttpsError(
      "failed-precondition",
      "Solo se pueden reabrir episodios cerrados."
    );
  }

  // 4. Conservar los datos del cierre anterior
  // en la auditoría antes de limpiar el cierre vigente.
  const previousClosingReason =
    typeof episodeData.closingReason === "string"
      ? episodeData.closingReason
      : "";

  const previousClosedBy =
    typeof episodeData.closedBy === "string"
      ? episodeData.closedBy
      : "";

  const previousClosedAt =
    episodeData.closedAt instanceof Timestamp
      ? episodeData.closedAt
      : null;

  // 5. Reabrir el episodio.
  transaction.update(episodeRef, {
    status: "open",

    // Ya no existe un cierre vigente.
    closedAt: null,
    closingReason: "",
    closedBy: null,

    reopenedAt: FieldValue.serverTimestamp(),
    reopenedBy: uid,

    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });

  // 6. Registrar la reapertura y conservar
  // los datos del cierre anterior.
  const auditRef = episodeRef
    .collection("events")
    .doc();

  transaction.create(
    auditRef,
    buildClinicalEpisodeAuditEvent("reopened", uid, {
      previousStatus: "closed",
      newStatus: "open",
      previousClosedAt,
      previousClosedBy,
      previousClosingReason,
    })
  );
});

    return {
      success: true,
      clientId,
      episodeId,
      status: "open",
    };
  }
);
/**
 * Obtiene un episodio clínico individual.
 *
 * Permisos:
 * - Owner: pacientes de su centro.
 * - Developer: únicamente pacientes de prueba.
 *
 * No permite acceso directo a pacientes.
 */
export const getPatientClinicalEpisode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) => !["clientId", "episodeId"].includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de consulta no son válidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc(episodeId);

const [
  userSnapshot,
  centerSnapshot,
  clientSnapshot,
] = await Promise.all([
  userRef.get(),
  centerRef.get(),
  clientRef.get(),
]);

    if (
      !userSnapshot.exists ||
      !centerSnapshot.exists ||
      !clientSnapshot.exists
    ) {
      throw new HttpsError(
        "not-found",
        "No se ha encontrado el usuario, centro o paciente."
      );
    }

    const userData = userSnapshot.data();
    const centerData = centerSnapshot.data();
    const clientData = clientSnapshot.data();

    const roles: string[] = Array.isArray(userData?.roles)
      ? userData.roles
      : [];

    const isOwner =
      roles.includes("owner") &&
      centerData?.ownerActivated === true &&
      centerData?.ownerUid === uid;

    const isDeveloper =
      roles.includes("developer") &&
      clientData?.isTest === true;

    if (
      userData?.centerId !== CENTER_ID ||
      (!isOwner && !isDeveloper)
    ) {
      throw new HttpsError(
        "permission-denied",
        "No tienes permisos para consultar este episodio."
      );
    }

if (clientData?.deleted === true) {
  throw new HttpsError(
    "failed-precondition",
    "El paciente está en la papelera."
  );
}

// Los permisos ya se han comprobado.
// Ahora podemos consultar los datos clínicos.
const episodeSnapshot = await episodeRef.get();

if (!episodeSnapshot.exists) {
  throw new HttpsError(
    "not-found",
    "El episodio clínico no existe."
  );
}

    const episodeData = episodeSnapshot.data();

    const readString = (value: unknown): string =>
      typeof value === "string" ? value : "";

    const toISOString = (value: unknown): string | null =>
      value instanceof Timestamp
        ? value.toDate().toISOString()
        : null;

    return {
      success: true,
      episode: {
        episodeId,
        clientId,

        title: readString(episodeData?.title),

        reasonForConsultation: readString(
          episodeData?.reasonForConsultation
        ),

        affectedArea: readString(
          episodeData?.affectedArea
        ),

        observations: readString(
          episodeData?.observations
        ),

        status:
          episodeData?.status === "closed"
            ? "closed"
            : "open",

        openedAt: toISOString(episodeData?.openedAt),
        closedAt: toISOString(episodeData?.closedAt),

        closingReason: readString(
          episodeData?.closingReason
        ),

        createdAt: toISOString(episodeData?.createdAt),
        updatedAt: toISOString(episodeData?.updatedAt),

        createdBy: readString(episodeData?.createdBy),
        updatedBy: readString(episodeData?.updatedBy),

        closedBy: readString(episodeData?.closedBy),
        reopenedBy: readString(episodeData?.reopenedBy),
        reopenedAt: toISOString(episodeData?.reopenedAt),
      },
    };
  }
);
/**
 * Actualiza los datos de un episodio clínico abierto.
 *
 * Permisos:
 * - Owner: pacientes de su centro.
 * - Developer: únicamente pacientes de prueba.
 *
 * Los episodios cerrados no se pueden modificar.
 */
export const updatePatientClinicalEpisode = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    const userRecord = await getAuth().getUser(uid);

    if (userRecord.disabled) {
      throw new HttpsError(
        "permission-denied",
        "La cuenta está deshabilitada."
      );
    }

    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos del episodio no son válidos."
      );
    }

    const allowedKeys = [
      "clientId",
      "episodeId",
      "title",
      "reasonForConsultation",
      "affectedArea",
      "observations",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    const readString = (
      key: string,
      maxLength: number,
      required = false
    ): string => {
      const value = input[key];

      if (
        typeof value !== "string" ||
        value.length > maxLength
      ) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      const normalized = value.trim();

      if (required && !normalized) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} es obligatorio.`
        );
      }

      return normalized;
    };

    const episodeData = {
      title: readString("title", 200, true),

      reasonForConsultation: readString(
        "reasonForConsultation",
        2000
      ),

      affectedArea: readString(
        "affectedArea",
        1000
      ),

      observations: readString(
        "observations",
        10000
      ),
    };

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc(episodeId);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
const centerSnapshot = await transaction.get(centerRef);
const clientSnapshot = await transaction.get(clientRef);
if (
  !userSnapshot.exists ||
  !centerSnapshot.exists ||
  !clientSnapshot.exists
) {
  throw new HttpsError(
    "not-found",
    "No se ha encontrado el usuario, centro o paciente."
  );
}

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper =
        roles.includes("developer") &&
        clientData?.isTest === true;

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para modificar este episodio."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "El paciente está en la papelera."
        );
      }

      // Los permisos ya se han comprobado.
// Ahora podemos consultar el episodio clínico.
const episodeSnapshot = await transaction.get(episodeRef);

if (!episodeSnapshot.exists) {
  throw new HttpsError(
    "not-found",
    "El episodio clínico no existe."
  );
}

const currentEpisode = episodeSnapshot.data();

      if (currentEpisode?.status !== "open") {
        throw new HttpsError(
          "failed-precondition",
          "No se puede modificar un episodio cerrado."
        );
      }
      // Identificar únicamente los campos modificados.
const changedFields = Object.keys(episodeData).filter(
  (key) => {
    const field = key as keyof typeof episodeData;

    return (
      episodeData[field] !==
      currentEpisode?.[field]
    );
  }
);

// Si no existen cambios, evitamos escrituras innecesarias.
if (changedFields.length === 0) {
  return;
}
      // Actualizar únicamente el episodio seleccionado.
transaction.update(episodeRef, {
  ...episodeData,
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: uid,
});

// Registrar el cambio en la auditoría clínica.
const auditRef = episodeRef
  .collection("events")
  .doc();

transaction.create(
  auditRef,
  buildClinicalEpisodeAuditEvent("updated", uid, {
    changedFields,
  })
);
    });

    return {
      success: true,
      clientId,
      episodeId,
    };
  }
);
/**
 * Construye un evento de auditoría clínica.
 *
 * No escribe directamente en Firestore.
 * El evento se guardará dentro de la misma
 * transacción que modifica el episodio.
 */
const buildClinicalEpisodeAuditEvent = (
  type: "created" | "updated" | "closed" | "reopened",
  performedBy: string,
  details: Record<string, unknown> = {}
) => {
  return {
    type,
    performedBy,
    createdAt: FieldValue.serverTimestamp(),
    ...details,
  };
};
/**
 * Registra una sesión de evolución clínica.
 *
 * Owner: pacientes del centro.
 * Developer: únicamente pacientes de prueba.
 *
 * Solo permite añadir sesiones a episodios abiertos.
 */
export const createPatientClinicalSession = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de la sesión no son válidos."
      );
    }

    const allowedKeys = [
      "clientId",
      "episodeId",
      "sessionDate",
      "painLevel",
      "symptoms",
      "treatment",
      "exercises",
      "evolution",
    ];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    const readString = (
      key: string,
      maxLength: number
    ): string => {
      const value = input[key];

      if (
        typeof value !== "string" ||
        value.length > maxLength
      ) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${key} no es válido.`
        );
      }

      return value.trim();
    };

    const sessionDate = readString("sessionDate", 10);

    // Fecha estricta YYYY-MM-DD, sin conversiones de zona horaria.
    const dateMatch =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDate);

    if (!dateMatch) {
      throw new HttpsError(
        "invalid-argument",
        "La fecha debe tener el formato YYYY-MM-DD."
      );
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const parsedDate = new Date(0);
    parsedDate.setUTCFullYear(year, month - 1, day);
    parsedDate.setUTCHours(0, 0, 0, 0);

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new HttpsError(
        "invalid-argument",
        "La fecha de la sesión no es válida."
      );
    }

    const painLevel = input.painLevel;

    if (
      typeof painLevel !== "number" ||
      !Number.isInteger(painLevel) ||
      painLevel < 0 ||
      painLevel > 10
    ) {
      throw new HttpsError(
        "invalid-argument",
        "El nivel de dolor debe estar entre 0 y 10."
      );
    }

    const sessionData = {
      sessionDate,
      painLevel,
      symptoms: readString("symptoms", 5000),
      treatment: readString("treatment", 5000),
      exercises: readString("exercises", 5000),
      evolution: readString("evolution", 5000),
    };

    // Validación previa de identidad y permisos.
    await assertClinicalPatientAccess(uid, clientId);

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef
      .collection("clients")
      .doc(clientId);

    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc(episodeId);

    const sessionRef = episodeRef
      .collection("sessions")
      .doc();

    const auditRef = sessionRef
      .collection("events")
      .doc();

    const episodeAuditRef = episodeRef
      .collection("events")
      .doc();

    await db.runTransaction(async (transaction) => {
      // Todas las lecturas antes de las escrituras.
      const userSnapshot = await transaction.get(userRef);
      const centerSnapshot = await transaction.get(centerRef);
      const clientSnapshot = await transaction.get(clientRef);

      if (
        !userSnapshot.exists ||
        !centerSnapshot.exists ||
        !clientSnapshot.exists
      ) {
        throw new HttpsError(
          "not-found",
          "No se ha encontrado el usuario, centro o paciente."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper =
        roles.includes("developer") &&
        clientData?.isTest === true;

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para registrar esta sesión."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "El paciente está en la papelera."
        );
      }

      const episodeSnapshot =
        await transaction.get(episodeRef);

      if (!episodeSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "El episodio clínico no existe."
        );
      }

      if (episodeSnapshot.data()?.status !== "open") {
        throw new HttpsError(
          "failed-precondition",
          "No se pueden registrar sesiones en un episodio cerrado."
        );
      }

      // El profesional se determina en el servidor.
      // Nunca se acepta un professionalId enviado por el cliente.
      transaction.create(sessionRef, {
        ...sessionData,
        professionalId: uid,
        createdBy: uid,
        updatedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Auditoría propia de la sesión.
      transaction.create(auditRef, {
        type: "created",
        performedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Auditoría general del episodio clínico.
      transaction.create(episodeAuditRef, {
        type: "session_created",
        sessionId: sessionRef.id,
        sessionDate,
        performedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
      episodeId,
      sessionId: sessionRef.id,
    };
  }
);
/**
 * Obtiene las sesiones de evolución clínica
 * de un episodio concreto.
 *
 * Permisos:
 * - Owner: pacientes de su centro.
 * - Developer: únicamente pacientes de prueba.
 *
 * Los pacientes no pueden consultar estas sesiones.
 */
export const getPatientClinicalSessions = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // 1. Comprobar autenticación.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const input = request.data;

    // 2. Validar parámetros.
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) => !["clientId", "episodeId"].includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de consulta no son válidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    // 3. Comprobar identidad y permisos
    // antes de consultar información clínica.
    await assertClinicalPatientAccess(uid, clientId);

    const episodeRef = db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("clients")
      .doc(clientId)
      .collection("clinicalEpisodes")
      .doc(episodeId);

    // 4. Comprobar que el episodio existe.
    const episodeSnapshot = await episodeRef.get();

    if (!episodeSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El episodio clínico no existe."
      );
    }

    // 5. Consultar sesiones activas por bloques.
    // Las sesiones antiguas sin campo deleted siguen siendo visibles.
    const activeSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    const batchSize = 100;

    let lastDocument: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (activeSessionDocs.length < 100) {
      let query = episodeRef
        .collection("sessions")
        .orderBy("sessionDate", "desc")
        .limit(batchSize);

      if (lastDocument) {
        query = query.startAfter(lastDocument);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        break;
      }

      for (const document of snapshot.docs) {
        if (document.data().deleted !== true) {
          activeSessionDocs.push(document);
        }

        if (activeSessionDocs.length === 100) {
          break;
        }
      }

      lastDocument = snapshot.docs[snapshot.docs.length - 1];

      if (snapshot.size < batchSize) {
        break;
      }
    }

    // 6. Convertir fechas de Firestore.
    const toISOString = (
      value: unknown
    ): string | null =>
      value instanceof Timestamp
        ? value.toDate().toISOString()
        : null;

    const readString = (value: unknown): string =>
      typeof value === "string" ? value : "";

    // 7. Preparar la respuesta.
    const sessions = activeSessionDocs
      .map((document) => {
        const data = document.data();

        return {
          sessionId: document.id,
          episodeId,
          clientId,

          sessionDate: readString(data.sessionDate),

          painLevel:
            typeof data.painLevel === "number"
              ? data.painLevel
              : null,

          symptoms: readString(data.symptoms),

          treatment: readString(data.treatment),

          exercises: readString(data.exercises),

          evolution: readString(data.evolution),

          professionalId: readString(
            data.professionalId
          ),

          createdBy: readString(data.createdBy),

          updatedBy: readString(data.updatedBy),

          createdAt: toISOString(data.createdAt),

          updatedAt: toISOString(data.updatedAt),
        };
      }
    );

    // 8. Devolver las sesiones.
    return {
      success: true,
      clientId,
      episodeId,
      sessions,
    };
  }
);
/**

 * Modifica una sesión clínica existente.

 * Conserva los datos originales en la auditoría.

 */

export const updatePatientClinicalSession = onCall(

  {

    region: "europe-west1",

    enforceAppCheck: false,

  },

  async (request) => {

    if (!request.auth) {

      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

    }

    const uid = request.auth.uid;

    const input = request.data;

    if (

      !input ||

      typeof input !== "object" ||

      Array.isArray(input)

    ) {

      throw new HttpsError("invalid-argument", "Datos no válidos.");

    }

    const allowedKeys = [

      "clientId",

      "episodeId",

      "sessionId",

      "sessionDate",

      "painLevel",

      "symptoms",

      "treatment",

      "exercises",

      "evolution",

    ];

    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {

      throw new HttpsError(

        "invalid-argument",

        "Se han enviado campos no permitidos."

      );

    }

    const validateId = (value: unknown): string => {

      if (

        typeof value !== "string" ||

        !value.trim() ||

        value.length > 150 ||

        value.includes("/") ||

        value.trim() === "." ||

        value.trim() === ".."

      ) {

        throw new HttpsError("invalid-argument", "Identificador no válido.");

      }

      return value.trim();

    };

    const clientId = validateId(input.clientId);

    const episodeId = validateId(input.episodeId);

    const sessionId = validateId(input.sessionId);

    const readString = (key: string): string => {

      const value = input[key];

      if (typeof value !== "string" || value.length > 5000) {

        throw new HttpsError(

          "invalid-argument",

          `El campo ${key} no es válido.`

        );

      }

      return value.trim();

    };

    const sessionDate = readString("sessionDate");

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDate);

    if (!dateMatch) {

      throw new HttpsError(

        "invalid-argument",

        "La fecha debe tener el formato YYYY-MM-DD."

      );

    }

    const year = Number(dateMatch[1]);

    const month = Number(dateMatch[2]);

    const day = Number(dateMatch[3]);

    const parsedDate = new Date(0);

    parsedDate.setUTCFullYear(year, month - 1, day);

    parsedDate.setUTCHours(0, 0, 0, 0);

    if (

      parsedDate.getUTCFullYear() !== year ||

      parsedDate.getUTCMonth() !== month - 1 ||

      parsedDate.getUTCDate() !== day

    ) {

      throw new HttpsError("invalid-argument", "Fecha no válida.");

    }

    const painLevel = input.painLevel;

    if (

      typeof painLevel !== "number" ||

      !Number.isInteger(painLevel) ||

      painLevel < 0 ||

      painLevel > 10

    ) {

      throw new HttpsError(

        "invalid-argument",

        "El nivel de dolor debe estar entre 0 y 10."

      );

    }

    const newData = {

      sessionDate,

      painLevel,

      symptoms: readString("symptoms"),

      treatment: readString("treatment"),

      exercises: readString("exercises"),

      evolution: readString("evolution"),

    };

    await assertClinicalPatientAccess(uid, clientId);

    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef.collection("clients").doc(clientId);

    const episodeRef = clientRef.collection("clinicalEpisodes").doc(episodeId);

    const sessionRef = episodeRef.collection("sessions").doc(sessionId);

    const auditRef = sessionRef.collection("events").doc();

    const episodeAuditRef = episodeRef.collection("events").doc();

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {

      const [userSnapshot, centerSnapshot, clientSnapshot, episodeSnapshot, sessionSnapshot] =

        await Promise.all([

          transaction.get(userRef),

          transaction.get(centerRef),

          transaction.get(clientRef),

          transaction.get(episodeRef),

          transaction.get(sessionRef),

        ]);

      if (

        !userSnapshot.exists ||

        !centerSnapshot.exists ||

        !clientSnapshot.exists ||

        !episodeSnapshot.exists ||

        !sessionSnapshot.exists

      ) {

        throw new HttpsError("not-found", "No se encontró la sesión clínica.");

      }

      const userData = userSnapshot.data();

      const centerData = centerSnapshot.data();

      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)

        ? userData.roles

        : [];

      const isOwner =

        roles.includes("owner") &&

        centerData?.ownerActivated === true &&

        centerData?.ownerUid === uid;

      const isDeveloper =

        roles.includes("developer") &&

        clientData?.isTest === true;

      if (

        userData?.centerId !== CENTER_ID ||

        (!isOwner && !isDeveloper)

      ) {

        throw new HttpsError("permission-denied", "No tienes permisos.");

      }

      if (clientData?.deleted === true) {

        throw new HttpsError(

          "failed-precondition",

          "El paciente está en la papelera."

        );

      }

      if (episodeSnapshot.data()?.status !== "open") {

        throw new HttpsError(

          "failed-precondition",

          "No puedes editar sesiones de un episodio cerrado."

        );

      }

      const previousData = sessionSnapshot.data();

      if (previousData?.deleted === true) {

        throw new HttpsError(

          "failed-precondition",

          "La sesión está eliminada."

        );

      }

      const previousValues = {

        sessionDate: previousData?.sessionDate ?? "",

        painLevel: previousData?.painLevel ?? null,

        symptoms: previousData?.symptoms ?? "",

        treatment: previousData?.treatment ?? "",

        exercises: previousData?.exercises ?? "",

        evolution: previousData?.evolution ?? "",

      };

      transaction.update(sessionRef, {

        ...newData,

        updatedBy: uid,

        updatedAt: FieldValue.serverTimestamp(),

      });

      transaction.create(auditRef, {

        type: "updated",

        performedBy: uid,

        previousValues,

        newValues: newData,

        createdAt: FieldValue.serverTimestamp(),

      });

      transaction.create(episodeAuditRef, {

        type: "session_updated",

        sessionId,

        performedBy: uid,

        createdAt: FieldValue.serverTimestamp(),

      });

    });

    return {

      success: true,

      clientId,

      episodeId,

      sessionId,

    };

  }

);

/**

 * Elimina lógicamente una sesión clínica.

 * Los datos permanecen en Firestore para auditoría.

 */

export const deletePatientClinicalSession = onCall(

  {

    region: "europe-west1",

    enforceAppCheck: false,

  },

  async (request) => {

    if (!request.auth) {

      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

    }

    const uid = request.auth.uid;

    const input = request.data;

    if (

      !input ||

      typeof input !== "object" ||

      Array.isArray(input) ||

      Object.keys(input).some(

        (key) => !["clientId", "episodeId", "sessionId"].includes(key)

      )

    ) {

      throw new HttpsError("invalid-argument", "Datos no válidos.");

    }

    const validateId = (value: unknown): string => {

      if (

        typeof value !== "string" ||

        !value.trim() ||

        value.length > 150 ||

        value.includes("/") ||

        value.trim() === "." ||

        value.trim() === ".."

      ) {

        throw new HttpsError("invalid-argument", "Identificador no válido.");

      }

      return value.trim();

    };

    const clientId = validateId(input.clientId);

    const episodeId = validateId(input.episodeId);

    const sessionId = validateId(input.sessionId);

    await assertClinicalPatientAccess(uid, clientId);

    const centerRef = db.collection("centers").doc(CENTER_ID);

    const clientRef = centerRef.collection("clients").doc(clientId);

    const episodeRef = clientRef.collection("clinicalEpisodes").doc(episodeId);

    const sessionRef = episodeRef.collection("sessions").doc(sessionId);

    const auditRef = sessionRef.collection("events").doc();

    const episodeAuditRef = episodeRef.collection("events").doc();

    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {

      const [userSnapshot, centerSnapshot, clientSnapshot, episodeSnapshot, sessionSnapshot] =

        await Promise.all([

          transaction.get(userRef),

          transaction.get(centerRef),

          transaction.get(clientRef),

          transaction.get(episodeRef),

          transaction.get(sessionRef),

        ]);

      if (

        !userSnapshot.exists ||

        !centerSnapshot.exists ||

        !clientSnapshot.exists ||

        !episodeSnapshot.exists ||

        !sessionSnapshot.exists

      ) {

        throw new HttpsError("not-found", "No se encontró la sesión clínica.");

      }

      const userData = userSnapshot.data();

      const centerData = centerSnapshot.data();

      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)

        ? userData.roles

        : [];

      const isOwner =

        roles.includes("owner") &&

        centerData?.ownerActivated === true &&

        centerData?.ownerUid === uid;

      const isDeveloper =

        roles.includes("developer") &&

        clientData?.isTest === true;

      if (

        userData?.centerId !== CENTER_ID ||

        (!isOwner && !isDeveloper)

      ) {

        throw new HttpsError("permission-denied", "No tienes permisos.");

      }

      if (clientData?.deleted === true) {

        throw new HttpsError(

          "failed-precondition",

          "El paciente está en la papelera."

        );

      }

      if (episodeSnapshot.data()?.status !== "open") {

        throw new HttpsError(

          "failed-precondition",

          "No puedes eliminar sesiones de un episodio cerrado."

        );

      }

      if (sessionSnapshot.data()?.deleted === true) {

        throw new HttpsError(

          "failed-precondition",

          "La sesión ya está eliminada."

        );

      }

      transaction.update(sessionRef, {

        deleted: true,

        deletedBy: uid,

        deletedAt: FieldValue.serverTimestamp(),

        updatedBy: uid,

        updatedAt: FieldValue.serverTimestamp(),

      });

      transaction.create(auditRef, {

        type: "deleted",

        performedBy: uid,

        createdAt: FieldValue.serverTimestamp(),

      });

      transaction.create(episodeAuditRef, {

        type: "session_deleted",

        sessionId,

        performedBy: uid,

        createdAt: FieldValue.serverTimestamp(),

      });

    });

    return {

      success: true,

      clientId,

      episodeId,

      sessionId,

    };

  }

);
/**
 * Registra una valoración del dolor asociada a un episodio clínico.
 * Cada valoración es histórica e independiente.
 */
export const createPatientPainAssessment = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const uid = request.auth.uid;
    const input = request.data;

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de la valoración no son válidos."
      );
    }

    const allowedKeys = ["clientId", "episodeId", "zones"];

    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    if (
      !Array.isArray(input.zones) ||
      input.zones.length === 0 ||
      input.zones.length > 84
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Debes indicar entre 1 y 84 zonas corporales."
      );
    }

    const validPainTypes = [
      "muscular",
      "articular",
      "punzante",
      "irradiado",
      "quemazon",
      "hormigueo",
      "otro",
    ];

    const validFrequencies = [
      "constante",
      "intermitente",
      "ocasional",
      "movimiento",
    ];

    const validBodyZones = new Map<
      string,
      { name: string; view: "front" | "back" }
    >([
      ["front-head", { name: "Cabeza", view: "front" }],
      ["front-neck", { name: "Cuello", view: "front" }],
      ["front-left-shoulder", { name: "Hombro izquierdo", view: "front" }],
      ["front-right-shoulder", { name: "Hombro derecho", view: "front" }],
      ["front-chest", { name: "Pecho", view: "front" }],
      ["front-abdomen", { name: "Abdomen", view: "front" }],
      ["front-left-arm", { name: "Brazo izquierdo", view: "front" }],
      ["front-right-arm", { name: "Brazo derecho", view: "front" }],
      ["front-left-leg", { name: "Pierna izquierda", view: "front" }],
      ["front-right-leg", { name: "Pierna derecha", view: "front" }],
      ["front-left-foot", { name: "Pie izquierdo", view: "front" }],
      ["front-right-foot", { name: "Pie derecho", view: "front" }],
      ["back-head", { name: "Cabeza posterior", view: "back" }],
      ["back-neck", { name: "Cervicales", view: "back" }],
      ["back-left-shoulder", { name: "Hombro izquierdo posterior", view: "back" }],
      ["back-right-shoulder", { name: "Hombro derecho posterior", view: "back" }],
      ["back-upper", { name: "Espalda dorsal", view: "back" }],
      ["back-lumbar", { name: "Zona lumbar", view: "back" }],
      ["back-left-arm", { name: "Brazo izquierdo posterior", view: "back" }],
      ["back-right-arm", { name: "Brazo derecho posterior", view: "back" }],
      ["back-left-leg", { name: "Pierna izquierda posterior", view: "back" }],
      ["back-right-leg", { name: "Pierna derecha posterior", view: "back" }],
      ["back-left-foot", { name: "Talón izquierdo", view: "back" }],
      ["back-right-foot", { name: "Talón derecho", view: "back" }],
      ["front-left-upper-arm", { name: "Bíceps izquierdo", view: "front" }],
      ["front-left-elbow", { name: "Codo izquierdo", view: "front" }],
      ["front-left-forearm", { name: "Antebrazo izquierdo", view: "front" }],
      ["front-left-wrist", { name: "Muñeca izquierda", view: "front" }],
      ["front-left-hand", { name: "Palma de la mano izquierda", view: "front" }],
      ["front-right-upper-arm", { name: "Bíceps derecho", view: "front" }],
      ["front-right-elbow", { name: "Codo derecho", view: "front" }],
      ["front-right-forearm", { name: "Antebrazo derecho", view: "front" }],
      ["front-right-wrist", { name: "Muñeca derecha", view: "front" }],
      ["front-right-hand", { name: "Palma de la mano derecha", view: "front" }],
      ["back-left-upper-arm", { name: "Tríceps izquierdo", view: "back" }],
      ["back-left-elbow", { name: "Codo izquierdo posterior", view: "back" }],
      ["back-left-forearm", { name: "Antebrazo izquierdo posterior", view: "back" }],
      ["back-left-wrist", { name: "Muñeca izquierda posterior", view: "back" }],
      ["back-left-hand", { name: "Dorso de la mano izquierdo", view: "back" }],
      ["back-right-upper-arm", { name: "Tríceps derecho", view: "back" }],
      ["back-right-elbow", { name: "Codo derecho posterior", view: "back" }],
      ["back-right-forearm", { name: "Antebrazo derecho posterior", view: "back" }],
      ["back-right-wrist", { name: "Muñeca derecha posterior", view: "back" }],
      ["back-right-hand", { name: "Dorso de la mano derecho", view: "back" }],
      ["front-left-hip", { name: "Cadera izquierda", view: "front" }],
      ["front-left-quadriceps", { name: "Cuádriceps izquierdo", view: "front" }],
      ["front-left-knee", { name: "Rodilla izquierda", view: "front" }],
      ["front-left-shin", { name: "Zona tibial izquierda", view: "front" }],
      ["front-left-ankle", { name: "Tobillo izquierdo", view: "front" }],
      ["front-right-hip", { name: "Cadera derecha", view: "front" }],
      ["front-right-quadriceps", { name: "Cuádriceps derecho", view: "front" }],
      ["front-right-knee", { name: "Rodilla derecha", view: "front" }],
      ["front-right-shin", { name: "Zona tibial derecha", view: "front" }],
      ["front-right-ankle", { name: "Tobillo derecho", view: "front" }],
      ["back-left-hip", { name: "Cadera izquierda posterior", view: "back" }],
      ["back-left-glute", { name: "Glúteo izquierdo", view: "back" }],
      ["back-left-hamstrings", { name: "Isquiotibiales izquierdo", view: "back" }],
      ["back-left-knee", { name: "Rodilla izquierda posterior", view: "back" }],
      ["back-left-calf", { name: "Gemelo izquierdo", view: "back" }],
      ["back-left-achilles", { name: "Tendón de Aquiles izquierdo", view: "back" }],
      ["back-left-ankle", { name: "Tobillo izquierdo posterior", view: "back" }],
      ["back-right-hip", { name: "Cadera derecha posterior", view: "back" }],
      ["back-right-glute", { name: "Glúteo derecho", view: "back" }],
      ["back-right-hamstrings", { name: "Isquiotibiales derecho", view: "back" }],
      ["back-right-knee", { name: "Rodilla derecha posterior", view: "back" }],
      ["back-right-calf", { name: "Gemelo derecho", view: "back" }],
      ["back-right-achilles", { name: "Tendón de Aquiles derecho", view: "back" }],
      ["back-right-ankle", { name: "Tobillo derecho posterior", view: "back" }],
      ["front-right-pectoral", { name: "Pectoral derecho", view: "front" }],
      ["front-left-pectoral", { name: "Pectoral izquierdo", view: "front" }],
      ["front-sternum", { name: "Esternón", view: "front" }],
      ["front-abdominals", { name: "Abdominales", view: "front" }],
      ["front-right-oblique", { name: "Oblicuo derecho", view: "front" }],
      ["front-left-oblique", { name: "Oblicuo izquierdo", view: "front" }],
      ["back-left-trapezius", { name: "Trapecio izquierdo", view: "back" }],
      ["back-right-trapezius", { name: "Trapecio derecho", view: "back" }],
      ["back-left-scapula", { name: "Omóplato izquierdo", view: "back" }],
      ["back-right-scapula", { name: "Omóplato derecho", view: "back" }],
      ["back-left-latissimus", { name: "Dorsal izquierdo", view: "back" }],
      ["back-right-latissimus", { name: "Dorsal derecho", view: "back" }],
      ["back-thoracic-spine", { name: "Columna torácica", view: "back" }],
      ["back-lumbar-spine", { name: "Columna lumbar", view: "back" }],
      ["back-left-lumbar-muscle", { name: "Musculatura lumbar izquierda", view: "back" }],
      ["back-right-lumbar-muscle", { name: "Musculatura lumbar derecha", view: "back" }],
    ]);

    const zoneIds = new Set<string>();

    const zones = input.zones.map((rawZone: unknown) => {
      if (
        !rawZone ||
        typeof rawZone !== "object" ||
        Array.isArray(rawZone)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Una de las zonas no es válida."
        );
      }

      const zone = rawZone as Record<string, unknown>;

      const allowedZoneKeys = [
        "zoneId",
        "zoneName",
        "view",
        "eva",
        "painType",
        "frequency",
        "observations",
      ];

      if (
        Object.keys(zone).some(
          (key) => !allowedZoneKeys.includes(key)
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Una zona contiene campos no permitidos."
        );
      }

      if (
        typeof zone.zoneId !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(zone.zoneId) ||
        zoneIds.has(zone.zoneId)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador de una zona no es válido o está duplicado."
        );
      }

      const canonicalZone = validBodyZones.get(zone.zoneId);

      if (!canonicalZone) {
        throw new HttpsError(
          "invalid-argument",
          "La zona anatómica indicada no está permitida."
        );
      }

      zoneIds.add(zone.zoneId);

      if (
        typeof zone.zoneName !== "string" ||
        !zone.zoneName.trim() ||
        zone.zoneName.length > 100
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El nombre de una zona no es válido."
        );
      }

      if (zone.view !== "front" && zone.view !== "back") {
        throw new HttpsError(
          "invalid-argument",
          "La vista corporal no es válida."
        );
      }

      if (
        zone.zoneName.trim() !== canonicalZone.name ||
        zone.view !== canonicalZone.view
      ) {
        throw new HttpsError(
          "invalid-argument",
          "La zona anatómica no coincide con su nombre o vista corporal."
        );
      }

      if (
        typeof zone.eva !== "number" ||
        !Number.isInteger(zone.eva) ||
        zone.eva < 0 ||
        zone.eva > 10
      ) {
        throw new HttpsError(
          "invalid-argument",
          "La intensidad EVA debe estar entre 0 y 10."
        );
      }

      if (
        typeof zone.painType !== "string" ||
        !validPainTypes.includes(zone.painType)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El tipo de dolor no es válido."
        );
      }

      if (
        typeof zone.frequency !== "string" ||
        !validFrequencies.includes(zone.frequency)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "La frecuencia del dolor no es válida."
        );
      }

      if (
        typeof zone.observations !== "string" ||
        zone.observations.length > 2000
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Las observaciones no son válidas."
        );
      }

      return {
        zoneId: zone.zoneId,
        zoneName: canonicalZone.name,
        view: canonicalZone.view,
        eva: zone.eva,
        painType: zone.painType,
        frequency: zone.frequency,
        observations: zone.observations.trim(),
      };
    });

    await assertClinicalPatientAccess(uid, clientId);

    const userRef = db.collection("users").doc(uid);
    const centerRef = db.collection("centers").doc(CENTER_ID);
    const clientRef = centerRef.collection("clients").doc(clientId);
    const episodeRef = clientRef
      .collection("clinicalEpisodes")
      .doc(episodeId);

    const assessmentRef = episodeRef
      .collection("painAssessments")
      .doc();

    const auditRef = assessmentRef.collection("events").doc();
    const episodeAuditRef = episodeRef.collection("events").doc();

    await db.runTransaction(async (transaction) => {
      const [
        userSnapshot,
        centerSnapshot,
        clientSnapshot,
        episodeSnapshot,
      ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(centerRef),
        transaction.get(clientRef),
        transaction.get(episodeRef),
      ]);

      if (
        !userSnapshot.exists ||
        !centerSnapshot.exists ||
        !clientSnapshot.exists ||
        !episodeSnapshot.exists
      ) {
        throw new HttpsError(
          "not-found",
          "No se ha encontrado el usuario, centro, paciente o episodio."
        );
      }

      const userData = userSnapshot.data();
      const centerData = centerSnapshot.data();
      const clientData = clientSnapshot.data();

      const roles: string[] = Array.isArray(userData?.roles)
        ? userData.roles
        : [];

      const isOwner =
        roles.includes("owner") &&
        centerData?.ownerActivated === true &&
        centerData?.ownerUid === uid;

      const isDeveloper =
        roles.includes("developer") &&
        clientData?.isTest === true;

      if (
        userData?.centerId !== CENTER_ID ||
        (!isOwner && !isDeveloper)
      ) {
        throw new HttpsError(
          "permission-denied",
          "No tienes permisos para registrar esta valoración."
        );
      }

      if (clientData?.deleted === true) {
        throw new HttpsError(
          "failed-precondition",
          "El paciente está en la papelera."
        );
      }

      if (episodeSnapshot.data()?.status !== "open") {
        throw new HttpsError(
          "failed-precondition",
          "No se pueden registrar valoraciones en un episodio cerrado."
        );
      }

      transaction.create(assessmentRef, {
        clientId,
        episodeId,
        zones,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.create(auditRef, {
        type: "created",
        performedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.create(episodeAuditRef, {
        type: "pain_assessment_created",
        assessmentId: assessmentRef.id,
        zoneCount: zones.length,
        performedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      clientId,
      episodeId,
      assessmentId: assessmentRef.id,
    };
  }
);

/**
 * Obtiene el historial de valoraciones del dolor
 * asociado a un episodio clínico.
 *
 * Las valoraciones se devuelven de más reciente
 * a más antigua.
 */
export const getPatientPainAssessments = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;
    const input = request.data;

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos de consulta no son válidos."
      );
    }

    const allowedKeys = ["clientId", "episodeId"];

    if (
      Object.keys(input).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Se han enviado campos no permitidos."
      );
    }

    const validateId = (value: unknown): string => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 150 ||
        value.includes("/") ||
        value.trim() === "." ||
        value.trim() === ".."
      ) {
        throw new HttpsError(
          "invalid-argument",
          "El identificador no es válido."
        );
      }

      return value.trim();
    };

    const clientId = validateId(input.clientId);
    const episodeId = validateId(input.episodeId);

    // Validar permisos clínicos antes de consultar los datos.
    await assertClinicalPatientAccess(uid, clientId);

    const episodeRef = db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("clients")
      .doc(clientId)
      .collection("clinicalEpisodes")
      .doc(episodeId);

    const episodeSnapshot = await episodeRef.get();

    if (!episodeSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "El episodio clínico no existe."
      );
    }

    const assessmentsSnapshot = await episodeRef
      .collection("painAssessments")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const assessments = assessmentsSnapshot.docs.map(
      (document) => {
        const data = document.data();

        return {
          assessmentId: document.id,
          clientId,
          episodeId,
          createdBy:
            typeof data.createdBy === "string"
              ? data.createdBy
              : "",
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : null,
          zones: Array.isArray(data.zones)
            ? data.zones
            : [],
        };
      }
    );

    return {
      success: true,
      clientId,
      episodeId,
      assessments,
    };
  }
);

// ==================================================
// CONSULTAR HORARIOS ESPECIALES DEL CENTRO
// ==================================================

/**
 * Recupera los horarios especiales del centro.
 *
 * Permite filtrar por fechas y paginar los resultados.
 *
 * No realiza escrituras en Firestore.
 */
export const getCenterSpecialSchedules = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // --------------------------------------------------
    // COMPROBAR PERMISOS
    // --------------------------------------------------

    await assertCenterManagementAccess(uid);

    // --------------------------------------------------
    // VALIDAR PETICIÓN
    // --------------------------------------------------

    const filters = validateSpecialScheduleQuery(
      request.data
    );

    // --------------------------------------------------
    // REFERENCIA FIRESTORE
    // --------------------------------------------------

    const collectionRef = db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("specialSchedules");

    let query: FirebaseFirestore.Query =
      collectionRef.orderBy(FieldPath.documentId(), "asc");

    // --------------------------------------------------
    // FILTRAR POR FECHAS
    // --------------------------------------------------

    if (filters.fromDateISO !== undefined) {
      query = query.where(
        FieldPath.documentId(),
        ">=",
        filters.fromDateISO
      );
    }

    if (filters.toDateISO !== undefined) {
      query = query.where(
        FieldPath.documentId(),
        "<=",
        filters.toDateISO
      );
    }

    // --------------------------------------------------
    // PAGINACIÓN
    // --------------------------------------------------

    if (filters.cursorDateISO !== undefined) {
      query = query.startAfter(
        filters.cursorDateISO
      );
    }

    // Recuperar un documento adicional para comprobar
    // si existen más resultados.

    const snapshot = await query
      .limit(filters.limit + 1)
      .get();

    const hasMore =
      snapshot.docs.length > filters.limit;

    const documents = snapshot.docs.slice(
      0,
      filters.limit
    );

    // --------------------------------------------------
    // VALIDAR Y SERIALIZAR DOCUMENTOS
    // --------------------------------------------------

    const specialSchedules = documents.map(
      (document) => {
        const data = document.data();

        try {
          const schedule =
            validateSpecialScheduleInput({
              dateISO: data.dateISO,
              closed: data.closed,
              periods: data.periods,
              reason: data.reason,
            });

          // La fecha debe coincidir con el ID.

          if (schedule.dateISO !== document.id) {
            throw new Error(
              "La fecha no coincide con el identificador."
            );
          }

          // Validar campos de auditoría.

          if (
            typeof data.createdBy !== "string" ||
            data.createdBy.trim().length === 0 ||
            typeof data.updatedBy !== "string" ||
            data.updatedBy.trim().length === 0
          ) {
            throw new Error(
              "Los campos de auditoría no son válidos."
            );
          }

          if (
            !(data.createdAt instanceof Timestamp) ||
            !(data.updatedAt instanceof Timestamp)
          ) {
            throw new Error(
              "Las fechas de auditoría no son válidas."
            );
          }

          return {
            ...schedule,

            createdAt: data.createdAt
              .toDate()
              .toISOString(),

            createdBy: data.createdBy,

            updatedAt: data.updatedAt
              .toDate()
              .toISOString(),

            updatedBy: data.updatedBy,
          };
        } catch (error) {
          console.error(
            "[getCenterSpecialSchedules] Documento no válido:",
            document.id,
            error
          );

          throw new HttpsError(
            "failed-precondition",
            "Existe un horario especial almacenado que no es válido."
          );
        }
      }
    );

    // --------------------------------------------------
    // CURSOR DE LA SIGUIENTE PÁGINA
    // --------------------------------------------------

    const nextCursorDateISO =
      hasMore && documents.length > 0
        ? documents[documents.length - 1].id
        : null;

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return {
      success: true,
      specialSchedules,
      hasMore,
      nextCursorDateISO,
    };
  }
);

// ==================================================
// CREAR HORARIO ESPECIAL DEL CENTRO
// ==================================================

/**
 * Crea una excepción al horario habitual del centro.
 *
 * Solo puede existir un horario especial por fecha.
 * La creación se realiza mediante una transacción.
 */
export const createCenterSpecialSchedule = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // --------------------------------------------------
    // COMPROBAR PERMISOS
    // --------------------------------------------------

    await assertCenterManagementAccess(uid);

    // --------------------------------------------------
    // VALIDAR PETICIÓN
    // --------------------------------------------------

    const schedule = validateSpecialScheduleInput(
      request.data
    );

    // --------------------------------------------------
    // REFERENCIAS FIRESTORE
    // --------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const specialScheduleRef = centerRef
      .collection("specialSchedules")
      .doc(schedule.dateISO);

    // --------------------------------------------------
    // CREAR MEDIANTE TRANSACCIÓN
    // --------------------------------------------------

    await db.runTransaction(async (transaction) => {
      const [
        userSnapshot,
        centerSnapshot,
        specialScheduleSnapshot,
      ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(centerRef),
        transaction.get(specialScheduleRef),
      ]);

      // Volver a comprobar los permisos dentro
      // de la transacción.

      validateCenterManagementPermissions(
        uid,
        userSnapshot.data(),
        centerSnapshot.data()
      );

      // Impedir horarios especiales duplicados.

      if (specialScheduleSnapshot.exists) {
        throw new HttpsError(
          "already-exists",
          "Ya existe un horario especial para esta fecha."
        );
      }

      // Crear el documento sin sobrescribir
      // ningún horario existente.

      transaction.create(specialScheduleRef, {
        dateISO: schedule.dateISO,

        closed: schedule.closed,

        periods: schedule.periods,

        reason: schedule.reason,

        createdAt:
          FieldValue.serverTimestamp(),

        createdBy: uid,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedBy: uid,
      });
    });

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return {
      success: true,
      dateISO: schedule.dateISO,
    };
  }
);

// ==================================================
// ACTUALIZAR HORARIO ESPECIAL DEL CENTRO
// ==================================================

/**
 * Actualiza un horario especial existente.
 *
 * La fecha identifica el documento y no se modifica.
 * Se conservan los campos originales de creación.
 */
export const updateCenterSpecialSchedule = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // --------------------------------------------------
    // COMPROBAR PERMISOS
    // --------------------------------------------------

    await assertCenterManagementAccess(uid);

    // --------------------------------------------------
    // VALIDAR PETICIÓN
    // --------------------------------------------------

    const schedule = validateSpecialScheduleInput(
      request.data
    );

    // --------------------------------------------------
    // REFERENCIAS FIRESTORE
    // --------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const specialScheduleRef = centerRef
      .collection("specialSchedules")
      .doc(schedule.dateISO);

    // --------------------------------------------------
    // ACTUALIZAR MEDIANTE TRANSACCIÓN
    // --------------------------------------------------

    await db.runTransaction(async (transaction) => {
      const [
        userSnapshot,
        centerSnapshot,
        specialScheduleSnapshot,
      ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(centerRef),
        transaction.get(specialScheduleRef),
      ]);

      // Volver a comprobar los permisos dentro
      // de la transacción.

      validateCenterManagementPermissions(
        uid,
        userSnapshot.data(),
        centerSnapshot.data()
      );

      // Comprobar que existe el horario especial.

      if (!specialScheduleSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "No existe un horario especial para esta fecha."
        );
      }

      const storedSchedule =
        specialScheduleSnapshot.data();

      // --------------------------------------------------
      // VALIDAR IDENTIDAD Y AUDITORÍA DEL DOCUMENTO
      // --------------------------------------------------

      if (
        !storedSchedule ||
        storedSchedule.dateISO !== schedule.dateISO ||
        !(storedSchedule.createdAt instanceof Timestamp) ||
        typeof storedSchedule.createdBy !== "string" ||
        storedSchedule.createdBy.trim().length === 0
      ) {
        throw new HttpsError(
          "failed-precondition",
          "El horario especial almacenado no es válido."
        );
      }

      // --------------------------------------------------
      // ACTUALIZAR CAMPOS EDITABLES
      // --------------------------------------------------

      transaction.update(specialScheduleRef, {
        closed: schedule.closed,

        periods: schedule.periods,

        reason: schedule.reason,

        updatedAt:
          FieldValue.serverTimestamp(),

        updatedBy: uid,
      });
    });

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return {
      success: true,
      dateISO: schedule.dateISO,
    };
  }
);

// ==================================================
// ELIMINAR HORARIO ESPECIAL DEL CENTRO
// ==================================================

/**
 * Elimina un horario especial existente.
 *
 * Conserva un registro de auditoría independiente.
 * No modifica el horario habitual ni las citas.
 */
export const deleteCenterSpecialSchedule = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // --------------------------------------------------
    // COMPROBAR PERMISOS
    // --------------------------------------------------

    await assertCenterManagementAccess(uid);

    // --------------------------------------------------
    // VALIDAR PETICIÓN
    // --------------------------------------------------

    const { dateISO } =
      validateSpecialScheduleDateInput(
        request.data
      );

    // --------------------------------------------------
    // REFERENCIAS FIRESTORE
    // --------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const specialScheduleRef = centerRef
      .collection("specialSchedules")
      .doc(dateISO);

    const deletionLogRef = centerRef
      .collection("specialScheduleDeletionLogs")
      .doc();

    // --------------------------------------------------
    // ELIMINAR MEDIANTE TRANSACCIÓN
    // --------------------------------------------------

    await db.runTransaction(async (transaction) => {
      const [
        userSnapshot,
        centerSnapshot,
        specialScheduleSnapshot,
      ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(centerRef),
        transaction.get(specialScheduleRef),
      ]);

      // Volver a comprobar los permisos dentro
      // de la transacción.

      validateCenterManagementPermissions(
        uid,
        userSnapshot.data(),
        centerSnapshot.data()
      );

      // Comprobar que existe el horario especial.

      if (!specialScheduleSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "No existe un horario especial para esta fecha."
        );
      }

      const storedSchedule =
        specialScheduleSnapshot.data();

      // Comprobar la identidad del documento.

      if (
        !storedSchedule ||
        storedSchedule.dateISO !== dateISO
      ) {
        throw new HttpsError(
          "failed-precondition",
          "El horario especial almacenado no es válido."
        );
      }

      // --------------------------------------------------
      // REGISTRAR AUDITORÍA DE ELIMINACIÓN
      // --------------------------------------------------

      transaction.create(deletionLogRef, {
        dateISO,

        previousSchedule: storedSchedule,

        deletedAt:
          FieldValue.serverTimestamp(),

        deletedBy: uid,
      });

      // --------------------------------------------------
      // ELIMINAR HORARIO ESPECIAL
      // --------------------------------------------------

      transaction.delete(specialScheduleRef);
    });

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return {
      success: true,
      dateISO,
    };
  }
);

// ==================================================
// SERIALIZAR VACACIONES DEL CENTRO
// ==================================================

/**
 * Valida los datos almacenados en Firestore y convierte
 * los campos Timestamp en cadenas ISO.
 *
 * Se reutilizará también en las operaciones de
 * actualización y eliminación.
 */
function serializeCenterVacation(
  document: FirebaseFirestore.DocumentSnapshot
) {
  const data = document.data();

  try {
    if (!document.exists || !data) {
      throw new Error(
        "El documento de vacaciones no existe."
      );
    }

    const id = validateVacationId(
      document.id
    );

    const vacation = validateVacationInput({
      startDateISO: data.startDateISO,
      endDateISO: data.endDateISO,
      reason: data.reason,
    });

    // ------------------------------------------------
    // VALIDAR CAMPOS DE AUDITORÍA
    // ------------------------------------------------

    if (
      typeof data.createdBy !== "string" ||
      data.createdBy.trim().length === 0 ||
      typeof data.updatedBy !== "string" ||
      data.updatedBy.trim().length === 0
    ) {
      throw new Error(
        "Los campos de auditoría no son válidos."
      );
    }

    if (
      !(data.createdAt instanceof Timestamp) ||
      !(data.updatedAt instanceof Timestamp)
    ) {
      throw new Error(
        "Las fechas de auditoría no son válidas."
      );
    }

    return {
      id,

      ...vacation,

      createdAt: data.createdAt
        .toDate()
        .toISOString(),

      createdBy: data.createdBy,

      updatedAt: data.updatedAt
        .toDate()
        .toISOString(),

      updatedBy: data.updatedBy,
    };
  } catch (error) {
    console.error(
      "[serializeCenterVacation] Documento no válido:",
      document.id,
      error
    );

    throw new HttpsError(
      "failed-precondition",
      "Existe un periodo de vacaciones almacenado que no es válido."
    );
  }
}

// ==================================================
// CONSULTAR VACACIONES DEL CENTRO
// ==================================================

/**
 * Consulta las vacaciones del centro mediante filtros
 * de fechas y paginación con cursor compuesto.
 *
 * Los límites de los periodos son inclusivos,
 * excepto el límite del histórico.
 */
export const getCenterVacations = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // ------------------------------------------------
    // AUTENTICACIÓN
    // ------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // ------------------------------------------------
    // COMPROBAR PERMISOS
    // ------------------------------------------------

    await assertCenterManagementAccess(uid);

    // ------------------------------------------------
    // VALIDAR PETICIÓN
    // ------------------------------------------------

    const filters = validateVacationQuery(
      request.data
    );

    // ------------------------------------------------
    // REFERENCIA FIRESTORE
    // ------------------------------------------------

    const collectionRef = db
      .collection("centers")
      .doc(CENTER_ID)
      .collection("vacations");

    // ------------------------------------------------
    // ORDENACIÓN ESTABLE
    // ------------------------------------------------

    let query: FirebaseFirestore.Query =
      collectionRef.orderBy(
        "startDateISO",
        "asc"
      );

    // ------------------------------------------------
    // FILTROS DE FECHAS
    // ------------------------------------------------

    if (filters.fromDateISO !== undefined) {
      query = query.where(
        "endDateISO",
        ">=",
        filters.fromDateISO
      );
    }

    if (filters.toDateISO !== undefined) {
      query = query.where(
        "startDateISO",
        "<=",
        filters.toDateISO
      );
    }

    if (filters.endBeforeDateISO !== undefined) {
      query = query.where(
        "endDateISO",
        "<",
        filters.endBeforeDateISO
      );
    }

    // Cuando filtramos por fecha final, la añadimos
    // explícitamente a la ordenación y al cursor.
    //
    // Como el contrato actual del cursor contiene
    // únicamente fecha inicial e ID, utilizaremos
    // una consulta auxiliar para recuperar la fecha
    // final del documento correspondiente.

    const usesEndDateFilter =
      filters.fromDateISO !== undefined ||
      filters.endBeforeDateISO !== undefined;

    if (usesEndDateFilter) {
      query = query.orderBy(
        "endDateISO",
        "asc"
      );
    }

    query = query.orderBy(
      FieldPath.documentId(),
      "asc"
    );

    // ------------------------------------------------
    // PAGINACIÓN
    // ------------------------------------------------

    if (
      filters.cursorStartDateISO !== undefined &&
      filters.cursorVacationId !== undefined
    ) {
      if (usesEndDateFilter) {
        const cursorSnapshot =
          await collectionRef
            .doc(filters.cursorVacationId)
            .get();

        if (!cursorSnapshot.exists) {
          throw new HttpsError(
            "failed-precondition",
            "El listado ha cambiado. Actualiza las vacaciones."
          );
        }

        const cursorVacation =
          serializeCenterVacation(cursorSnapshot);

        if (
          cursorVacation.startDateISO !==
          filters.cursorStartDateISO
        ) {
          throw new HttpsError(
            "failed-precondition",
            "El listado ha cambiado. Actualiza las vacaciones."
          );
        }

        if (
          (
            filters.fromDateISO !== undefined &&
            cursorVacation.endDateISO <
              filters.fromDateISO
          ) ||
          (
            filters.toDateISO !== undefined &&
            cursorVacation.startDateISO >
              filters.toDateISO
          ) ||
          (
            filters.endBeforeDateISO !== undefined &&
            cursorVacation.endDateISO >=
              filters.endBeforeDateISO
          )
        ) {
          throw new HttpsError(
            "failed-precondition",
            "El cursor ya no pertenece al listado solicitado."
          );
        }

        query = query.startAfter(
          cursorVacation.startDateISO,
          cursorVacation.endDateISO,
          cursorVacation.id
        );
      } else {
        query = query.startAfter(
          filters.cursorStartDateISO,
          filters.cursorVacationId
        );
      }
    }

    // ------------------------------------------------
    // EJECUTAR CONSULTA
    // ------------------------------------------------

    const snapshot = await query
      .limit(filters.limit + 1)
      .get();

    const hasMore =
      snapshot.docs.length > filters.limit;

    const documents = snapshot.docs.slice(
      0,
      filters.limit
    );

    // ------------------------------------------------
    // VALIDAR Y SERIALIZAR RESULTADOS
    // ------------------------------------------------

    const vacations = documents.map(
      serializeCenterVacation
    );

    // ------------------------------------------------
    // CURSOR DE LA SIGUIENTE PÁGINA
    // ------------------------------------------------

    const lastVacation =
      vacations[vacations.length - 1];

    const nextCursor =
      hasMore && lastVacation
        ? {
            startDateISO:
              lastVacation.startDateISO,

            vacationId:
              lastVacation.id,
          }
        : null;

    // ------------------------------------------------
    // RESPUESTA
    // ------------------------------------------------

    return {
      success: true,
      vacations,
      hasMore,
      nextCursor,
    };
  }
);

// ==================================================
// COMPROBAR SOLAPAMIENTOS DE VACACIONES
// ==================================================

/**
 * Comprueba que no existe otro periodo de vacaciones
 * que coincida con el intervalo solicitado.
 *
 * Debe ejecutarse dentro de una transacción que haya
 * leído previamente el documento de control.
 *
 * Durante la edición permite excluir el propio
 * documento que se está modificando.
 */
async function assertNoCenterVacationOverlap(
  transaction: FirebaseFirestore.Transaction,
  collectionRef: FirebaseFirestore.CollectionReference,
  range: VacationDateRange,
  excludedVacationId?: string
): Promise<void> {
  const overlapQuery = collectionRef
    .where(
      "startDateISO",
      "<=",
      range.endDateISO
    )
    .where(
      "endDateISO",
      ">=",
      range.startDateISO
    )
    .orderBy("startDateISO", "asc")
    .orderBy("endDateISO", "asc")
    .limit(
      excludedVacationId !== undefined ? 2 : 1
    );

  const snapshot =
    await transaction.get(overlapQuery);

  for (const document of snapshot.docs) {
    if (
      excludedVacationId !== undefined &&
      document.id === excludedVacationId
    ) {
      continue;
    }

    const vacation =
      serializeCenterVacation(document);

    if (
      doVacationRangesOverlap(
        range,
        vacation
      )
    ) {
      throw new HttpsError(
        "already-exists",
        "El periodo seleccionado coincide con otras vacaciones del centro.",
        {
          conflictingVacationId:
            vacation.id,

          startDateISO:
            vacation.startDateISO,

          endDateISO:
            vacation.endDateISO,
        }
      );
    }
  }
}

// ==================================================
// ACTUALIZAR CONTROL DE CONCURRENCIA
// ==================================================

/**
 * Actualiza el documento compartido de control.
 *
 * Todas las operaciones de creación, edición y
 * eliminación deberán leer y escribir este documento
 * dentro de su propia transacción.
 */
function updateCenterVacationLock(
  transaction: FirebaseFirestore.Transaction,
  lockRef: FirebaseFirestore.DocumentReference,
  lockSnapshot: FirebaseFirestore.DocumentSnapshot,
  uid: string
): void {
  let revision = 0;

  if (lockSnapshot.exists) {
    const data = lockSnapshot.data();

    if (
      !data ||
      typeof data.revision !== "number" ||
      !Number.isSafeInteger(data.revision) ||
      data.revision < 1 ||
      data.revision >= Number.MAX_SAFE_INTEGER
    ) {
      throw new HttpsError(
        "failed-precondition",
        "El control de vacaciones del centro no es válido."
      );
    }

    revision = data.revision;
  }

  transaction.set(
    lockRef,
    {
      revision: revision + 1,

      updatedAt:
        FieldValue.serverTimestamp(),

      updatedBy: uid,
    },
    {
      merge: true,
    }
  );
}

// ==================================================
// CREAR VACACIONES DEL CENTRO
// ==================================================

/**
 * Crea un periodo de vacaciones del centro.
 *
 * Impide periodos solapados mediante una transacción
 * y un documento compartido de control.
 *
 * No modifica ni cancela citas existentes.
 */
export const createCenterVacation = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // ------------------------------------------------
    // AUTENTICACIÓN
    // ------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // ------------------------------------------------
    // COMPROBAR PERMISOS
    // ------------------------------------------------

    await assertCenterManagementAccess(uid);

    // ------------------------------------------------
    // VALIDAR PETICIÓN
    // ------------------------------------------------

    const vacation = validateVacationInput(
      request.data
    );

    // ------------------------------------------------
    // REFERENCIAS FIRESTORE
    // ------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const vacationsRef = centerRef
      .collection("vacations");

    const vacationRef =
      vacationsRef.doc();

    const lockRef = centerRef
      .collection("scheduleLocks")
      .doc("vacations");

    // ------------------------------------------------
    // CREACIÓN TRANSACCIONAL
    // ------------------------------------------------

    await db.runTransaction(
      async (transaction) => {
        // Leer primero el documento compartido.

        const lockSnapshot =
          await transaction.get(lockRef);

        // Recuperar los permisos actuales.

        const [
          userSnapshot,
          centerSnapshot,
        ] = await Promise.all([
          transaction.get(userRef),
          transaction.get(centerRef),
        ]);

        validateCenterManagementPermissions(
          uid,
          userSnapshot.data(),
          centerSnapshot.data()
        );

        // --------------------------------------------
        // VALIDAR RESTRICCIONES TEMPORALES
        // --------------------------------------------

        assertVacationCreationAllowed(vacation);

        // --------------------------------------------
        // COMPROBAR SOLAPAMIENTOS
        // --------------------------------------------

        await assertNoCenterVacationOverlap(
          transaction,
          vacationsRef,
          vacation
        );

        // --------------------------------------------
        // CREAR VACACIONES
        // --------------------------------------------

        transaction.create(
          vacationRef,
          {
            startDateISO:
              vacation.startDateISO,

            endDateISO:
              vacation.endDateISO,

            reason:
              vacation.reason,

            createdAt:
              FieldValue.serverTimestamp(),

            createdBy: uid,

            updatedAt:
              FieldValue.serverTimestamp(),

            updatedBy: uid,
          }
        );

        // --------------------------------------------
        // ACTUALIZAR CONTROL DE CONCURRENCIA
        // --------------------------------------------

        updateCenterVacationLock(
          transaction,
          lockRef,
          lockSnapshot,
          uid
        );
      }
    );

    // ------------------------------------------------
    // RESPUESTA
    // ------------------------------------------------

    return {
      success: true,
      vacationId: vacationRef.id,
    };
  }
);

// ==================================================
// ACTUALIZAR VACACIONES DEL CENTRO
// ==================================================

/**
 * Actualiza un periodo de vacaciones existente.
 *
 * Permite modificar las fechas y el motivo.
 * Conserva el identificador y la auditoría original.
 *
 * Impide solapamientos con otros periodos mediante
 * una transacción y el documento de concurrencia.
 *
 * No modifica ni cancela citas existentes.
 */
export const updateCenterVacation = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // ------------------------------------------------
    // AUTENTICACIÓN
    // ------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // ------------------------------------------------
    // COMPROBAR PERMISOS
    // ------------------------------------------------

    await assertCenterManagementAccess(uid);

    // ------------------------------------------------
    // VALIDAR PETICIÓN
    // ------------------------------------------------

    const vacation = validateVacationUpdateInput(
      request.data
    );

    // ------------------------------------------------
    // REFERENCIAS FIRESTORE
    // ------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const vacationsRef = centerRef
      .collection("vacations");

    const vacationRef = vacationsRef
      .doc(vacation.vacationId);

    const lockRef = centerRef
      .collection("scheduleLocks")
      .doc("vacations");

    // ------------------------------------------------
    // ACTUALIZACIÓN TRANSACCIONAL
    // ------------------------------------------------

    await db.runTransaction(
      async (transaction) => {
        // Leer primero el documento compartido
        // de control de concurrencia.

        const lockSnapshot =
          await transaction.get(lockRef);

        // Recuperar los permisos y las vacaciones
        // que se quieren modificar.

        const [
          userSnapshot,
          centerSnapshot,
          vacationSnapshot,
        ] = await Promise.all([
          transaction.get(userRef),
          transaction.get(centerRef),
          transaction.get(vacationRef),
        ]);

        // --------------------------------------------
        // VALIDAR PERMISOS ACTUALES
        // --------------------------------------------

        validateCenterManagementPermissions(
          uid,
          userSnapshot.data(),
          centerSnapshot.data()
        );

        // --------------------------------------------
        // COMPROBAR EXISTENCIA
        // --------------------------------------------

        if (!vacationSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "El periodo de vacaciones ya no existe."
          );
        }

        // --------------------------------------------
        // VALIDAR DOCUMENTO ALMACENADO
        // --------------------------------------------

        const storedVacation =
          serializeCenterVacation(
            vacationSnapshot
          );

        // --------------------------------------------
        // VALIDAR RESTRICCIONES TEMPORALES
        // --------------------------------------------

        assertVacationUpdateAllowed(
          storedVacation,
          vacation
        );

        // --------------------------------------------
        // COMPROBAR SOLAPAMIENTOS
        // --------------------------------------------

        // Excluir el propio periodo durante
        // la comprobación de solapamientos.

        await assertNoCenterVacationOverlap(
          transaction,
          vacationsRef,
          vacation,
          vacation.vacationId
        );

        // --------------------------------------------
        // EVITAR ESCRITURAS INNECESARIAS
        // --------------------------------------------

        const hasChanges =
          storedVacation.startDateISO !==
            vacation.startDateISO ||
          storedVacation.endDateISO !==
            vacation.endDateISO ||
          storedVacation.reason !==
            vacation.reason;

        if (!hasChanges) {
          return;
        }

        // --------------------------------------------
        // ACTUALIZAR CAMPOS EDITABLES
        // --------------------------------------------

        transaction.update(
          vacationRef,
          {
            startDateISO:
              vacation.startDateISO,

            endDateISO:
              vacation.endDateISO,

            reason:
              vacation.reason,

            updatedAt:
              FieldValue.serverTimestamp(),

            updatedBy: uid,
          }
        );

        // --------------------------------------------
        // ACTUALIZAR CONTROL DE CONCURRENCIA
        // --------------------------------------------

        updateCenterVacationLock(
          transaction,
          lockRef,
          lockSnapshot,
          uid
        );
      }
    );

    // ------------------------------------------------
    // RESPUESTA
    // ------------------------------------------------

    return {
      success: true,
      vacationId: vacation.vacationId,
    };
  }
);

// ==================================================
// ELIMINAR VACACIONES DEL CENTRO
// ==================================================

/**
 * Elimina un periodo de vacaciones existente.
 *
 * Conserva un registro independiente de auditoría
 * con los datos originales del documento.
 *
 * La eliminación, la auditoría y la actualización
 * del control de concurrencia son atómicas.
 *
 * No modifica ni cancela citas existentes.
 */
export const deleteCenterVacation = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: false,
  },
  async (request) => {
    // ------------------------------------------------
    // AUTENTICACIÓN
    // ------------------------------------------------

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    const uid = request.auth.uid;

    // ------------------------------------------------
    // COMPROBAR PERMISOS
    // ------------------------------------------------

    await assertCenterManagementAccess(uid);

    // ------------------------------------------------
    // VALIDAR PETICIÓN
    // ------------------------------------------------

    const { vacationId } =
      validateVacationIdInput(
        request.data
      );

    // ------------------------------------------------
    // REFERENCIAS FIRESTORE
    // ------------------------------------------------

    const userRef = db
      .collection("users")
      .doc(uid);

    const centerRef = db
      .collection("centers")
      .doc(CENTER_ID);

    const vacationRef = centerRef
      .collection("vacations")
      .doc(vacationId);

    const deletionLogRef = centerRef
      .collection("vacationDeletionLogs")
      .doc();

    const lockRef = centerRef
      .collection("scheduleLocks")
      .doc("vacations");

    // ------------------------------------------------
    // ELIMINACIÓN TRANSACCIONAL
    // ------------------------------------------------

    await db.runTransaction(
      async (transaction) => {
        // Leer primero el documento compartido
        // de control de concurrencia.

        const lockSnapshot =
          await transaction.get(lockRef);

        // Recuperar permisos y documento original.

        const [
          userSnapshot,
          centerSnapshot,
          vacationSnapshot,
        ] = await Promise.all([
          transaction.get(userRef),
          transaction.get(centerRef),
          transaction.get(vacationRef),
        ]);

        // --------------------------------------------
        // VALIDAR PERMISOS ACTUALES
        // --------------------------------------------

        validateCenterManagementPermissions(
          uid,
          userSnapshot.data(),
          centerSnapshot.data()
        );

        // --------------------------------------------
        // COMPROBAR EXISTENCIA
        // --------------------------------------------

        if (!vacationSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "El periodo de vacaciones ya no existe."
          );
        }

        // --------------------------------------------
        // VALIDAR DOCUMENTO ALMACENADO
        // --------------------------------------------

        const validatedVacation =
          serializeCenterVacation(
            vacationSnapshot
          );

        // --------------------------------------------
        // VALIDAR RESTRICCIONES TEMPORALES
        // --------------------------------------------

        assertVacationDeletionAllowed(
          validatedVacation
        );

        const storedVacation =
          vacationSnapshot.data();

        if (!storedVacation) {
          throw new HttpsError(
            "failed-precondition",
            "El periodo de vacaciones almacenado no es válido."
          );
        }

        // --------------------------------------------
        // REGISTRAR AUDITORÍA DE ELIMINACIÓN
        // --------------------------------------------

        transaction.create(
          deletionLogRef,
          {
            vacationId,

            previousVacation:
              storedVacation,

            deletedAt:
              FieldValue.serverTimestamp(),

            deletedBy: uid,
          }
        );

        // --------------------------------------------
        // ELIMINAR VACACIONES
        // --------------------------------------------

        transaction.delete(
          vacationRef
        );

        // --------------------------------------------
        // ACTUALIZAR CONTROL DE CONCURRENCIA
        // --------------------------------------------

        updateCenterVacationLock(
          transaction,
          lockRef,
          lockSnapshot,
          uid
        );
      }
    );

    // ------------------------------------------------
    // RESPUESTA
    // ------------------------------------------------

    return {
      success: true,
      vacationId,
    };
  }
);
