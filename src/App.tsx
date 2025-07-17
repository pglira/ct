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
import LinearProgress from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
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
  const progress = Math.min(100, (totalKcal / dailyLimit) * 100);
  
  // Custom progress bar
  const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
    height: 10,
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
        <Paper elevation={2}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>Daily Goal</Typography>
            <TextField
              label="kcal"
              type="number"
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
              size="small"
              fullWidth
              sx={{ '& .MuiInputBase-root': { height: '40px' } }}
            />
          </Box>
        </Paper>
      </Box>
      <Box mb={2}>
        <Paper elevation={2}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>Add Entry</Typography>
            <Box display="flex" gap={1} alignItems="flex-end">
              <FormControl sx={{ minWidth: 0, flex: 2 }} size="small">
                <InputLabel id="food-select-label">Select food</InputLabel>
                <Select
                  labelId="food-select-label"
                  value={entryFoodId}
                  label="Select food"
                  onChange={e => setEntryFoodId(e.target.value)}
                  sx={{ '& .MuiSelect-select': { height: '40px', boxSizing: 'border-box' } }}
                >
                  <MenuItem value="">Select food</MenuItem>
                  {sortedFoodDb.map(f => (
                    <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="grams"
                type="number"
                value={entryGrams}
                onChange={e => setEntryGrams(e.target.value)}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                size="small"
                sx={{ '& .MuiInputBase-root': { height: '40px' }, flex: 1 }}
              />
              <Button 
                variant="contained" 
                onClick={addEntryFromDb} 
                size="small" 
                sx={{ height: '40px', flex: 0, minWidth: '80px' }}
              >
                Add
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
      <Box mb={2}>
        <Paper elevation={2}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>Today’s Entries</Typography>
            {entries.length > 0 ? (
              <List dense sx={{ minHeight: '60px' }}>
                {entries.map(e => (
                  <ListItem 
                    key={e.id}
                    disablePadding
                    secondaryAction={
                      <IconButton edge="end" aria-label="delete" onClick={() => removeEntry(e.id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
            <Box mt={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Daily Total
                </Typography>
                <Typography fontWeight={700} color={overLimit ? 'error.main' : 'text.primary'}>
                  {totalKcal} / {dailyLimit} kcal
                  {overLimit && <span> (Over limit!)</span>}
                </Typography>
              </Box>
              <Box mt={1} mb={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Consumed
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
          </Box>
        </Paper>
      </Box>
      <Box mb={2}>
        <Paper elevation={2}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>Food Database</Typography>
            <Box display="flex" gap={1} alignItems="flex-end">
              <TextField
                label="Food name"
                value={foodName}
                onChange={e => setFoodName(e.target.value)}
                size="small"
                sx={{ 
                  flex: 2,
                  '& .MuiInputBase-root': { 
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center'
                  } 
                }}
              />
              <TextField
                label="kcal/100g"
                type="number"
                value={foodKcal}
                onChange={e => setFoodKcal(e.target.value)}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                size="small"
                sx={{ 
                  flex: 1,
                  '& .MuiInputBase-root': { 
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center'
                  } 
                }}
              />
              <Button 
                variant="contained" 
                onClick={addFood} 
                size="small" 
                sx={{ 
                  height: '40px', 
                  flex: 0, 
                  minWidth: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Add
              </Button>
            </Box>
            <List dense>
              {sortedFoodDb.map(f => (
                <ListItem key={f.id} secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => removeFood(f.id)}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemText primary={`${f.name} (${f.kcalPer100g} kcal/100g)`} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
