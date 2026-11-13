import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createHash } from "node:crypto";

initializeApp();

const db = getFirestore("default");

const CENTER_ID = "montse-main";
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

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
    const clientRef = centerRef.collection("clients").doc(uid);

    await db.runTransaction(async (transaction) => {
      const centerSnapshot = await transaction.get(centerRef);
      const userSnapshot = await transaction.get(userRef);
      const clientSnapshot = await transaction.get(clientRef);

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

            // Controla si el usuario ha completado
            // la pantalla inicial de activación.
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
      } else if (!userSnapshot.data()?.centerId) {
        transaction.update(userRef, {
          centerId: CENTER_ID,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Se conserva la relación actual por compatibilidad.
      // Antes de gestionar pacientes reales separaremos
      // las cuentas profesionales de las fichas clínicas.
      if (!clientSnapshot.exists) {
        transaction.create(clientRef, {
          userId: uid,
          status: "active",
          joinedAt: FieldValue.serverTimestamp(),
        });
      }
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