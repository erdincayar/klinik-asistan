"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartSelectItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface SmartSelectProps {
  items: SmartSelectItem[];
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  displayValue?: string;
  filterLocally?: boolean;

  // Create new
  createLabel?: string;
  createForm?: React.ReactNode;
  showCreateForm?: boolean;
  onCreateFormToggle?: (show: boolean) => void;

  // Freetext mode (işlem türü)
  freetext?: boolean;
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function SmartSelect({
  items,
  value,
  onChange,
  placeholder,
  displayValue,
  filterLocally = true,
  createLabel,
  createForm,
  showCreateForm,
  onCreateFormToggle,
  freetext = false,
  loading = false,
  required = false,
  disabled = false,
}: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // For entity mode: show displayValue when not focused, query when focused
  const [focused, setFocused] = useState(false);

  const inputValue = freetext
    ? value
    : focused
      ? query
      : displayValue || "";

  // Filter items
  const filtered = filterLocally
    ? items.filter((item) => {
        const q = (freetext ? value : query).toLocaleLowerCase("tr-TR");
        if (!q) return true;
        return (
          item.label.toLocaleLowerCase("tr-TR").includes(q) ||
          (item.subtitle && item.subtitle.toLocaleLowerCase("tr-TR").includes(q))
        );
      })
    : items;

  // Build visible list: create row + filtered items
  const hasCreate = !!createLabel;
  const showFreetextCreate =
    freetext &&
    value.trim() &&
    !items.some((i) => i.label.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR"));

  // Total navigable count
  const navigableCount =
    filtered.length + (hasCreate && !freetext ? 1 : 0) + (showFreetextCreate ? 1 : 0);

  // Click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
        setQuery("");
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlightIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (item: SmartSelectItem) => {
      onChange(item.id, item.label);
      setOpen(false);
      setFocused(false);
      setQuery("");
      setHighlightIndex(-1);
    },
    [onChange],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (freetext) {
      onChange(val);
    } else {
      setQuery(val);
      // If user clears the input, clear selection
      if (!val && value) {
        onChange("", "");
      }
    }
    setOpen(true);
    setHighlightIndex(-1);
  }

  function handleFocus() {
    setFocused(true);
    setOpen(true);
    setQuery("");
  }

  function handleBlur() {
    // Delay to allow click events on dropdown
    // Handled by click-outside instead
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setFocused(false);
      setQuery("");
      setHighlightIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < navigableCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : navigableCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex < 0) return;

      let currentIdx = 0;

      // Create row (entity mode)
      if (hasCreate && !freetext) {
        if (highlightIndex === currentIdx) {
          onCreateFormToggle?.(!showCreateForm);
          setOpen(false);
          return;
        }
        currentIdx++;
      }

      // Freetext create row
      if (showFreetextCreate) {
        if (highlightIndex === currentIdx) {
          // Already set via onChange, just close
          setOpen(false);
          return;
        }
        currentIdx++;
      }

      // Items
      const itemIdx = highlightIndex - currentIdx;
      if (itemIdx >= 0 && itemIdx < filtered.length) {
        if (freetext) {
          onChange(filtered[itemIdx].label);
          setOpen(false);
        } else {
          handleSelect(filtered[itemIdx]);
        }
      }
    }
  }

  // Build dropdown index tracker
  let idx = 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required && !value}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-[10px] border-[0.5px] border-[#E7E5E4] bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-[#EF9F27] focus-visible:shadow-[0_0_0_3px_rgba(239,159,39,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
            loading && "pr-9",
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Dropdown */}
      {open && (navigableCount > 0 || (hasCreate && !freetext)) && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {/* Entity create row */}
          {hasCreate && !freetext && (
            <button
              type="button"
              data-idx={idx}
              className={cn(
                "flex w-full items-center gap-2 border-b border-gray-100 bg-blue-50/50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100/50",
                highlightIndex === idx && "bg-blue-100/70",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateFormToggle?.(!showCreateForm);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              <Plus className="h-3.5 w-3.5" />
              {createLabel}
            </button>
          )}
          {hasCreate && !freetext && (idx = 1, null)}

          {/* Freetext create row */}
          {showFreetextCreate && (() => {
            const myIdx = idx;
            idx++;
            return (
              <button
                type="button"
                data-idx={myIdx}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-gray-100 bg-blue-50/50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100/50",
                  highlightIndex === myIdx && "bg-blue-100/70",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIndex(myIdx)}
              >
                <Plus className="h-3.5 w-3.5" />
                &quot;{value.trim()}&quot; ekle
              </button>
            );
          })()}

          {/* Items */}
          {filtered.map((item) => {
            const myIdx = idx;
            idx++;
            return (
              <button
                key={item.id}
                type="button"
                data-idx={myIdx}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50",
                  highlightIndex === myIdx && "bg-blue-50 text-blue-700",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (freetext) {
                    onChange(item.label);
                    setOpen(false);
                  } else {
                    handleSelect(item);
                  }
                }}
                onMouseEnter={() => setHighlightIndex(myIdx)}
              >
                <span>{item.label}</span>
                {item.subtitle && (
                  <span className="ml-2 text-xs text-gray-400">{item.subtitle}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Inline create form */}
      {showCreateForm && createForm && (
        <div className="mt-2 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          {createForm}
        </div>
      )}
    </div>
  );
}
