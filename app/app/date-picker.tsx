import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateOnly, parseDisplayDateToIso, todayDisplayDate } from './lib/dates';
import { colors, spacing } from './theme';

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type CalendarDatePickerProps = {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function CalendarDatePicker({
  label,
  optional,
  value,
  onChange,
}: CalendarDatePickerProps) {
  const selectedIsoDate = parseDisplayDateToIso(value) ?? parseDisplayDateToIso(todayDisplayDate());
  const selectedDate = selectedIsoDate ? dateFromIso(selectedIsoDate) : new Date();
  const [month, setMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const days = buildCalendarDays(month);

  useEffect(() => {
    setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  function moveMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.selectedText}>{value || 'Sin fecha'}</Text>
      </View>

      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => moveMonth(-1)} style={styles.monthButton}>
            <ChevronLeft color={colors.text} size={21} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthTitle(month)}</Text>
          <Pressable onPress={() => moveMonth(1)} style={styles.monthButton}>
            <ChevronRight color={colors.text} size={21} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.dayGrid}>
          {days.map((day) => {
            const isoDate = day.date ? toIsoDate(day.date) : '';
            const isSelected = isoDate === selectedIsoDate;

            return (
              <Pressable
                key={day.key}
                disabled={!day.date}
                onPress={() => onChange(formatDateOnly(isoDate))}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellActive,
                  !day.date && styles.dayCellDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextActive,
                    !day.date && styles.dayTextDisabled,
                  ]}
                >
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {optional && value ? (
        <Pressable onPress={() => onChange('')} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Quitar fecha</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const days: Array<{ key: string; label: string; date?: Date }> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push({ key: `empty-start-${index}`, label: '' });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    days.push({ key: toIsoDate(date), label: String(day), date });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `empty-end-${days.length}`, label: '' });
  }

  return days;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatMonthTitle(value: Date) {
  return value.toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  selectedText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  calendar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  weekGrid: {
    flexDirection: 'row',
  },
  weekDay: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    flexBasis: '14.2857%',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellActive: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  dayTextDisabled: {
    color: colors.muted,
  },
  clearButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
});
