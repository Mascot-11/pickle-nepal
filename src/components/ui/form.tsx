"use client";

import { useId } from "react";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
  autoComplete,
  error,
  hint,
  inputMode,
  min,
  max,
  step,
  accept,
  disabled,
  children,
  value,
  onChangeCustom,
  maxLength,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  hint?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "url";
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  value?: string | number;
  onChangeCustom?: (value: string) => void;
  maxLength?: number;
  minLength?: number;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-0.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {children ?? (
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChangeCustom ? (e) => onChangeCustom(e.target.value) : undefined}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          accept={accept}
          maxLength={maxLength}
          minLength={minLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`mt-1.5 w-full rounded-xl border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-brand-500 ${
            error ? "border-red-400" : "border-line"
          }`}
        />
      )}
      <FieldError id={error ? `${id}-error` : undefined} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  rows = 4,
  maxLength,
  minLength,
  error,
  hint,
  value,
  onChangeCustom,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  error?: string;
  hint?: string;
  value?: string;
  onChangeCustom?: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
      <textarea
        id={id}
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChangeCustom ? (e) => onChangeCustom(e.target.value) : undefined}
        placeholder={placeholder}
        required={required}
        rows={rows}
        maxLength={maxLength}
        minLength={minLength}
        aria-invalid={error ? true : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-brand-500 ${
          error ? "border-red-400" : "border-line"
        }`}
      />
      <FieldError message={error} />
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
  error,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-surface-raised px-3.5 py-2.5 text-sm text-ink focus:border-brand-500 ${
          error ? "border-red-400" : "border-line"
        }`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export function CheckboxGroup({
  legend,
  name,
  options,
  defaultValues = [],
  columns = 2,
}: {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string; description?: string }>;
  defaultValues?: string[];
  columns?: number;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div
        className={`mt-2 grid gap-2 ${columns === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        role="group"
        aria-labelledby={id}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface-raised p-3 text-sm has-checked:border-brand-500 has-checked:bg-brand-50"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValues.includes(option.value)}
              className="mt-0.5 h-4 w-4 accent-brand-700"
            />
            <span>
              <span className="block font-medium text-ink">{option.label}</span>
              {option.description ? (
                <span className="block text-xs text-ink-soft">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  required,
  onChangeCustom,
}: {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string; description?: string }>;
  defaultValue?: string;
  required?: boolean;
  onChangeCustom?: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface-raised p-3 text-sm has-checked:border-brand-500 has-checked:bg-brand-50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              onChange={onChangeCustom ? () => onChangeCustom(option.value) : undefined}
              required={required}
              className="mt-0.5 h-4 w-4 accent-brand-700"
            />
            <span>
              <span className="block font-medium text-ink">{option.label}</span>
              {option.description ? (
                <span className="block text-xs text-ink-soft">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}