import { useState, useEffect } from 'react';
import './App.css';

// Types
type Food = {
  id: string;
  name: string;
  kcalPer100g: number;
};
type Entry = {
  id: string;
  foodId?: string;
  name: string;
  grams?: number;
  kcal: number;
};

// Helpers
function getTodayKey(): string {
  const now: Date = new Date();
  return `entries_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function load<T>(key: string, fallback: T): T {
  const raw: string | null = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function App() {
  // State
  const [dailyLimit, setDailyLimit] = useState<number>(() => load('dailyLimit', 2000));
  const [foodDb, setFoodDb] = useState<Food[]>(() => load('foodDb', []));
  const [entries, setEntries] = useState<Entry[]>(() => load(getTodayKey(), []));
  const [foodName, setFoodName] = useState<string>('');
  const [foodKcal, setFoodKcal] = useState<string>('');
  const [entryFoodId, setEntryFoodId] = useState<string>('');
  const [entryGrams, setEntryGrams] = useState<string>('');
  // Effects: persist state
  useEffect(() => { save('dailyLimit', dailyLimit); }, [dailyLimit]);
  useEffect(() => { save('foodDb', foodDb); }, [foodDb]);
  useEffect(() => { save(getTodayKey(), entries); }, [entries]);

  // Reset entries at midnight
  useEffect(() => {
    const now: Date = new Date();
    const msToMidnight: number = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timeout = setTimeout(() => setEntries([]), msToMidnight + 1000);
    return () => clearTimeout(timeout);
  }, [entries]);

  // Handlers
  function addFood(): void {
    if (!foodName.trim() || !foodKcal.trim() || isNaN(Number(foodKcal))) return;
    setFoodDb([
      ...foodDb,
      { id: crypto.randomUUID(), name: foodName.trim(), kcalPer100g: Number(foodKcal) },
    ]);
    setFoodName('');
    setFoodKcal('');
  }
  function removeFood(id: string): void {
    setFoodDb(foodDb.filter(f => f.id !== id));
  }
  function addEntryFromDb(): void {
    const food: Food | undefined = foodDb.find(f => f.id === entryFoodId);
    if (!food || !entryGrams.trim() || isNaN(Number(entryGrams))) return;
    const grams: number = Number(entryGrams);
    const kcal: number = Math.round((food.kcalPer100g * grams) / 100);
    setEntries([
      ...entries,
      { id: crypto.randomUUID(), foodId: food.id, name: food.name, grams, kcal },
    ]);
    setEntryFoodId('');
    setEntryGrams('');
  }
  function removeEntry(id: string): void {
    setEntries(entries.filter(e => e.id !== id));
  }
  function resetEntries(): void {
    setEntries([]);
  }

  // Sort foodDb alphabetically by name for display
  const sortedFoodDb: Food[] = [...foodDb].sort((a, b) => a.name.localeCompare(b.name));

  // UI
  const totalKcal: number = entries.reduce((sum, e) => sum + e.kcal, 0);
  const overLimit: boolean = totalKcal > dailyLimit;

  return (
    <div className="container">
      <section>
        <h2>Daily Goal</h2>
        <input type="number" inputMode="numeric" pattern="[0-9]*" value={dailyLimit} min={0} onChange={e => setDailyLimit(Number(e.target.value))} />
      </section>
      <section>
        <h2>Add Entry</h2>
        <div className="entry-form">
          <select value={entryFoodId} onChange={e => setEntryFoodId(e.target.value)}>
            <option value="">Select food</option>
            {sortedFoodDb.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <input placeholder="grams" type="number" inputMode="numeric" pattern="[0-9]*" value={entryGrams} onChange={e => setEntryGrams(e.target.value)} />
          <button onClick={addEntryFromDb}>Add</button>
        </div>
      </section>
      <section>
        <h2>Today’s Entries</h2>
        <ul>
          {entries.map(e => (
            <li key={e.id}>
              {e.name} {e.grams ? `(${e.grams}g)` : ''}: {e.kcal} kcal
              <button onClick={() => removeEntry(e.id)}>Remove</button>
            </li>
          ))}
        </ul>
        {entries.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0 0.5rem 0' }}>
            <button onClick={resetEntries}>
              Remove all
            </button>
          </div>
        )}
        <div className={overLimit ? 'over' : ''}>
          <strong>Total: {totalKcal} / {dailyLimit} kcal</strong>
          {overLimit && <span> (Over limit!)</span>}
          <div style={{ fontSize: '0.92em', color: '#000', marginTop: '0.1em' }}>
            (Remaining: {Math.max(0, dailyLimit - totalKcal)} kcal)
          </div>
          <div style={{ marginTop: '0.3em', width: '100%', height: '14px', background: '#e0e0e0', borderRadius: '7px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px #0001' }}>
            <div style={{
              width: `${Math.min(100, (totalKcal / dailyLimit) * 100)}%`,
              height: '100%',
              background: overLimit ? 'var(--danger)' : 'var(--primary)',
              transition: 'width 0.3s',
              borderRadius: '7px 0 0 7px',
            }} />
          </div>
        </div>
      </section>
      <section>
        <h2>Food Database</h2>
        <div className="food-form">
          <input placeholder="Food name" value={foodName} onChange={e => setFoodName(e.target.value)} />
          <input placeholder="kcal/100g" type="number" inputMode="numeric" pattern="[0-9]*" value={foodKcal} onChange={e => setFoodKcal(e.target.value)} />
          <button onClick={addFood}>Add</button>
        </div>
        <ul>
          {sortedFoodDb.map(f => (
            <li key={f.id}>
              {f.name} ({f.kcalPer100g} kcal/100g)
              <button onClick={() => removeFood(f.id)}>Remove</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
