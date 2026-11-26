const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isValidSpecialScheduleDate,
  validateSpecialScheduleDate,
  validateSpecialScheduleReason,
  validateSpecialScheduleInput,
  validateSpecialScheduleDateInput,
  validateSpecialScheduleQuery,
  MAX_SPECIAL_SCHEDULE_REASON_LENGTH,
  DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE,
  MAX_SPECIAL_SCHEDULE_PAGE_SIZE,
} = require("../lib/schedules/specialSchedule.js");

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function createSchedule(overrides = {}) {
  return {
    dateISO: "2026-12-24",
    closed: false,
    periods: [
      { start: "09:00", end: "14:00" },
    ],
    reason: "Nochebuena",
    ...overrides,
  };
}

function expectInvalid(validator, value) {
  assert.throws(
    () => validator(value),
    (error) => error.code === "invalid-argument"
  );
}

// ==================================================
// VALIDACIÓN DE FECHAS
// ==================================================

test("01 - Fecha ISO válida", () => {
  assert.equal(
    isValidSpecialScheduleDate("2026-12-24"),
    true
  );
});

test("02 - Fecha válida en año bisiesto", () => {
  assert.equal(
    isValidSpecialScheduleDate("2028-02-29"),
    true
  );
});

test("03 - Febrero no bisiesto", () => {
  assert.equal(
    isValidSpecialScheduleDate("2026-02-29"),
    false
  );
});

test("04 - Día inexistente", () => {
  expectInvalid(
    validateSpecialScheduleDate,
    "2026-04-31"
  );
});

test("05 - Mes inexistente", () => {
  expectInvalid(
    validateSpecialScheduleDate,
    "2026-13-01"
  );
});

test("06 - Día cero", () => {
  expectInvalid(
    validateSpecialScheduleDate,
    "2026-12-00"
  );
});

test("07 - Mes cero", () => {
  expectInvalid(
    validateSpecialScheduleDate,
    "2026-00-01"
  );
});

test("08 - Año cero", () => {
  expectInvalid(
    validateSpecialScheduleDate,
    "0000-01-01"
  );
});

test("09 - Formatos de fecha incorrectos", () => {
  for (const value of [
    "24/12/2026",
    "2026-1-01",
    "2026-12-1",
    "2026-12-24T09:00:00Z",
    "2026-12-24 ",
    "2026-12-24\n",
    "",
    null,
    undefined,
    20261224,
    [],
    {},
  ]) {
    expectInvalid(
      validateSpecialScheduleDate,
      value
    );
  }
});

test("10 - Fechas límite válidas", () => {
  for (const value of [
    "0001-01-01",
    "0099-12-31",
    "9999-12-31",
  ]) {
    assert.equal(
      validateSpecialScheduleDate(value),
      value
    );
  }
});

test("11 - Reglas de años bisiestos seculares", () => {
  assert.equal(
    isValidSpecialScheduleDate("1900-02-29"),
    false
  );

  assert.equal(
    isValidSpecialScheduleDate("2000-02-29"),
    true
  );
});

// ==================================================
// HORARIOS VÁLIDOS
// ==================================================

test("12 - Jornada continua", () => {
  const input = createSchedule();

  assert.deepEqual(
    validateSpecialScheduleInput(input),
    input
  );
});

test("13 - Jornada partida", () => {
  const input = createSchedule({
    periods: [
      { start: "09:00", end: "14:00" },
      { start: "16:00", end: "20:00" },
    ],
  });

  assert.deepEqual(
    validateSpecialScheduleInput(input),
    input
  );
});

test("14 - Centro cerrado", () => {
  const input = createSchedule({
    closed: true,
    periods: [],
  });

  assert.deepEqual(
    validateSpecialScheduleInput(input),
    input
  );
});

test("15 - Tramos consecutivos", () => {
  const input = createSchedule({
    periods: [
      { start: "09:00", end: "14:00" },
      { start: "14:00", end: "18:00" },
    ],
  });

  assert.deepEqual(
    validateSpecialScheduleInput(input),
    input
  );
});

test("16 - Ordenación automática sin mutación", () => {
  const input = createSchedule({
    periods: [
      { start: "16:00", end: "20:00" },
      { start: "09:00", end: "14:00" },
    ],
  });

  const original = structuredClone(input);

  const result =
    validateSpecialScheduleInput(input);

  assert.equal(
    result.periods[0].start,
    "09:00"
  );

  assert.equal(
    result.periods[1].start,
    "16:00"
  );

  assert.deepEqual(input, original);
});

test("17 - Cinco tramos permitidos", () => {
  const input = createSchedule({
    periods: [
      { start: "08:00", end: "09:00" },
      { start: "10:00", end: "11:00" },
      { start: "12:00", end: "13:00" },
      { start: "14:00", end: "15:00" },
      { start: "16:00", end: "17:00" },
    ],
  });

  assert.equal(
    validateSpecialScheduleInput(input)
      .periods.length,
    5
  );
});

// ==================================================
// HORARIOS INCORRECTOS
// ==================================================

test("18 - Más de cinco tramos", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "08:00", end: "09:00" },
        { start: "10:00", end: "11:00" },
        { start: "12:00", end: "13:00" },
        { start: "14:00", end: "15:00" },
        { start: "16:00", end: "17:00" },
        { start: "18:00", end: "19:00" },
      ],
    })
  );
});

test("19 - Tramos solapados", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "09:00", end: "14:00" },
        { start: "13:00", end: "18:00" },
      ],
    })
  );
});

test("20 - Tramos duplicados", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "09:00", end: "14:00" },
        { start: "09:00", end: "14:00" },
      ],
    })
  );
});

test("21 - Tramo contenido en otro", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "09:00", end: "18:00" },
        { start: "10:00", end: "12:00" },
      ],
    })
  );
});

test("22 - Tramo invertido", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "18:00", end: "09:00" },
      ],
    })
  );
});

test("23 - Tramo de duración cero", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "09:00", end: "09:00" },
      ],
    })
  );
});

test("24 - Tramo que cruza medianoche", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        { start: "22:00", end: "02:00" },
      ],
    })
  );
});

test("25 - Centro abierto sin tramos", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      closed: false,
      periods: [],
    })
  );
});

test("26 - Centro cerrado con tramos", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      closed: true,
    })
  );
});

test("27 - Estado cerrado incorrecto", () => {
  for (const closed of [
    "false", 0, 1, null, undefined,
  ]) {
    expectInvalid(
      validateSpecialScheduleInput,
      createSchedule({ closed })
    );
  }
});

test("28 - Tramos que no son un array", () => {
  for (const periods of [
    null, {}, "", undefined,
  ]) {
    expectInvalid(
      validateSpecialScheduleInput,
      createSchedule({ periods })
    );
  }
});

test("29 - Formatos de hora incorrectos", () => {
  for (const start of [
    "9:00",
    "24:00",
    "09:60",
    "09:00 ",
    " 09:00",
    "09:00\n",
    "09:00\r\n",
    "09:00:00",
    null,
    900,
  ]) {
    expectInvalid(
      validateSpecialScheduleInput,
      createSchedule({
        periods: [
          { start, end: "14:00" },
        ],
      })
    );
  }
});

test("30 - Campo de tramo no permitido", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      periods: [
        {
          start: "09:00",
          end: "14:00",
          extra: true,
        },
      ],
    })
  );
});

// ==================================================
// VALIDACIÓN DEL MOTIVO
// ==================================================

test("31 - Motivo vacío permitido", () => {
  assert.equal(
    validateSpecialScheduleReason(""),
    ""
  );
});

test("32 - Normalización del motivo", () => {
  assert.equal(
    validateSpecialScheduleReason(
      "  Nochebuena  "
    ),
    "Nochebuena"
  );
});

test("33 - Motivo compuesto por espacios", () => {
  assert.equal(
    validateSpecialScheduleReason("   "),
    ""
  );
});

test("34 - Longitud máxima del motivo", () => {
  assert.equal(
    MAX_SPECIAL_SCHEDULE_REASON_LENGTH,
    200
  );

  const reason = "a".repeat(200);

  assert.equal(
    validateSpecialScheduleReason(reason),
    reason
  );
});

test("35 - Motivo demasiado largo", () => {
  expectInvalid(
    validateSpecialScheduleReason,
    "a".repeat(201)
  );
});

test("36 - Motivo con tipo incorrecto", () => {
  for (const value of [
    null, undefined, 123, {}, [], true,
  ]) {
    expectInvalid(
      validateSpecialScheduleReason,
      value
    );
  }
});

// ==================================================
// SEGURIDAD DE PARÁMETROS
// ==================================================

test("37 - Campos obligatorios", () => {
  for (const key of [
    "dateISO",
    "closed",
    "periods",
    "reason",
  ]) {
    const input = createSchedule();

    delete input[key];

    expectInvalid(
      validateSpecialScheduleInput,
      input
    );
  }
});

test("38 - Campos adicionales no permitidos", () => {
  expectInvalid(
    validateSpecialScheduleInput,
    createSchedule({
      centerId: "otro-centro",
    })
  );
});

test("39 - Manipulación de campos de auditoría", () => {
  for (const key of [
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "deletedAt",
    "deletedBy",
  ]) {
    expectInvalid(
      validateSpecialScheduleInput,
      createSchedule({
        [key]: "manipulado",
      })
    );
  }
});

test("40 - Peticiones incorrectas", () => {
  for (const input of [
    null, undefined, [], "", 123, true,
  ]) {
    expectInvalid(
      validateSpecialScheduleInput,
      input
    );
  }
});

// ==================================================
// VALIDACIÓN DE ELIMINACIÓN
// ==================================================

test("41 - Eliminación válida", () => {
  const input = {
    dateISO: "2026-12-24",
  };

  assert.deepEqual(
    validateSpecialScheduleDateInput(input),
    input
  );
});

test("42 - Eliminación con fecha incorrecta", () => {
  expectInvalid(
    validateSpecialScheduleDateInput,
    { dateISO: "2026-02-30" }
  );
});

test("43 - Eliminación sin fecha", () => {
  expectInvalid(
    validateSpecialScheduleDateInput,
    {}
  );
});

test("44 - Eliminación con campos adicionales", () => {
  expectInvalid(
    validateSpecialScheduleDateInput,
    {
      dateISO: "2026-12-24",
      deletedBy: "otro-usuario",
    }
  );
});

test("45 - Eliminación con petición incorrecta", () => {
  for (const value of [
    null, undefined, [], "", 123,
  ]) {
    expectInvalid(
      validateSpecialScheduleDateInput,
      value
    );
  }
});

// ==================================================
// CONSULTAS Y PAGINACIÓN
// ==================================================

test("46 - Consulta sin filtros", () => {
  assert.equal(
    DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE,
    50
  );

  assert.deepEqual(
    validateSpecialScheduleQuery({}),
    { limit: 50 }
  );
});

test("47 - Consulta con fecha inicial", () => {
  assert.deepEqual(
    validateSpecialScheduleQuery({
      fromDateISO: "2026-12-01",
    }),
    {
      fromDateISO: "2026-12-01",
      limit: 50,
    }
  );
});

test("48 - Consulta con fecha final", () => {
  assert.deepEqual(
    validateSpecialScheduleQuery({
      toDateISO: "2026-12-31",
    }),
    {
      toDateISO: "2026-12-31",
      limit: 50,
    }
  );
});

test("49 - Consulta con rango válido", () => {
  const input = {
    fromDateISO: "2026-12-01",
    toDateISO: "2026-12-31",
    limit: 20,
  };

  assert.deepEqual(
    validateSpecialScheduleQuery(input),
    input
  );
});

test("50 - Consulta de un único día", () => {
  const input = {
    fromDateISO: "2026-12-24",
    toDateISO: "2026-12-24",
    limit: 1,
  };

  assert.deepEqual(
    validateSpecialScheduleQuery(input),
    input
  );
});

test("51 - Rango de fechas invertido", () => {
  expectInvalid(
    validateSpecialScheduleQuery,
    {
      fromDateISO: "2026-12-31",
      toDateISO: "2026-12-01",
    }
  );
});

test("52 - Filtros de fechas incorrectos", () => {
  for (const key of [
    "fromDateISO",
    "toDateISO",
    "cursorDateISO",
  ]) {
    expectInvalid(
      validateSpecialScheduleQuery,
      { [key]: "2026-02-30" }
    );
  }
});

test("53 - Límites de paginación válidos", () => {
  assert.equal(
    MAX_SPECIAL_SCHEDULE_PAGE_SIZE,
    100
  );

  for (const limit of [1, 50, 100]) {
    assert.deepEqual(
      validateSpecialScheduleQuery({ limit }),
      { limit }
    );
  }
});

test("54 - Límites de paginación incorrectos", () => {
  for (const limit of [
    0, -1, 101, 1.5, "50",
    null, undefined, NaN, Infinity,
  ]) {
    expectInvalid(
      validateSpecialScheduleQuery,
      { limit }
    );
  }
});

test("55 - Cursor válido sin rango", () => {
  assert.deepEqual(
    validateSpecialScheduleQuery({
      cursorDateISO: "2026-12-24",
    }),
    {
      cursorDateISO: "2026-12-24",
      limit: 50,
    }
  );
});

test("56 - Cursor válido dentro del rango", () => {
  const input = {
    fromDateISO: "2026-12-01",
    toDateISO: "2026-12-31",
    cursorDateISO: "2026-12-24",
    limit: 10,
  };

  assert.deepEqual(
    validateSpecialScheduleQuery(input),
    input
  );
});

test("57 - Cursor anterior al rango", () => {
  expectInvalid(
    validateSpecialScheduleQuery,
    {
      fromDateISO: "2026-12-01",
      cursorDateISO: "2026-11-30",
    }
  );
});

test("58 - Cursor posterior al rango", () => {
  expectInvalid(
    validateSpecialScheduleQuery,
    {
      toDateISO: "2026-12-31",
      cursorDateISO: "2027-01-01",
    }
  );
});

test("59 - Cursor igual a los límites", () => {
  for (const cursorDateISO of [
    "2026-12-01",
    "2026-12-31",
  ]) {
    const input = {
      fromDateISO: "2026-12-01",
      toDateISO: "2026-12-31",
      cursorDateISO,
      limit: 10,
    };

    assert.deepEqual(
      validateSpecialScheduleQuery(input),
      input
    );
  }
});

test("60 - Consulta con campos no permitidos", () => {
  expectInvalid(
    validateSpecialScheduleQuery,
    {
      centerId: "otro-centro",
    }
  );
});

test("61 - Consulta con petición incorrecta", () => {
  for (const value of [
    null, undefined, [], "", 123, true,
  ]) {
    expectInvalid(
      validateSpecialScheduleQuery,
      value
    );
  }
});

test("62 - Consulta sin mutación de parámetros", () => {
  const input = {
    fromDateISO: "2026-12-01",
  };

  const original = structuredClone(input);

  validateSpecialScheduleQuery(input);

  assert.deepEqual(input, original);
});
