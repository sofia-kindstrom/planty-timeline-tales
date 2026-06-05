import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://ottalpgpczmblgteqcyn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dGFscGdwY3ptYmxndGVxY3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Nzg4MjcsImV4cCI6MjA5NjI1NDgyN30.v3GrTi4RDqNl0uM-spd0ESMDfeQ-f6P0GJSe6aXKQ3Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(';').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ';' && !inQuotes) {
        values.push(current); current = '';
      } else {
        current += ch;
      }
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i]?.trim() || null; });
    return obj;
  });
}

async function migrateImage(oldUrl) {
  if (!oldUrl) return null;
  try {
    const res = await fetch(oldUrl);
    if (!res.ok) { console.log(`    ⚠️  Could not fetch image, keeping old URL`); return oldUrl; }
    const buffer = await res.arrayBuffer();
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const path = `public/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('plant-images').upload(path, buffer, { contentType: ct, cacheControl: '3600' });
    if (error) { console.log(`    ⚠️  Upload failed: ${error.message}, keeping old URL`); return oldUrl; }
    const { data } = supabase.storage.from('plant-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.log(`    ⚠️  Error: ${e.message}, keeping old URL`);
    return oldUrl;
  }
}

async function main() {
  const plants = parseCSV(readFileSync('plants-export-2026-06-05_22-37-11.csv', 'utf-8'));
  const events = parseCSV(readFileSync('plant_events-export-2026-06-05_22-37-01.csv', 'utf-8'));

  console.log(`\n🌿 Starting migration: ${plants.length} plants, ${events.length} events\n`);

  // --- PLANTS ---
  // Insert parents-first to respect the self-referencing foreign key
  const withParent = plants.filter(p => p.parent_id);
  const withoutParent = plants.filter(p => !p.parent_id);

  for (const plant of [...withoutParent, ...withParent]) {
    process.stdout.write(`  🪴  ${plant.name} — migrating image... `);
    const newImageUrl = await migrateImage(plant.image_url);

    let tags = [];
    try { tags = plant.tags ? JSON.parse(plant.tags.replace(/""/g, '"')) : []; } catch { tags = []; }

    const { error } = await supabase.from('plants').insert({
      id: plant.id,
      name: plant.name,
      species: plant.species || null,
      room: plant.room || null,
      watering_interval_days: plant.watering_interval_days ? parseInt(plant.watering_interval_days) : null,
      light_needs: plant.light_needs || null,
      acquired_at: plant.acquired_at || null,
      notes: plant.notes || null,
      image_url: newImageUrl,
      parent_id: plant.parent_id || null,
      tags,
      water_snooze_until: plant.water_snooze_until || null,
    });

    if (error) console.log(`❌ ${error.message}`);
    else console.log('✓');
  }

  // --- EVENTS ---
  console.log(`\n  Migrating ${events.length} events...\n`);
  let ok = 0, fail = 0;
  for (const ev of events) {
    const newImageUrl = ev.image_url ? await migrateImage(ev.image_url) : null;
    const { error } = await supabase.from('plant_events').insert({
      id: ev.id,
      plant_id: ev.plant_id,
      event_at: ev.event_at,
      label: ev.label,
      note: ev.note || null,
      image_url: newImageUrl,
    });
    if (error) { console.log(`  ❌ Event "${ev.label}": ${error.message}`); fail++; }
    else { process.stdout.write('.'); ok++; }
  }

  console.log(`\n\n✅ Done! ${ok} events inserted${fail ? `, ${fail} failed` : ''}.\n`);
}

main().catch(console.error);
