const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const buildDir = process.env.VACATION_TEST_BUILD_DIR;

if (!buildDir) {
  throw new Error(
    'Falta la variable VACATION_TEST_BUILD_DIR.'
  );
}

const {
  isValidDateISO,
} = require(path.join(
  buildDir,
  'utils/centerScheduleDates.js'
));

const {
  createEmptyVacation,
} = require(path.join(
  buildDir,
  'types/centerVacations.js'
));

const {
  isValidVacationRange,
  normalizeVacationRange,
  getVacationDurationDays,
  getVacationStatus,
  isDateInVacationRange,
  doVacationRangesOverlap,
  getVacationDatesInMonth,
  formatVacationRange,
} = require(path.join(
  buildDir,
  'utils/centerVacationDates.js'
));

const {
  cloneVacationDraft,
  normalizeVacationDraft,
  hasVacationDraftChanges,
  findOverlappingVacations,
  validateVacationDraft,
} = require(path.join(
  buildDir,
  'utils/centerVacationValidation.js'
));

// ==================================================
// DATOS AUXILIARES
// ==================================================

function range(startDateISO, endDateISO) {
  return {
    startDateISO,
    endDateISO,
  };
}

function draft(startDateISO, endDateISO, reason = '') {
  return {
    ...range(startDateISO, endDateISO),
    reason,
  };
}

function vacation(id, startDateISO, endDateISO) {
  return {
    id,
    ...draft(startDateISO, endDateISO),
    createdAt: null,
    createdBy: 'test-user',
    updatedAt: null,
    updatedBy: 'test-user',
  };
}

const existing = [
  vacation('vac-001', '2027-08-10', '2027-08-20'),
  vacation('vac-002', '2027-09-01', '2027-09-05'),
];

// ==================================================
// VALIDACION DE FECHAS
// ==================================================

const dateCases = [
  ['Fecha valida', '2027-08-10', true],
  ['Fecha vacia', '', false],
  ['Fecha inexistente', '2027-02-30', false],
  ['Anio bisiesto', '2028-02-29', true],
  ['Anio no bisiesto', '2027-02-29', false],
  ['Formato incorrecto', '10/08/2027', false],
  ['Mes incorrecto', '2027-13-01', false],
  ['Anio cero', '0000-01-01', false],
];

for (const [name, value, expected] of dateCases) {
  test(name, () => {
    assert.equal(isValidDateISO(value), expected);
  });
}

test('Rango de un solo dia', () => {
  assert.equal(
    isValidVacationRange(
      range('2027-08-10', '2027-08-10')
    ),
    true
  );
});

test('Rango invertido rechazado', () => {
  assert.equal(
    isValidVacationRange(
      range('2027-08-20', '2027-08-10')
    ),
    false
  );
});

test('Rango nulo rechazado', () => {
  assert.equal(isValidVacationRange(null), false);
});

test('Normalizar seleccion inversa', () => {
  assert.deepEqual(
    normalizeVacationRange(
      '2027-08-23',
      '2027-08-10'
    ),
    range('2027-08-10', '2027-08-23')
  );
});

test('Normalizar fecha invalida genera error', () => {
  assert.throws(() => {
    normalizeVacationRange(
      '2027-02-30',
      '2027-08-10'
    );
  });
});

// ==================================================
// DURACION INCLUSIVA
// ==================================================

const durationCases = [
  ['Un dia', '2027-08-10', '2027-08-10', 1],
  ['Once dias', '2027-08-10', '2027-08-20', 11],
  ['Mes completo', '2027-08-01', '2027-08-31', 31],
  ['Entre meses', '2027-07-28', '2027-08-08', 12],
  ['Febrero bisiesto', '2028-02-28', '2028-03-01', 3],
  ['Entre anios', '2027-12-30', '2028-01-02', 4],
  ['Anio bisiesto completo', '2028-01-01', '2028-12-31', 366],
  ['Cambio hora verano', '2027-03-27', '2027-03-29', 3],
  ['Cambio hora invierno', '2027-10-30', '2027-11-01', 3],
];

for (const [name, start, end, expected] of durationCases) {
  test('Duracion: ' + name, () => {
    assert.equal(
      getVacationDurationDays(range(start, end)),
      expected
    );
  });
}

test('Duracion de rango invalido genera error', () => {
  assert.throws(() => {
    getVacationDurationDays(
      range('2027-08-20', '2027-08-10')
    );
  });
});

// ==================================================
// SOLAPAMIENTOS
// ==================================================

const baseRange = range(
  '2027-08-10',
  '2027-08-20'
);

const overlapCases = [
  ['Identicos', '2027-08-10', '2027-08-20', true],
  ['Parcial inicio', '2027-08-05', '2027-08-12', true],
  ['Parcial final', '2027-08-15', '2027-08-25', true],
  ['Contenido', '2027-08-12', '2027-08-15', true],
  ['Contenedor', '2027-08-01', '2027-08-31', true],
  ['Mismo ultimo dia', '2027-08-20', '2027-08-25', true],
  ['Consecutivo anterior', '2027-08-01', '2027-08-09', false],
  ['Consecutivo posterior', '2027-08-21', '2027-08-31', false],
  ['Separados', '2027-09-01', '2027-09-05', false],
];

for (const [name, start, end, expected] of overlapCases) {
  test('Solapamiento: ' + name, () => {
    const other = range(start, end);

    assert.equal(
      doVacationRangesOverlap(baseRange, other),
      expected
    );

    assert.equal(
      doVacationRangesOverlap(other, baseRange),
      expected
    );
  });
}

test('Excluir el propio periodo durante edicion', () => {
  assert.equal(
    findOverlappingVacations(
      baseRange,
      existing,
      'vac-001'
    ).length,
    0
  );
});

test('Detectar conflicto con otro periodo durante edicion', () => {
  const result = findOverlappingVacations(
    range('2027-08-15', '2027-09-03'),
    existing,
    'vac-001'
  );

  assert.deepEqual(
    result.map((item) => item.id),
    ['vac-002']
  );
});

// ==================================================
// CALENDARIO MENSUAL
// ==================================================

test('Vacaciones entre julio y agosto: julio', () => {
  assert.deepEqual(
    getVacationDatesInMonth(
      range('2027-07-28', '2027-08-08'),
      '2027-07-01'
    ),
    [
      '2027-07-28',
      '2027-07-29',
      '2027-07-30',
      '2027-07-31',
    ]
  );
});

test('Vacaciones entre julio y agosto: agosto', () => {
  const dates = getVacationDatesInMonth(
    range('2027-07-28', '2027-08-08'),
    '2027-08-01'
  );

  assert.equal(dates.length, 8);
  assert.equal(dates[0], '2027-08-01');
  assert.equal(dates[7], '2027-08-08');
});

test('Mes sin vacaciones', () => {
  assert.deepEqual(
    getVacationDatesInMonth(
      baseRange,
      '2027-09-01'
    ),
    []
  );
});

test('Febrero bisiesto completo', () => {
  assert.equal(
    getVacationDatesInMonth(
      range('2028-01-01', '2028-12-31'),
      '2028-02-01'
    ).length,
    29
  );
});

test('Febrero no bisiesto completo', () => {
  assert.equal(
    getVacationDatesInMonth(
      range('2027-01-01', '2027-12-31'),
      '2027-02-01'
    ).length,
    28
  );
});

test('Periodo de varios anios limitado al mes visible', () => {
  assert.equal(
    getVacationDatesInMonth(
      range('2027-01-01', '2030-12-31'),
      '2028-08-01'
    ).length,
    31
  );
});

test('Fecha inicial incluida', () => {
  assert.equal(
    isDateInVacationRange('2027-08-10', baseRange),
    true
  );
});

test('Fecha final incluida', () => {
  assert.equal(
    isDateInVacationRange('2027-08-20', baseRange),
    true
  );
});

test('Fecha exterior excluida', () => {
  assert.equal(
    isDateInVacationRange('2027-08-21', baseRange),
    false
  );
});

test('Ultimo dia del rango ISO permitido', () => {
  assert.deepEqual(
    getVacationDatesInMonth(
      range('9999-12-31', '9999-12-31'),
      '9999-12-01'
    ),
    ['9999-12-31']
  );
});

// ==================================================
// ESTADOS TEMPORALES
// ==================================================

const statusCases = [
  ['Futuras', '2027-08-09', 'upcoming'],
  ['Actuales', '2027-08-15', 'current'],
  ['Pasadas', '2027-08-21', 'past'],
  ['Comienzan hoy', '2027-08-10', 'current'],
  ['Terminan hoy', '2027-08-20', 'current'],
];

for (const [name, today, expected] of statusCases) {
  test('Estado: ' + name, () => {
    assert.equal(
      getVacationStatus(baseRange, today),
      expected
    );
  });
}

// ==================================================
// VALIDACION DE FORMULARIOS
// ==================================================

test('Motivo vacio permitido', () => {
  assert.equal(
    validateVacationDraft(
      draft('2027-08-10', '2027-08-20')
    ).isValid,
    true
  );
});

test('Motivo de 200 caracteres permitido', () => {
  assert.equal(
    validateVacationDraft(
      draft('2027-08-10', '2027-08-20', 'a'.repeat(200))
    ).isValid,
    true
  );
});

test('Motivo de 201 caracteres rechazado', () => {
  const result = validateVacationDraft(
    draft('2027-08-10', '2027-08-20', 'a'.repeat(201))
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.reason);
});

test('Fecha inicial incorrecta', () => {
  const result = validateVacationDraft(
    draft('', '2027-08-20')
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.startDateISO);
});

test('Fecha final incorrecta', () => {
  const result = validateVacationDraft(
    draft('2027-08-10', '2027-02-30')
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.endDateISO);
});

test('Fecha final anterior a inicial', () => {
  const result = validateVacationDraft(
    draft('2027-08-20', '2027-08-10')
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.endDateISO);
});

test('Formulario con solapamiento rechazado', () => {
  const result = validateVacationDraft(
    draft('2027-08-15', '2027-08-25'),
    existing
  );

  assert.equal(result.isValid, false);
  assert.ok(result.errors.overlap);

  assert.deepEqual(
    result.conflictingVacationIds,
    ['vac-001']
  );
});

test('Formulario de edicion excluye su propio periodo', () => {
  assert.equal(
    validateVacationDraft(
      draft('2027-08-10', '2027-08-20'),
      existing,
      'vac-001'
    ).isValid,
    true
  );
});

test('Formulario consecutivo permitido', () => {
  assert.equal(
    validateVacationDraft(
      draft('2027-08-21', '2027-08-31'),
      existing
    ).isValid,
    true
  );
});

// ==================================================
// BORRADORES Y CAMBIOS SIN GUARDAR
// ==================================================

test('Crear borrador de un dia', () => {
  assert.deepEqual(
    createEmptyVacation('2027-08-10'),
    draft('2027-08-10', '2027-08-10')
  );
});

test('Clonacion independiente del borrador', () => {
  const original = draft('2027-08-10', '2027-08-20');
  const copy = cloneVacationDraft(original);

  assert.deepEqual(copy, original);
  assert.notEqual(copy, original);

  copy.reason = 'Vacaciones';

  assert.equal(original.reason, '');
});

test('Normalizar motivo', () => {
  const original = draft(
    '2027-08-10',
    '2027-08-20',
    '  Vacaciones de verano  '
  );

  assert.equal(
    normalizeVacationDraft(original).reason,
    'Vacaciones de verano'
  );

  assert.equal(
    original.reason,
    '  Vacaciones de verano  '
  );
});

test('Borrador sin modificaciones', () => {
  const original = draft('2027-08-10', '2027-08-20');

  assert.equal(
    hasVacationDraftChanges(
      original,
      cloneVacationDraft(original)
    ),
    false
  );
});

for (const [field, value] of [
  ['startDateISO', '2027-08-11'],
  ['endDateISO', '2027-08-21'],
  ['reason', 'Vacaciones'],
]) {
  test('Detectar cambio en ' + field, () => {
    const original = draft(
      '2027-08-10',
      '2027-08-20'
    );

    assert.equal(
      hasVacationDraftChanges(
        original,
        {
          ...original,
          [field]: value,
        }
      ),
      true
    );
  });
}

// ==================================================
// FORMATEO
// ==================================================

test('Formatear vacaciones de un dia', () => {
  assert.equal(
    formatVacationRange(
      range('2027-08-10', '2027-08-10')
    ),
    '10 de agosto de 2027'
  );
});

test('Formatear vacaciones de varios dias', () => {
  assert.equal(
    formatVacationRange(baseRange),
    'Del 10 de agosto de 2027 al 20 de agosto de 2027'
  );
});
