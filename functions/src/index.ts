import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

initializeApp();

const db = getFirestore("default");

const CENTER_ID = "montse-main";

/**
 * Crea el perfil del usuario autenticado y lo vincula
 * automáticamente al único centro de MontseApp.
 *
 * Nunca modifica los roles de un usuario existente.
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

    const centerRef = db.collection("centers").doc(CENTER_ID);
    const userRef = db.collection("users").doc(uid);
    const clientRef = centerRef.collection("clients").doc(uid);

    await db.runTransaction(async (transaction) => {
      // Todas las lecturas deben realizarse antes
      // de cualquier escritura.
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
        const existingData = userSnapshot.data();

        // Vincular al centro sin modificar roles.
        if (!existingData?.centerId) {
          transaction.update(userRef, {
            centerId: CENTER_ID,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Crear relación con el centro.
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