import { useState, useRef, useEffect, useCallback } from 'react';

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  formatOption = (v: string) => v.replace(/_/g, ' '),
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  formatOption?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listId = `multiselect-list-${label.replace(/\s+/g, '-').toLowerCase()}`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    setFocusedIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || options.length === 0) return;
    const el = listRef.current?.querySelector(`[data-option-index="${focusedIndex}"]`);
    (el as HTMLElement)?.focus();
  }, [open, focusedIndex, options.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options[focusedIndex] != null) onToggle(options[focusedIndex]);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label id={`${listId}-label`} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${listId}-label`}
        aria-controls={listId}
        className="flex min-h-[44px] min-w-[140px] items-center justify-between gap-2 rounded-button border border-border bg-white px-3 py-2.5 text-sm text-ink shadow-card transition hover:border-ink/20 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        <span className="truncate">
          {selected.length === 0
            ? 'All'
            : selected.length === 1
              ? formatOption(selected[0])
              : `${selected.length} selected`}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={`${listId}-label`}
          className="absolute top-full z-10 mt-1 max-h-60 w-64 overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg"
        >
          {options.map((opt, index) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-option-index={index}
                tabIndex={-1}
                onClick={() => onToggle(opt)}
                onKeyDown={onKeyDown}
                onFocus={() => setFocusedIndex(index)}
                className={`flex min-h-[44px] w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition sm:min-h-0 ${
                  isSelected ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-border'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected ? 'border-accent bg-accent' : 'border-border'
                  }`}
                  aria-hidden
                >
                  {isSelected && (
                    <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                {formatOption(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
