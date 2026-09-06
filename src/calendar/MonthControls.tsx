import { ChevronLeft, ChevronRight } from "lucide-react";
import { offsetMonth } from "./api";

export function MonthControls({
  month,
  currentMonth,
  from,
  to,
  disabled = false,
  onChange,
}: {
  month: string;
  currentMonth: string;
  from?: string;
  to?: string;
  disabled?: boolean;
  onChange: (month: string) => void;
}) {
  return (
    <div className="month-controls" aria-label="Choose a month">
      <button
        type="button"
        className="icon-button"
        aria-label="Previous month"
        disabled={disabled || !from || month <= from}
        onClick={() => onChange(offsetMonth(month, -1))}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="month-today"
        disabled={month === currentMonth}
        onClick={() => onChange(currentMonth)}
      >
        This month
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Next month"
        disabled={disabled || !to || month >= to}
        onClick={() => onChange(offsetMonth(month, 1))}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
