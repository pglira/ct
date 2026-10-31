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

// The entries of all stored days except the day with the key exclude, oldest
// day first.
export function loadPastEntries(exclude: string): Entry[] {
  const days: [number, Entry[]][] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^entries_(\d+)-(\d+)-(\d+)$/);
      if (!key || !match || key === exclude) continue;
      const time = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
      days.push([time, loadEntries(key)]);
    }
  } catch {
    // Storage is blocked; there are no past entries.
  }
  return days.sort((a, b) => a[0] - b[0]).flatMap(([, entries]) => entries);
}

// How often the user ate a food and the grams of the last entry.
export interface Usage {
  count: number;
  grams: number;
}

export function usageOf(entries: Entry[]): Map<string, Usage> {
  const usage = new Map<string, Usage>();
  for (const e of entries) {
    if (!e.foodId || !e.grams) continue;
    usage.set(e.foodId, { count: (usage.get(e.foodId)?.count ?? 0) + 1, grams: e.grams });
  }
  return usage;
}

// The last different entries, newest first. A food entry gets the current
// name and kcal of its food; an entry of a deleted food is left out.
export function recentEntries(entries: Entry[], foods: Food[], max: number): Omit<Entry, 'id'>[] {
  const result = new Map<string, Omit<Entry, 'id'>>();
  for (let i = entries.length - 1; i >= 0 && result.size < max; i--) {
    const e = entries[i];
    if (e.foodId && e.grams) {
      const food = foods.find((f) => f.id === e.foodId);
      const key = `${e.foodId}/${e.grams}`;
      if (food && !result.has(key)) {
        result.set(key, { foodId: food.id, name: food.name, grams: e.grams, kcal: kcalOf(food, e.grams) });
      }
    } else {
      const key = `custom/${e.name}/${e.kcal}`;
      if (!result.has(key)) result.set(key, { name: e.name, kcal: e.kcal });
    }
  }
  return [...result.values()];
}
