export interface Food {
  id: string;
  name: string;
  kcalPer100g: number;
}

// One food that the user ate. An entry from the food list has the id of the
// food and the grams; an entry with a custom value has the kcal only.
export interface Entry {
  id: string;
  foodId?: string;
  name: string;
  grams?: number;
  kcal: number;
}

export const DEFAULT_LIMIT = 2200;

const LIMIT_KEY = 'dailyLimit';
const FOODS_KEY = 'foodDb';

// The entries of each day have their own key, so a new day starts empty.
export function dayKey(date = new Date()): string {
  return `entries_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked; the data stays in memory only.
  }
}

export const loadLimit = () => load(LIMIT_KEY, DEFAULT_LIMIT);
export const saveLimit = (limit: number) => save(LIMIT_KEY, limit);
export const loadFoods = () => load<Food[]>(FOODS_KEY, []);
export const saveFoods = (foods: Food[]) => save(FOODS_KEY, foods);
export const loadEntries = (key: string) => load<Entry[]>(key, []);
export const saveEntries = (key: string, entries: Entry[]) => save(key, entries);

export const kcalOf = (food: Food, grams: number) => Math.round((food.kcalPer100g * grams) / 100);

export const byName = (a: Food, b: Food) => a.name.localeCompare(b.name);

export function isFoodList(value: unknown): value is Food[] {
  return (
    Array.isArray(value) &&
    value.every(
      (f) =>
        typeof f?.id === 'string' &&
        typeof f.name === 'string' &&
        typeof f.kcalPer100g === 'number',
    )
  );
}

export function exportFoods(foods: Food[]): void {
  const blob = new Blob([JSON.stringify(foods, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'foodDb.json';
  a.click();
  URL.revokeObjectURL(url);
}
