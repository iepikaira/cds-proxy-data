import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Ensure data dir exists
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load country config
const config = JSON.parse(fs.readFileSync('./config/countries.json', 'utf8'));

const YEARS = 3;
const cutoffDate = new Date();
cutoffDate.setFullYear(cutoffDate.getFullYear() - YEARS);
const cutoffStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

console.log(`Fetching data from ${cutoffStr} onward...`);

const allData = {};

// Helper: fetch FRED CSV and parse
async function fetchFredSeries(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  console.log(`Fetching ${seriesId}...`);
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    // Skip header
    const data = {};
    for (let i = 1; i < lines.length; i++) {
      const [date, value] = lines[i].split(',');
      if (value && value !== '.' && date >= cutoffStr) {
        data[date] = parseFloat(value);
      }
    }
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${seriesId}:`, err.message);
    return {};
  }
}

// Fetch all
for (const [group, countries] of Object.entries(config)) {
  allData[group] = {};
  for (const [country, seriesId] of Object.entries(countries)) {
    const seriesData = await fetchFredSeries(seriesId);
    allData[group][country] = seriesData;
    // Be kind to FRED: small delay
    await new Promise(r => setTimeout(r, 500));
  }
}

// Save to JSON
const outputPath = path.join(DATA_DIR, 'cds-proxies.json');
fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
console.log(`Data saved to ${outputPath}`);
