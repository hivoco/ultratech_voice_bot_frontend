import { Icon } from "./Icon";

interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  lang?: string;
}

/** Option pill used for language and stage choices (h-32, check icon when selected). */
export function Chip({ label, selected, disabled, onClick, lang }: ChipProps) {
  return (
    <button
      type="button"
      lang={lang}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] whitespace-nowrap transition-[background-color,transform] active:scale-95 disabled:cursor-default disabled:active:scale-100 ${
        selected ? "bg-brand font-[590] text-ink" : "bg-white/16 font-[510] text-white enabled:hover:bg-white/24"
      }`}
    >
      {selected && <Icon src="/icons/check.svg" size={14} />}
      {label}
    </button>
  );
}
