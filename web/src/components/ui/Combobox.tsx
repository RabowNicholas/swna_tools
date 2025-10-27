'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComboboxOption {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Custom text to show when no options match the search query */
  noResultsText?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search and select...",
  label,
  error,
  required,
  disabled,
  className,
  noResultsText,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(option => option.id === value);
  
  const filteredOptions = query === ''
    ? options
    : options.filter((option) =>
        option.name
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.toLowerCase().replace(/\s+/g, ''))
      );

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].id);
          setIsOpen(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.id);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className={cn(
              "w-full rounded-lg border bg-white dark:bg-[#292524] pl-10 pr-10 py-2 text-sm",
              "placeholder:text-muted-foreground text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-destructive focus:border-destructive focus:ring-destructive"
                : "border-border focus:border-ring"
            )}
            placeholder={query === '' && selectedOption ? selectedOption.name : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)}
            />
            <ul
              ref={listRef}
              className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-[#292524] border border-border py-1 shadow-lg"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {noResultsText || `No results found${query && ` matching "${query}"`}`}
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.id}
                    className={cn(
                      "relative cursor-pointer select-none px-3 py-2 text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      highlightedIndex === index && "bg-accent text-accent-foreground",
                      value === option.id && "bg-accent/50"
                    )}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{option.name}</span>
                      {value === option.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}