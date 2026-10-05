// lib/growth-decision/validate.ts
// Tiny dependency-free runtime validator (typed combinators).
//
// Why not zod: adding a dependency changes package.json + package-lock.json,
// and the lockfile cannot be safely regenerated from the sandbox. The schema
// is isolated in schema.ts, so swapping to zod later is a mechanical change.
//
// Each validator is { parse(v, path) => Result<T> } with inferred TS types.

export type Issue = { path: string; message: string };
export type Result<T> = { ok: true; value: T } | { ok: false; issues: Issue[] };

export interface V<T> {
  parse(v: unknown, path?: string): Result<T>;
}
export type Infer<S> = S extends V<infer T> ? T : never;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(path: string, message: string): Result<T> => ({
  ok: false,
  issues: [{ path: path || "$", message }],
});

export const str = (opts: { min?: number; max?: number } = {}): V<string> => ({
  parse(v, path = "") {
    if (typeof v !== "string") return fail(path, "expected string");
    const t = v.trim();
    if (opts.min !== undefined && t.length < opts.min)
      return fail(path, `string shorter than ${opts.min}`);
    if (opts.max !== undefined && t.length > opts.max)
      return fail(path, `string longer than ${opts.max}`);
    return ok(t);
  },
});

export const num = (): V<number> => ({
  parse(v, path = "") {
    return typeof v === "number" && Number.isFinite(v) ? ok(v) : fail(path, "expected finite number");
  },
});

export const bool = (): V<boolean> => ({
  parse(v, path = "") {
    return typeof v === "boolean" ? ok(v) : fail(path, "expected boolean");
  },
});

export const oneOf = <const T extends readonly string[]>(values: T): V<T[number]> => ({
  parse(v, path = "") {
    return typeof v === "string" && (values as readonly string[]).includes(v)
      ? ok(v as T[number])
      : fail(path, `expected one of: ${values.join(", ")}`);
  },
});

export const nullable = <T>(inner: V<T>): V<T | null> => ({
  parse(v, path = "") {
    return v === null || v === undefined ? ok(null) : inner.parse(v, path);
  },
});

export const arr = <T>(
  inner: V<T>,
  opts: { min?: number; max?: number } = {},
): V<T[]> => ({
  parse(v, path = "") {
    if (!Array.isArray(v)) return fail(path, "expected array");
    if (opts.min !== undefined && v.length < opts.min)
      return fail(path, `expected at least ${opts.min} item(s)`);
    if (opts.max !== undefined && v.length > opts.max)
      return fail(path, `expected at most ${opts.max} item(s)`);
    const out: T[] = [];
    const issues: Issue[] = [];
    v.forEach((item, i) => {
      const r = inner.parse(item, `${path}[${i}]`);
      if (r.ok) out.push(r.value);
      else issues.push(...r.issues);
    });
    return issues.length ? { ok: false, issues } : ok(out);
  },
});

type Shape = Record<string, V<unknown>>;
type ObjOut<S extends Shape> = { [K in keyof S]: Infer<S[K]> };

export const obj = <S extends Shape>(shape: S): V<ObjOut<S>> => ({
  parse(v, path = "") {
    if (typeof v !== "object" || v === null || Array.isArray(v))
      return fail(path, "expected object");
    const out: Record<string, unknown> = {};
    const issues: Issue[] = [];
    for (const key of Object.keys(shape)) {
      const r = shape[key].parse((v as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
      if (r.ok) out[key] = r.value;
      else issues.push(...r.issues);
    }
    return issues.length ? { ok: false, issues } : ok(out as ObjOut<S>);
  },
});

/** Field that may be missing; defaults supplied by caller. */
export const optional = <T>(inner: V<T>, fallback: T): V<T> => ({
  parse(v, path = "") {
    return v === undefined || v === null ? ok(fallback) : inner.parse(v, path);
  },
});
