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
 * El código no caduca y no está vinculado
 * previamente a ningún correo electrónico.
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
        invitation?.centerId !== CENTER_ID
      ) {
        throw activationError(
          "permission-denied",
          "El código no es válido o ya ha sido utilizado."
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