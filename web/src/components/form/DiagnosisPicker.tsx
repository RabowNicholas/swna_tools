'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMMON_CODES, FD_CODES, formatDx, type IcdCode } from '@/lib/icd-codes';

const MAX_PER_GROUP = 50;
const FD_SET = [...COMMON_CODES, ...FD_CODES];
const FD_CODE_SET = new Set(FD_SET.map((c) => c.code));

// The full official list is ~2MB, so it's only fetched once someone searches.
let officialCodes: Promise<IcdCode[]> | null = null;
function loadOfficialCodes(): Promise<IcdCode[]> {
  if (!officialCodes) {
    officialCodes = fetch('/data/icd10cm-2026.tsv')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) =>
        text.split('\n').filter(Boolean).map((line) => {
          const [code, label] = line.split('\t');
          return { code, label };
        })
      )
      .catch((err) => {
        officialCodes = null; // let the next search retry
        throw err;
      });
  }
  return officialCodes;
}

const squash = (s: string) => s.toLowerCase().replace(/[\s.]+/g, '');

function matches(c: IcdCode, q: string): boolean {
  if (squash(c.code).startsWith(q)) return true;
  return squash(`${c.label} ${c.aliases ?? ''}`).includes(q);
}

interface Option {
  item: IcdCode;
  group: string;
}

interface DiagnosisPickerProps {
  /** Selected diagnoses, formatted like "Asthma (J45.909)" */
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

export function DiagnosisPicker({ value, onChange, label, helperText, error, required }: DiagnosisPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [official, setOfficial] = useState<IcdCode[] | null>(null);
  const [officialError, setOfficialError] = useState(false);
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const q = squash(query);

  useEffect(() => {
    if (!q || official) return;
    loadOfficialCodes()
      .then((codes) => { setOfficial(codes); setOfficialError(false); })
      .catch(() => setOfficialError(true));
  }, [q, official]);

  const options: Option[] = useMemo(() => {
    const notChosen = (c: IcdCode) => !value.includes(formatDx(c));
    if (!q) return COMMON_CODES.filter(notChosen).map((item) => ({ item, group: 'Common' }));
    const fd = FD_SET.filter((c) => notChosen(c) && matches(c, q))
      .slice(0, MAX_PER_GROUP)
      .map((item) => ({ item, group: 'From Final Decisions' }));
    const rest = (official ?? [])
      .filter((c) => !FD_CODE_SET.has(c.code) && matches(c, q))
      .slice(0, MAX_PER_GROUP)
      .map((item) => ({ item, group: 'All ICD-10 codes' }));
    return [...fd, ...rest];
  }, [q, value, official]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlighted}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const add = (c: IcdCode) => {
    onChange([...value, formatDx(c)]);
    setQuery('');
    setHighlighted(0);
    inputRef.current?.focus();
  };

  const remove = (dx: string) => onChange(value.filter((v) => v !== dx));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlighted((i) => (i < options.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((i) => (i > 0 ? i - 1 : options.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && options[highlighted]) add(options[highlighted].item);
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
      case 'Backspace':
        if (!query && value.length) remove(value[value.length - 1]);
        break;
    }
  };

  const stillLoading = q && !official && !officialError;

  return (
    <div className="relative">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-2">
          {label}
          {required && <span className="text-muted-foreground ml-0.5" aria-label="required">*</span>}
        </label>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((dx) => (
            <span
              key={dx}
              className="inline-flex items-center gap-1 rounded-md bg-accent text-accent-foreground px-2 py-1 text-sm"
            >
              {dx}
              <button
                type="button"
                onClick={() => remove(dx)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${dx}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full rounded-lg border bg-input pl-10 pr-3 py-2 text-sm',
            'placeholder:text-placeholder text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            error
              ? 'border-destructive focus:border-destructive focus:ring-destructive'
              : 'border-input-border focus:border-ring'
          )}
          placeholder={value.length ? 'Add another diagnosis...' : 'Search by condition or code, e.g. apnea or J44'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <ul
              ref={listRef}
              id={listId}
              className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-lg bg-input border border-border py-1 shadow-lg"
            >
              {options.map(({ item, group }, index) => (
                <li key={item.code}>
                  {(index === 0 || options[index - 1].group !== group) && (
                    <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group}
                    </div>
                  )}
                  <div
                    data-index={index}
                    className={cn(
                      'cursor-pointer select-none px-3 py-2 text-sm flex gap-3',
                      highlighted === index && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => add(item)}
                    onMouseEnter={() => setHighlighted(index)}
                  >
                    <span className="font-mono w-16 flex-shrink-0">{item.code}</span>
                    <span>{item.label}</span>
                  </div>
                </li>
              ))}
              {stillLoading && (
                <li className="px-3 py-2 text-sm text-muted-foreground">Searching all ICD-10 codes...</li>
              )}
              {officialError && q && (
                <li className="px-3 py-2 text-sm text-destructive">Couldn&apos;t load the full ICD-10 list. Only Final Decision codes are shown.</li>
              )}
              {!options.length && !stillLoading && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {q ? `No codes match "${query}"` : 'All common codes are selected. Type to search.'}
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
