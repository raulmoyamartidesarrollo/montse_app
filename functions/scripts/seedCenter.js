const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "montseapp-302eb",
});

// La base de datos del proyecto se llama "default",
// no "(default)".
const db = admin.firestore();

db.settings({
  databaseId: "default",
});

const CENTER_ID = "montse-main";

async function seedCenter() {
  const centerRef = db.collection("centers").doc(CENTER_ID);

  const existingCenter = await centerRef.get();

  if (existingCenter.exists) {
    console.log("El centro ya existe. No se modifican sus datos.");
    return;
  }

  const batch = db.batch();

  // =====================================
  // CENTRO
  // =====================================

  batch.create(centerRef, {
    name: "Centro de Fisioterapia Montse",
    description:
      "Centro especializado en fisioterapia, rehabilitación y bienestar físico.",

    active: true,
    isDemo: true,

    timezone: "Europe/Madrid",

    contact: {
      phone: "",
      mobile: "",
      whatsapp: "",
      email: "",
      website: "",
    },

    socialMedia: {
      instagram: "",
      facebook: "",
      tiktok: "",
      youtube: "",
      linkedin: "",
      x: "",
    },

    address: {
      street: "",
      number: "",
      floor: "",
      door: "",
      postalCode: "",
      city: "",
      province: "",
      country: "ES",
      formattedAddress: "",
    },

    location: {
      latitude: null,
      longitude: null,
    },

    bookingSettings: {
      defaultDurationMinutes: 60,
      allowRecurringBookings: true,
      recurringIntervalsWeeks: [1, 2, 3, 4],
      allowClientCancellation: true,
      allowClientRescheduling: true,
    },

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // =====================================
  // HORARIO HABITUAL
  // =====================================

  const scheduleRef = centerRef
    .collection("schedules")
    .doc("default");

  const fullDay = [
    { start: "09:00", end: "14:00" },
    { start: "16:00", end: "20:00" },
  ];

  const weekly = {};

  for (const day of [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]) {
    weekly[day] = {
      closed: false,
      intervals: fullDay,
    };
  }

  weekly.saturday = {
    closed: true,
    intervals: [],
  };

  weekly.sunday = {
    closed: true,
    intervals: [],
  };

  batch.create(scheduleRef, {
    weekly,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // =====================================
  // SERVICIOS DE EJEMPLO
  // =====================================

  const services = [
    {
      id: "fisioterapia-general",
      name: "Fisioterapia general",
      description:
        "Valoración y tratamiento de lesiones musculares y articulares.",
      durationMinutes: 60,
      price: 45,
    },
    {
      id: "osteopatia",
      name: "Osteopatía",
      description:
        "Tratamiento manual para mejorar la movilidad.",
      durationMinutes: 60,
      price: 50,
    },
    {
      id: "fisioterapia-deportiva",
      name: "Fisioterapia deportiva",
      description:
        "Prevención y recuperación de lesiones deportivas.",
      durationMinutes: 60,
      price: 50,
    },
    {
      id: "readaptacion-funcional",
      name: "Readaptación funcional",
      description:
        "Recuperación de movilidad y funcionalidad.",
      durationMinutes: 60,
      price: 45,
    },
  ];

  services.forEach((service, index) => {
    const serviceRef = centerRef
      .collection("services")
      .doc(service.id);

    batch.create(serviceRef, {
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: "EUR",
      active: true,
      visibleForBooking: true,
      isDemo: true,
      sortOrder: index + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // =====================================
  // TRABAJADORA PRINCIPAL: MONTSE
  // =====================================

  const workerRef = centerRef
    .collection("workers")
    .doc("montse");

  batch.create(workerRef, {
    userId: null,

    name: "Montse",
    surname: "",

    isOwner: true,
    active: true,

    allServices: true,
    serviceIds: [],

    useCenterSchedule: true,

    availabilityStartDate: null,
    availabilityEndDate: null,

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log("Centro creado correctamente.");
  console.log("Centro:", CENTER_ID);
  console.log("Trabajadora inicial: Montse");
  console.log("Servicios creados:", services.length);
}

seedCenter().catch((error) => {
  console.error("Error creando el centro:", error);
  process.exitCode = 1;
});