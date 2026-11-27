const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateVacationId,
  validateVacationReason,
  validateVacationRange,
  validateVacationInput,
  validateVacationUpdateInput,
  validateVacationIdInput,
  validateVacationQuery,
  doVacationRangesOverlap,
  getVacationTodayISO,
  assertVacationCreationAllowed,
  assertVacationUpdateAllowed,
  assertVacationDeletionAllowed,
} = require("../lib/schedules/vacationSchedule.js");

const ID = "aB3dE5fG7hJ9kL2mN4pQ";

const RANGE = {
  startDateISO: "2027-08-10",
  endDateISO: "2027-08-20",
};

const INPUT = {
  ...RANGE,
  reason: "Vacaciones de verano",
};

function expectInvalid(callback) {
  assert.throws(
    callback,
    (error) => error.code === "invalid-argument"
  );
}

function range(startDateISO, endDateISO) {
  return {
    startDateISO,
    endDateISO,
  };
}

// ==================================================
// IDENTIFICADORES
// ==================================================

test("01 - Identificador válido", () => {
  assert.equal(validateVacationId(ID), ID);
});

test("02 - Identificador demasiado corto", () => {
  expectInvalid(() => validateVacationId("abc"));
});

test("03 - Identificador demasiado largo", () => {
  expectInvalid(() => validateVacationId(ID + "a"));
});

test("04 - Identificador con caracteres especiales", () => {
  expectInvalid(() =>
    validateVacationId(ID.slice(0, 19) + "/")
  );
});

test("05 - Identificador con espacios", () => {
  expectInvalid(() =>
    validateVacationId(ID.slice(0, 19) + " ")
  );
});

test("06 - Identificadores con tipos incorrectos", () => {
  for (const value of [null, undefined, 123, {}, []]) {
    expectInvalid(() => validateVacationId(value));
  }
});

// ==================================================
// MOTIVOS
// ==================================================

test("07 - Motivo válido", () => {
  assert.equal(
    validateVacationReason("Vacaciones"),
    "Vacaciones"
  );
});

test("08 - Motivo vacío permitido", () => {
  assert.equal(validateVacationReason(""), "");
});

test("09 - Normalización del motivo", () => {
  assert.equal(
    validateVacationReason("  Vacaciones  "),
    "Vacaciones"
  );
});

test("10 - Motivo compuesto por espacios", () => {
  assert.equal(validateVacationReason("   "), "");
});

test("11 - Motivo de 200 caracteres", () => {
  const reason = "a".repeat(200);

  assert.equal(
    validateVacationReason(reason),
    reason
  );
});

test("12 - Motivo de 201 caracteres", () => {
  expectInvalid(() =>
    validateVacationReason("a".repeat(201))
  );
});

test("13 - Longitud antes de normalizar", () => {
  expectInvalid(() =>
    validateVacationReason(" ".repeat(201))
  );
});

test("14 - Motivo con tipo incorrecto", () => {
  for (const value of [null, undefined, 123, {}, []]) {
    expectInvalid(() =>
      validateVacationReason(value)
    );
  }
});

// ==================================================
// PERIODOS Y FECHAS
// ==================================================

test("15 - Periodo válido", () => {
  assert.deepEqual(
    validateVacationRange(RANGE),
    RANGE
  );
});

test("16 - Vacaciones de un único día", () => {
  const value = range(
    "2027-08-10",
    "2027-08-10"
  );

  assert.deepEqual(
    validateVacationRange(value),
    value
  );
});

test("17 - Periodo entre distintos meses", () => {
  const value = range(
    "2027-07-25",
    "2027-08-10"
  );

  assert.deepEqual(
    validateVacationRange(value),
    value
  );
});

test("18 - Periodo entre distintos años", () => {
  const value = range(
    "2027-12-20",
    "2028-01-10"
  );

  assert.deepEqual(
    validateVacationRange(value),
    value
  );
});

test("19 - Fecha final anterior a la inicial", () => {
  expectInvalid(() =>
    validateVacationRange(
      range("2027-08-20", "2027-08-10")
    )
  );
});

test("20 - Fecha inexistente", () => {
  expectInvalid(() =>
    validateVacationRange(
      range("2027-02-30", "2027-03-10")
    )
  );
});

test("21 - Año bisiesto válido", () => {
  const value = range(
    "2028-02-29",
    "2028-03-01"
  );

  assert.deepEqual(
    validateVacationRange(value),
    value
  );
});

test("22 - Año no bisiesto", () => {
  expectInvalid(() =>
    validateVacationRange(
      range("2027-02-29", "2027-03-01")
    )
  );
});

test("23 - Formatos de fecha incorrectos", () => {
  for (const value of [
    "10/08/2027",
    "2027-8-10",
    "2027-08-1",
    "2027-13-01",
    "2027-00-01",
    "2027-08-00",
    "0000-01-01",
    "2027-08-10T00:00:00Z",
    null,
    123,
  ]) {
    expectInvalid(() =>
      validateVacationRange(
        range(value, "2027-12-31")
      )
    );
  }
});

test("24 - Fechas límite válidas", () => {
  const value = range(
    "0001-01-01",
    "9999-12-31"
  );

  assert.deepEqual(
    validateVacationRange(value),
    value
  );
});

test("25 - Periodo sin fecha inicial", () => {
  expectInvalid(() =>
    validateVacationRange({
      endDateISO: "2027-08-20",
    })
  );
});

test("26 - Periodo sin fecha final", () => {
  expectInvalid(() =>
    validateVacationRange({
      startDateISO: "2027-08-10",
    })
  );
});

test("27 - Periodo con campos adicionales", () => {
  expectInvalid(() =>
    validateVacationRange({
      ...RANGE,
      extra: true,
    })
  );
});

// ==================================================
// CREACION
// ==================================================

test("28 - Creación válida", () => {
  assert.deepEqual(
    validateVacationInput(INPUT),
    INPUT
  );
});

test("29 - Creación con motivo vacío", () => {
  const value = {
    ...RANGE,
    reason: "",
  };

  assert.deepEqual(
    validateVacationInput(value),
    value
  );
});

test("30 - Creación normaliza el motivo", () => {
  assert.deepEqual(
    validateVacationInput({
      ...RANGE,
      reason: "  Vacaciones  ",
    }),
    {
      ...RANGE,
      reason: "Vacaciones",
    }
  );
});

test("31 - Creación sin motivo", () => {
  expectInvalid(() =>
    validateVacationInput(RANGE)
  );
});

test("32 - Creación con identificador externo", () => {
  expectInvalid(() =>
    validateVacationInput({
      ...INPUT,
      vacationId: ID,
    })
  );
});

test("33 - Manipulación de auditoría en creación", () => {
  for (const field of [
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "centerId",
  ]) {
    expectInvalid(() =>
      validateVacationInput({
        ...INPUT,
        [field]: "manipulado",
      })
    );
  }
});

test("34 - Peticiones de creación incorrectas", () => {
  for (const value of [
    null, undefined, [], {}, 123, "texto"
  ]) {
    expectInvalid(() =>
      validateVacationInput(value)
    );
  }
});

test("35 - Creación sin mutación de parámetros", () => {
  const value = Object.freeze({
    ...RANGE,
    reason: "  Vacaciones  ",
  });

  validateVacationInput(value);

  assert.equal(
    value.reason,
    "  Vacaciones  "
  );
});

// ==================================================
// ACTUALIZACION
// ==================================================

test("36 - Actualización válida", () => {
  const value = {
    ...INPUT,
    vacationId: ID,
  };

  assert.deepEqual(
    validateVacationUpdateInput(value),
    value
  );
});

test("37 - Actualización sin identificador", () => {
  expectInvalid(() =>
    validateVacationUpdateInput(INPUT)
  );
});

test("38 - Actualización con identificador incorrecto", () => {
  expectInvalid(() =>
    validateVacationUpdateInput({
      ...INPUT,
      vacationId: "incorrecto",
    })
  );
});

test("39 - Actualización con fechas invertidas", () => {
  expectInvalid(() =>
    validateVacationUpdateInput({
      ...INPUT,
      vacationId: ID,
      startDateISO: "2027-08-25",
    })
  );
});

test("40 - Manipulación de auditoría en edición", () => {
  for (const field of [
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "centerId",
  ]) {
    expectInvalid(() =>
      validateVacationUpdateInput({
        ...INPUT,
        vacationId: ID,
        [field]: "manipulado",
      })
    );
  }
});

// ==================================================
// ELIMINACION
// ==================================================

test("41 - Eliminación válida", () => {
  assert.deepEqual(
    validateVacationIdInput({
      vacationId: ID,
    }),
    {
      vacationId: ID,
    }
  );
});

test("42 - Eliminación sin identificador", () => {
  expectInvalid(() =>
    validateVacationIdInput({})
  );
});

test("43 - Eliminación con identificador incorrecto", () => {
  expectInvalid(() =>
    validateVacationIdInput({
      vacationId: "incorrecto",
    })
  );
});

test("44 - Eliminación con campos adicionales", () => {
  expectInvalid(() =>
    validateVacationIdInput({
      vacationId: ID,
      deletedBy: "otro-usuario",
    })
  );
});

// ==================================================
// CONSULTAS
// ==================================================

test("45 - Consulta sin filtros", () => {
  assert.deepEqual(
    validateVacationQuery({}),
    {
      limit: 50,
    }
  );
});

test("46 - Consulta de vacaciones actuales y futuras", () => {
  assert.deepEqual(
    validateVacationQuery({
      fromDateISO: "2027-08-15",
    }),
    {
      fromDateISO: "2027-08-15",
      limit: 50,
    }
  );
});

test("47 - Consulta de calendario mensual", () => {
  assert.deepEqual(
    validateVacationQuery({
      fromDateISO: "2027-08-01",
      toDateISO: "2027-08-31",
      limit: 31,
    }),
    {
      fromDateISO: "2027-08-01",
      toDateISO: "2027-08-31",
      limit: 31,
    }
  );
});

test("48 - Consulta de histórico", () => {
  assert.deepEqual(
    validateVacationQuery({
      endBeforeDateISO: "2027-08-15",
    }),
    {
      endBeforeDateISO: "2027-08-15",
      limit: 50,
    }
  );
});

test("49 - Histórico incompatible con fecha inicial", () => {
  expectInvalid(() =>
    validateVacationQuery({
      endBeforeDateISO: "2027-08-15",
      fromDateISO: "2027-08-01",
    })
  );
});

test("50 - Histórico incompatible con fecha final", () => {
  expectInvalid(() =>
    validateVacationQuery({
      endBeforeDateISO: "2027-08-15",
      toDateISO: "2027-08-31",
    })
  );
});

test("51 - Rango de consulta invertido", () => {
  expectInvalid(() =>
    validateVacationQuery({
      fromDateISO: "2027-08-31",
      toDateISO: "2027-08-01",
    })
  );
});

test("52 - Consulta con fechas incorrectas", () => {
  for (const field of [
    "fromDateISO",
    "toDateISO",
    "endBeforeDateISO",
  ]) {
    expectInvalid(() =>
      validateVacationQuery({
        [field]: "2027-02-30",
      })
    );
  }
});

test("53 - Consulta de un único día", () => {
  const value = {
    fromDateISO: "2027-08-15",
    toDateISO: "2027-08-15",
    limit: 20,
  };

  assert.deepEqual(
    validateVacationQuery(value),
    value
  );
});

// ==================================================
// PAGINACION
// ==================================================

test("54 - Límites de paginación válidos", () => {
  for (const limit of [1, 20, 50, 100]) {
    assert.equal(
      validateVacationQuery({ limit }).limit,
      limit
    );
  }
});

test("55 - Límites de paginación incorrectos", () => {
  for (const limit of [
    0, -1, 101, 1.5, "20",
    null, NaN, Infinity
  ]) {
    expectInvalid(() =>
      validateVacationQuery({ limit })
    );
  }
});

test("56 - Cursor compuesto válido", () => {
  const value = {
    cursorStartDateISO: "2027-08-10",
    cursorVacationId: ID,
    limit: 20,
  };

  assert.deepEqual(
    validateVacationQuery(value),
    value
  );
});

test("57 - Cursor sin identificador", () => {
  expectInvalid(() =>
    validateVacationQuery({
      cursorStartDateISO: "2027-08-10",
    })
  );
});

test("58 - Cursor sin fecha", () => {
  expectInvalid(() =>
    validateVacationQuery({
      cursorVacationId: ID,
    })
  );
});

test("59 - Cursor con identificador incorrecto", () => {
  expectInvalid(() =>
    validateVacationQuery({
      cursorStartDateISO: "2027-08-10",
      cursorVacationId: "incorrecto",
    })
  );
});

test("60 - Cursor anterior al inicio del mes permitido", () => {
  const value = {
    fromDateISO: "2027-08-01",
    toDateISO: "2027-08-31",
    cursorStartDateISO: "2027-07-25",
    cursorVacationId: ID,
    limit: 20,
  };

  assert.deepEqual(
    validateVacationQuery(value),
    value
  );
});

test("61 - Cursor posterior al límite del calendario", () => {
  expectInvalid(() =>
    validateVacationQuery({
      toDateISO: "2027-08-31",
      cursorStartDateISO: "2027-09-01",
      cursorVacationId: ID,
    })
  );
});

test("62 - Cursor válido del histórico", () => {
  const value = {
    endBeforeDateISO: "2027-08-15",
    cursorStartDateISO: "2027-08-10",
    cursorVacationId: ID,
    limit: 20,
  };

  assert.deepEqual(
    validateVacationQuery(value),
    value
  );
});

test("63 - Cursor igual al límite del histórico", () => {
  expectInvalid(() =>
    validateVacationQuery({
      endBeforeDateISO: "2027-08-15",
      cursorStartDateISO: "2027-08-15",
      cursorVacationId: ID,
    })
  );
});

test("64 - Cursor posterior al histórico", () => {
  expectInvalid(() =>
    validateVacationQuery({
      endBeforeDateISO: "2027-08-15",
      cursorStartDateISO: "2027-08-20",
      cursorVacationId: ID,
    })
  );
});

test("65 - Consulta con campos no permitidos", () => {
  expectInvalid(() =>
    validateVacationQuery({
      centerId: "otro-centro",
    })
  );
});

test("66 - Consulta sin mutación de parámetros", () => {
  const value = Object.freeze({
    fromDateISO: "2027-08-01",
    toDateISO: "2027-08-31",
  });

  validateVacationQuery(value);

  assert.deepEqual(value, {
    fromDateISO: "2027-08-01",
    toDateISO: "2027-08-31",
  });
});

// ==================================================
// SOLAPAMIENTOS
// ==================================================

test("67 - Periodos idénticos", () => {
  assert.equal(
    doVacationRangesOverlap(RANGE, RANGE),
    true
  );
});

test("68 - Solapamiento por la izquierda", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-01", "2027-08-15")
    ),
    true
  );
});

test("69 - Solapamiento por la derecha", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-15", "2027-08-25")
    ),
    true
  );
});

test("70 - Periodo contenido en otro", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-12", "2027-08-18")
    ),
    true
  );
});

test("71 - Periodo que contiene otro", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-01", "2027-08-31")
    ),
    true
  );
});

test("72 - Coincidencia en fecha inicial", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-01", "2027-08-10")
    ),
    true
  );
});

test("73 - Coincidencia en fecha final", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-20", "2027-08-25")
    ),
    true
  );
});

test("74 - Periodo consecutivo anterior", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-01", "2027-08-09")
    ),
    false
  );
});

test("75 - Periodo consecutivo posterior", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-21", "2027-08-25")
    ),
    false
  );
});

test("76 - Periodos completamente separados", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-09-01", "2027-09-10")
    ),
    false
  );
});

test("77 - Solapamiento de un único día", () => {
  assert.equal(
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-15", "2027-08-15")
    ),
    true
  );
});

test("78 - Solapamiento entre distintos años", () => {
  assert.equal(
    doVacationRangesOverlap(
      range("2027-12-20", "2028-01-10"),
      range("2028-01-01", "2028-01-15")
    ),
    true
  );
});

test("79 - Solapamiento simétrico", () => {
  const other = range(
    "2027-08-15",
    "2027-08-25"
  );

  assert.equal(
    doVacationRangesOverlap(RANGE, other),
    doVacationRangesOverlap(other, RANGE)
  );
});

test("80 - Solapamiento con periodo incorrecto", () => {
  expectInvalid(() =>
    doVacationRangesOverlap(
      RANGE,
      range("2027-08-25", "2027-08-10")
    )
  );
});

// ==================================================
// RESTRICCIONES TEMPORALES
// ==================================================

const TODAY = "2027-08-15";

const FUTURE_VACATION = range(
  "2027-08-20",
  "2027-08-30"
);

const CURRENT_VACATION = range(
  "2027-08-10",
  "2027-08-20"
);

const PAST_VACATION = range(
  "2027-08-01",
  "2027-08-10"
);

function expectTemporalRestriction(callback) {
  assert.throws(
    callback,
    (error) => error.code === "failed-precondition"
  );
}

// ==================================================
// ZONA HORARIA EUROPE/MADRID
// ==================================================

test("81 - Fecha local en invierno", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-01-15T12:00:00Z")
    ),
    "2027-01-15"
  );
});

test("82 - Cambio de día en invierno", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-01-15T23:00:00Z")
    ),
    "2027-01-16"
  );
});

test("83 - Antes de medianoche en invierno", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-01-15T22:59:59Z")
    ),
    "2027-01-15"
  );
});

test("84 - Fecha local en verano", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-08-15T12:00:00Z")
    ),
    "2027-08-15"
  );
});

test("85 - Cambio de día en verano", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-08-15T22:00:00Z")
    ),
    "2027-08-16"
  );
});

test("86 - Antes de medianoche en verano", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-08-15T21:59:59Z")
    ),
    "2027-08-15"
  );
});

test("87 - Cambio de año en España", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2027-12-31T23:00:00Z")
    ),
    "2028-01-01"
  );
});

test("88 - Año bisiesto en España", () => {
  assert.equal(
    getVacationTodayISO(
      new Date("2028-02-28T23:00:00Z")
    ),
    "2028-02-29"
  );
});

// ==================================================
// CREACIÓN
// ==================================================

test("89 - Crear vacaciones futuras", () => {
  assert.doesNotThrow(() =>
    assertVacationCreationAllowed(
      FUTURE_VACATION,
      TODAY
    )
  );
});

test("90 - Crear vacaciones desde hoy", () => {
  assert.doesNotThrow(() =>
    assertVacationCreationAllowed(
      range(TODAY, "2027-08-20"),
      TODAY
    )
  );
});

test("91 - Crear vacaciones de un único día hoy", () => {
  assert.doesNotThrow(() =>
    assertVacationCreationAllowed(
      range(TODAY, TODAY),
      TODAY
    )
  );
});

test("92 - Impedir creación de vacaciones pasadas", () => {
  expectTemporalRestriction(() =>
    assertVacationCreationAllowed(
      PAST_VACATION,
      TODAY
    )
  );
});

test("93 - Impedir creación con inicio anterior a hoy", () => {
  expectTemporalRestriction(() =>
    assertVacationCreationAllowed(
      CURRENT_VACATION,
      TODAY
    )
  );
});

// ==================================================
// ACTUALIZACIÓN DE VACACIONES FUTURAS
// ==================================================

test("94 - Modificar fechas de vacaciones futuras", () => {
  assert.doesNotThrow(() =>
    assertVacationUpdateAllowed(
      FUTURE_VACATION,
      range("2027-08-21", "2027-08-31"),
      TODAY
    )
  );
});

test("95 - Adelantar vacaciones futuras hasta hoy", () => {
  assert.doesNotThrow(() =>
    assertVacationUpdateAllowed(
      FUTURE_VACATION,
      range(TODAY, "2027-08-30"),
      TODAY
    )
  );
});

test("96 - Impedir trasladar vacaciones futuras al pasado", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      FUTURE_VACATION,
      PAST_VACATION,
      TODAY
    )
  );
});

test("97 - Impedir inicio retroactivo de vacaciones futuras", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      FUTURE_VACATION,
      CURRENT_VACATION,
      TODAY
    )
  );
});

// ==================================================
// ACTUALIZACIÓN DE VACACIONES EN CURSO
// ==================================================

test("98 - Ampliar vacaciones en curso", () => {
  assert.doesNotThrow(() =>
    assertVacationUpdateAllowed(
      CURRENT_VACATION,
      range("2027-08-10", "2027-08-25"),
      TODAY
    )
  );
});

test("99 - Reducir vacaciones en curso", () => {
  assert.doesNotThrow(() =>
    assertVacationUpdateAllowed(
      CURRENT_VACATION,
      range("2027-08-10", "2027-08-17"),
      TODAY
    )
  );
});

test("100 - Finalizar vacaciones en curso hoy", () => {
  assert.doesNotThrow(() =>
    assertVacationUpdateAllowed(
      CURRENT_VACATION,
      range("2027-08-10", TODAY),
      TODAY
    )
  );
});

test("101 - Modificar motivo sin cambiar fechas", () => {
  assert.doesNotThrow(() =>
    assertVacationUpdateAllowed(
      {
        ...CURRENT_VACATION,
        reason: "Motivo anterior",
      },
      {
        ...CURRENT_VACATION,
        reason: "Motivo actualizado",
      },
      TODAY
    )
  );
});

test("102 - Impedir adelantar inicio de vacaciones en curso", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      CURRENT_VACATION,
      range("2027-08-09", "2027-08-20"),
      TODAY
    )
  );
});

test("103 - Impedir retrasar inicio de vacaciones en curso", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      CURRENT_VACATION,
      range("2027-08-11", "2027-08-20"),
      TODAY
    )
  );
});

test("104 - Impedir finalización retroactiva", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      CURRENT_VACATION,
      range("2027-08-10", "2027-08-14"),
      TODAY
    )
  );
});

// ==================================================
// ACTUALIZACIÓN DE VACACIONES FINALIZADAS
// ==================================================

test("105 - Impedir modificar vacaciones finalizadas", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      PAST_VACATION,
      range("2027-08-01", "2027-08-12"),
      TODAY
    )
  );
});

test("106 - Impedir reactivar vacaciones finalizadas", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      PAST_VACATION,
      FUTURE_VACATION,
      TODAY
    )
  );
});

test("107 - Impedir modificar motivo del histórico", () => {
  expectTemporalRestriction(() =>
    assertVacationUpdateAllowed(
      {
        ...PAST_VACATION,
        reason: "Motivo anterior",
      },
      {
        ...PAST_VACATION,
        reason: "Motivo actualizado",
      },
      TODAY
    )
  );
});

// ==================================================
// ELIMINACIÓN
// ==================================================

test("108 - Permitir eliminar vacaciones futuras", () => {
  assert.doesNotThrow(() =>
    assertVacationDeletionAllowed(
      FUTURE_VACATION,
      TODAY
    )
  );
});

test("109 - Impedir eliminar vacaciones en curso", () => {
  expectTemporalRestriction(() =>
    assertVacationDeletionAllowed(
      CURRENT_VACATION,
      TODAY
    )
  );
});

test("110 - Impedir eliminar vacaciones finalizadas", () => {
  expectTemporalRestriction(() =>
    assertVacationDeletionAllowed(
      PAST_VACATION,
      TODAY
    )
  );
});

test("111 - Impedir eliminar vacaciones que comienzan hoy", () => {
  expectTemporalRestriction(() =>
    assertVacationDeletionAllowed(
      range(TODAY, "2027-08-20"),
      TODAY
    )
  );
});

test("112 - Impedir eliminar vacaciones que terminan hoy", () => {
  expectTemporalRestriction(() =>
    assertVacationDeletionAllowed(
      range("2027-08-10", TODAY),
      TODAY
    )
  );
});
