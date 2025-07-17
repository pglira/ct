import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LinearProgress from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
  const [tab, setTab] = useState(0);
  // Remove editId, editName, editKcal state and handlers

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

  // Export foodDb as JSON file
  function exportFoodDb() {
    const dataStr = JSON.stringify(foodDb, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foodDb.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import foodDb from JSON file
  function importFoodDb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.every(f => typeof f.id === 'string' && typeof f.name === 'string' && typeof f.kcalPer100g === 'number')) {
          setFoodDb(json);
        } else {
          alert('Invalid file format.');
        }
      } catch {
        alert('Could not parse file.');
      }
    };
    reader.readAsText(file);
    // Reset input value so the same file can be selected again
    e.target.value = '';
  }

  // Sort foodDb alphabetically by name for display
  const sortedFoodDb: Food[] = [...foodDb].sort((a, b) => a.name.localeCompare(b.name));

  // UI
  const totalKcal: number = entries.reduce((sum, e) => sum + e.kcal, 0);
  const overLimit: boolean = totalKcal > dailyLimit;
  const progress = Math.min(100, (totalKcal / dailyLimit) * 100);

  // Custom progress bar
  const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
    height: 18,
    borderRadius: 5,
    backgroundColor: theme.palette.grey[200],
    '& .MuiLinearProgress-bar': {
      borderRadius: 5,
      backgroundColor: overLimit ? theme.palette.error.main : theme.palette.primary.main,
    },
  }));

  return (
    <Container maxWidth="xs">
      <Box mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Tracker" />
          <Tab label="Database" />
          <Tab label="Settings" />
        </Tabs>
      </Box>
      {tab === 0 && (
        <>
          <Box mb={2}>
            <Paper elevation={2}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>Goal</Typography>
                <Box mt={2}>
                  <Box mt={1} mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Consumed: {totalKcal} kcal
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Remaining: {Math.max(0, dailyLimit - totalKcal)} kcal
                      </Typography>
                    </Box>
                    <BorderLinearProgress
                      variant="determinate"
                      value={progress}
                      color={overLimit ? 'error' : 'primary'}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
          <Box mb={2}>
            <Paper elevation={2}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>Entries</Typography>
                <Box display="flex" flexDirection="column" gap={1} mb={2}>
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel id="food-select-label">Select food</InputLabel>
                    <Select
                      labelId="food-select-label"
                      value={entryFoodId}
                      label="Select food"
                      onChange={e => setEntryFoodId(e.target.value)}
                      fullWidth
                      sx={{
                        '& .MuiSelect-select': {
                          height: '40px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center'
                        }
                      }}
                    >
                      <MenuItem value="">Select food</MenuItem>
                      {sortedFoodDb.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box display="flex" gap={1}>
                    <TextField
                      label="grams"
                      type="number"
                      value={entryGrams}
                      onChange={e => setEntryGrams(e.target.value)}
                      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center'
                        },
                        flex: 1
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={addEntryFromDb}
                      size="small"
                      sx={{
                        height: '40px',
                        minWidth: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Add
                    </Button>
                  </Box>
                </Box>
                {entries.length > 0 ? (
                  <List dense sx={{ minHeight: '60px' }}>
                    {entries.map(e => (
                      <ListItem
                        key={e.id}
                        disablePadding
                        secondaryAction={
                          <>
                            <IconButton edge="end" aria-label="edit" onClick={() => {
                              setEntryFoodId(e.foodId ?? '');
                              setEntryGrams(e.grams?.toString() ?? '');
                              removeEntry(e.id);
                            }} size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => removeEntry(e.id)} size="small">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        }
                      >
                        <ListItemText
                          primaryTypographyProps={{ variant: 'body2' }}
                          primary={`${e.name}${e.grams ? ` (${e.grams}g)` : ''}: ${e.kcal} kcal`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" py={1}>
                    No entries yet
                  </Typography>
                )}
                {entries.length > 0 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={resetEntries}
                      size="small"
                      sx={{ height: '40px' }}
                    >
                      Remove all entries
                    </Button>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </>
      )}
      {tab === 1 && (
        <Box mb={2}>
          <Paper elevation={2}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>Food Database</Typography>
              <Box display="flex" flexDirection="column" gap={1} mb={2}>
                <TextField
                  label="Food name"
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': {
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center'
                    },
                    mb: 1
                  }}
                />
                <Box display="flex" gap={1}>
                  <TextField
                    label="kcal/100g"
                    type="number"
                    value={foodKcal}
                    onChange={e => setFoodKcal(e.target.value)}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                    size="small"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center'
                      },
                      flex: 1
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={addFood}
                    size="small"
                    sx={{
                      height: '40px',
                      minWidth: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
              <List dense>
                {sortedFoodDb.map(f => (
                  <ListItem key={f.id} secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="edit" onClick={() => {
                        setFoodName(f.name);
                        setFoodKcal(f.kcalPer100g.toString());
                        removeFood(f.id);
                      }} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => removeFood(f.id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  }>
                    <ListItemText primary={`${f.name} (${f.kcalPer100g} kcal/100g)`} />
                  </ListItem>
                ))}
              </List>
              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="contained"
                  onClick={exportFoodDb}
                  size="small"
                  sx={{
                    height: '40px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Export
                </Button>
                <Button
                  variant="contained"
                  component="label"
                  size="small"
                  sx={{
                    height: '40px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Import
                  <input type="file" accept="application/json" hidden onChange={importFoodDb} />
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
      {tab === 2 && (
        <Box mb={2}>
          <Paper elevation={2}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>Settings</Typography>
              <TextField
                label="Daily Goal (kcal)"
                type="number"
                value={dailyLimit}
                onChange={e => setDailyLimit(Number(e.target.value))}
                inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
                size="small"
                fullWidth
                sx={{ '& .MuiInputBase-root': { height: '40px' }, mt: 1 }}
              />
            </Box>
          </Paper>
        </Box>
      )}
    </Container>
  );
}

export default App;
