import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

export function CompactDateSelector({
  label,
  optional,
  value,
  onChange,
}: CalendarDatePickerProps) {
  const [openPart, setOpenPart] = useState<'day' | 'month' | 'year' | null>(null);
  const selectedIsoDate = parseDisplayDateToIso(value) ?? parseDisplayDateToIso(todayDisplayDate());
  const selectedDate = selectedIsoDate ? dateFromIso(selectedIsoDate) : new Date();
  const day = selectedDate.getDate();
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = buildYearOptions(new Date().getFullYear(), year);

  function setParts(nextDay: number, nextMonth: number, nextYear: number) {
    const safeDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));

    onChange(formatDisplayDate(safeDay, nextMonth, nextYear));
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.selectedText}>{value || 'Sin fecha'}</Text>
      </View>

      <View style={styles.dateSelectRow}>
        <DateDropdownField
          isOpen={openPart === 'day'}
          label="Día"
          onOpen={() => setOpenPart((current) => (current === 'day' ? null : 'day'))}
          onSelect={(nextDay) => {
            setParts(nextDay, month, year);
            setOpenPart(null);
          }}
          options={days.map((item) => ({
            label: String(item).padStart(2, '0'),
            value: item,
          }))}
          selectedLabel={String(day).padStart(2, '0')}
          selectedValue={day}
        />
        <DateDropdownField
          isOpen={openPart === 'month'}
          label="Mes"
          onOpen={() => setOpenPart((current) => (current === 'month' ? null : 'month'))}
          onSelect={(nextMonth) => {
            setParts(day, nextMonth, year);
            setOpenPart(null);
          }}
          options={months.map((item) => ({
            label: formatShortMonth(item),
            value: item,
          }))}
          selectedLabel={formatShortMonth(month)}
          selectedValue={month}
        />
        <DateDropdownField
          isOpen={openPart === 'year'}
          label="Año"
          onOpen={() => setOpenPart((current) => (current === 'year' ? null : 'year'))}
          onSelect={(nextYear) => {
            setParts(day, month, nextYear);
            setOpenPart(null);
          }}
          options={years.map((item) => ({
            label: String(item),
            value: item,
          }))}
          selectedLabel={String(year)}
          selectedValue={year}
        />
      </View>

      {optional && value ? (
        <Pressable onPress={() => onChange('')} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Quitar fecha</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DateDropdownField({
  isOpen,
  label,
  onOpen,
  onSelect,
  options,
  selectedLabel,
  selectedValue,
}: {
  isOpen: boolean;
  label: string;
  onOpen: () => void;
  onSelect: (value: number) => void;
  options: Array<{ label: string; value: number }>;
  selectedLabel: string;
  selectedValue: number;
}) {
  return (
    <View style={styles.dateSelectField}>
      <Pressable
        onPress={onOpen}
        style={[styles.dateSelectTrigger, isOpen && styles.dateSelectTriggerActive]}
      >
        <Text style={styles.dateSelectLabel}>{label}</Text>
        <View style={styles.dateSelectValueRow}>
          <Text style={styles.dateSelectValue}>{selectedLabel}</Text>
          <ChevronDown color={colors.primaryDark} size={18} strokeWidth={2.5} />
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.dateSelectMenu}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.dateSelectScroll}
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <Pressable
                  key={`${label}-${option.value}`}
                  onPress={() => onSelect(option.value)}
                  style={[styles.dateSelectOption, isSelected && styles.dateSelectOptionActive]}
                >
                  <Text
                    style={[
                      styles.dateSelectOptionText,
                      isSelected && styles.dateSelectOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected ? <Check color="#ffffff" size={14} strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
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

function formatShortMonth(value: number) {
  const date = new Date(2026, value - 1, 1);

  return date.toLocaleDateString('es', { month: 'short' }).replace('.', '');
}

function buildYearOptions(currentYear: number, selectedYear: number) {
  const start = Math.min(currentYear - 20, selectedYear);
  const end = Math.max(currentYear + 2, selectedYear);

  return Array.from({ length: end - start + 1 }, (_, index) => end - index);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDisplayDate(day: number, month: number, year: number) {
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
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
  dateSelectRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dateSelectField: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  dateSelectTrigger: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateSelectTriggerActive: {
    borderColor: colors.primary,
  },
  dateSelectLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateSelectValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'space-between',
  },
  dateSelectValue: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  dateSelectMenu: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.xs,
  },
  dateSelectScroll: {
    maxHeight: 178,
  },
  dateSelectOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 38,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  dateSelectOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateSelectOptionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  dateSelectOptionTextActive: {
    color: '#ffffff',
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
