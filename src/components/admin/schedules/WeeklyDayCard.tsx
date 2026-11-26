import React from 'react';

import {
  WEEK_DAY_LABELS,
  type WeekDay,
  type DailySchedule,
} from '../../../types/centerSchedules';

import DailyScheduleEditor from './DailyScheduleEditor';

type WeeklyDayCardProps = {
  day: WeekDay;
  schedule: DailySchedule;
  onChange: (schedule: DailySchedule) => void;
  onCopy?: () => void;
  disabled?: boolean;
  dayError?: string | null;
  periodErrors?: Record<number, string>;
};

export default function WeeklyDayCard({
  day,
  schedule,
  onChange,
  onCopy,
  disabled = false,
  dayError = null,
  periodErrors = {},
}: WeeklyDayCardProps) {
  return (
    <DailyScheduleEditor
      title={WEEK_DAY_LABELS[day]}
      schedule={schedule}
      onChange={onChange}
      onCopy={onCopy}
      disabled={disabled}
      dayError={dayError}
      periodErrors={periodErrors}
    />
  );
}
