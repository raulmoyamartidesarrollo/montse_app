const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createEmptyWeeklySchedule,
  validateWeeklySchedule,
  isValidScheduleTime,
  scheduleTimeToMinutes,
} = require("../lib/schedules/weeklySchedule.js");

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function createSchedule(periods) {
  const weekly = createEmptyWeeklySchedule();

  weekly.monday = {
    closed: false,
    periods,
  };

  return weekly;
}

function expectInvalid(weekly) {
  assert.throws(
    () => validateWeeklySchedule(weekly),
    (error) => error.code === "invalid-argument"
  );
}

// ==================================================
// HORARIOS VÁLIDOS
// ==================================================

test("01 - Horario semanal vacío", () => {
  const weekly = createEmptyWeeklySchedule();

  assert.equal(Object.keys(weekly).length, 7);
  assert.deepEqual(
    validateWeeklySchedule(weekly),
    weekly
  );
});

test("02 - Jornada continua", () => {
  const weekly = createSchedule([
    { start: "09:00", end: "17:00" },
  ]);

  assert.deepEqual(
    validateWeeklySchedule(weekly),
    weekly
  );
});

test("03 - Jornada partida", () => {
  const weekly = createSchedule([
    { start: "09:00", end: "14:00" },
    { start: "16:00", end: "20:00" },
  ]);

  assert.deepEqual(
    validateWeeklySchedule(weekly),
    weekly
  );
});

test("04 - Tramos consecutivos", () => {
  const weekly = createSchedule([
    { start: "09:00", end: "14:00" },
    { start: "14:00", end: "18:00" },
  ]);

  assert.deepEqual(
    validateWeeklySchedule(weekly),
    weekly
  );
});

test("05 - Ordenación automática de tramos", () => {
  const weekly = createSchedule([
    { start: "16:00", end: "20:00" },
    { start: "09:00", end: "14:00" },
  ]);

  const result = validateWeeklySchedule(weekly);

  assert.equal(
    result.monday.periods[0].start,
    "09:00"
  );

  assert.equal(
    result.monday.periods[1].start,
    "16:00"
  );

  // La validación no modifica el objeto original.
  assert.equal(
    weekly.monday.periods[0].start,
    "16:00"
  );
});

test("06 - Cinco tramos diarios permitidos", () => {
  const weekly = createSchedule([
    { start: "08:00", end: "09:00" },
    { start: "10:00", end: "11:00" },
    { start: "12:00", end: "13:00" },
    { start: "14:00", end: "15:00" },
    { start: "16:00", end: "17:00" },
  ]);

  assert.equal(
    validateWeeklySchedule(weekly)
      .monday.periods.length,
    5
  );
});

// ==================================================
// HORARIOS INCORRECTOS
// ==================================================

test("07 - Tramos solapados", () => {
  expectInvalid(createSchedule([
    { start: "09:00", end: "14:00" },
    { start: "13:00", end: "18:00" },
  ]));
});

test("08 - Horario invertido", () => {
  expectInvalid(createSchedule([
    { start: "18:00", end: "09:00" },
  ]));
});

test("09 - Tramo de duración cero", () => {
  expectInvalid(createSchedule([
    { start: "09:00", end: "09:00" },
  ]));
});

test("10 - Hora fuera de rango", () => {
  expectInvalid(createSchedule([
    { start: "09:00", end: "25:00" },
  ]));
});

test("11 - Formato de hora incorrecto", () => {
  expectInvalid(createSchedule([
    { start: "9:00", end: "14:00" },
  ]));
});

test("12 - Horario que cruza medianoche", () => {
  expectInvalid(createSchedule([
    { start: "22:00", end: "02:00" },
  ]));
});

test("13 - Día abierto sin tramos", () => {
  expectInvalid(createSchedule([]));
});

test("14 - Día cerrado con tramos", () => {
  const weekly = createEmptyWeeklySchedule();

  weekly.monday = {
    closed: true,
    periods: [
      { start: "09:00", end: "14:00" },
    ],
  };

  expectInvalid(weekly);
});

test("15 - Más de cinco tramos diarios", () => {
  expectInvalid(createSchedule([
    { start: "08:00", end: "09:00" },
    { start: "10:00", end: "11:00" },
    { start: "12:00", end: "13:00" },
    { start: "14:00", end: "15:00" },
    { start: "16:00", end: "17:00" },
    { start: "18:00", end: "19:00" },
  ]));
});

test("16 - Falta un día de la semana", () => {
  const weekly = createEmptyWeeklySchedule();

  delete weekly.sunday;

  expectInvalid(weekly);
});

test("17 - Día desconocido", () => {
  const weekly = createEmptyWeeklySchedule();

  weekly.extraDay = {
    closed: true,
    periods: [],
  };

  expectInvalid(weekly);
});

test("18 - Campo diario no permitido", () => {
  const weekly = createEmptyWeeklySchedule();

  weekly.monday.extra = true;

  expectInvalid(weekly);
});

test("19 - Campo de tramo no permitido", () => {
  expectInvalid(createSchedule([
    {
      start: "09:00",
      end: "14:00",
      extra: true,
    },
  ]));
});

test("20 - Estado cerrado incorrecto", () => {
  const weekly = createEmptyWeeklySchedule();

  weekly.monday.closed = "true";

  expectInvalid(weekly);
});

test("21 - Horario semanal nulo", () => {
  expectInvalid(null);
});

test("22 - Horario semanal como array", () => {
  expectInvalid([]);
});

test("23 - Tramos duplicados", () => {
  expectInvalid(createSchedule([
    { start: "09:00", end: "14:00" },
    { start: "09:00", end: "14:00" },
  ]));
});

test("24 - Tramos contenidos en otros tramos", () => {
  expectInvalid(createSchedule([
    { start: "09:00", end: "20:00" },
    { start: "10:00", end: "11:00" },
  ]));
});

test("25 - Tramos que no son un array", () => {
  const weekly = createEmptyWeeklySchedule();

  weekly.monday.periods = {};

  expectInvalid(weekly);
});

// ==================================================
// FUNCIONES AUXILIARES DE HORAS
// ==================================================

test("26 - Validación de horas límite", () => {
  assert.equal(isValidScheduleTime("00:00"), true);
  assert.equal(isValidScheduleTime("23:59"), true);
  assert.equal(isValidScheduleTime("24:00"), false);
  assert.equal(isValidScheduleTime("12:60"), false);
  assert.equal(isValidScheduleTime("9:00"), false);
  assert.equal(isValidScheduleTime(null), false);
});

test("27 - Conversión de horas a minutos", () => {
  assert.equal(scheduleTimeToMinutes("00:00"), 0);
  assert.equal(scheduleTimeToMinutes("09:30"), 570);
  assert.equal(scheduleTimeToMinutes("14:00"), 840);
  assert.equal(scheduleTimeToMinutes("23:59"), 1439);
});

test("28 - Conversión de hora incorrecta", () => {
  assert.throws(
    () => scheduleTimeToMinutes("25:00"),
    (error) => error.code === "invalid-argument"
  );
});
