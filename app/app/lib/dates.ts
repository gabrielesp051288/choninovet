const DISPLAY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export function formatDateOnly(value: string) {
  const isoDate = value.slice(0, 10);
  const [year, month, day] = isoDate.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}-${month}-${year}`;
}

export function parseDisplayDateToIso(value: string) {
  const trimmed = value.trim();
  const match = DISPLAY_DATE_PATTERN.exec(trimmed);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const candidate = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  if (
    candidate.getUTCFullYear() !== yearNumber ||
    candidate.getUTCMonth() !== monthNumber - 1 ||
    candidate.getUTCDate() !== dayNumber
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function todayDisplayDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  return `${day}-${month}-${year}`;
}
