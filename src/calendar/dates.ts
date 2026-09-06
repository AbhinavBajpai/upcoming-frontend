export function monthDates(month: string) {
  const [year, number] = month.split("-").map(Number);
  return Array.from(
    { length: new Date(Date.UTC(year, number, 0)).getUTCDate() },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
export function nearestDate(dates: string[], day: number) {
  return dates.reduce<string | undefined>(
    (best, date) =>
      !best ||
      Math.abs(Number(date.slice(-2)) - day) <
        Math.abs(Number(best.slice(-2)) - day)
        ? date
        : best,
    undefined,
  );
}
