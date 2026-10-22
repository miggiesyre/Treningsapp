// Tests, zones, goals, injuries and the packing list – shared by Miguel's pages and Ruben's "Miguel" tab.
import type { createClient } from '@/lib/supabase/client';

type DB = ReturnType<typeof createClient>;

const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error;
  return r;
};
const num = (v: unknown) => (v == null ? null : Number(v));

// ---------- Tests ----------
export type Test = { id: string; type: 'ftp' | 'vo2max'; value: number; date: string; source: string };
export async function loadTests(db: DB, athleteId: string): Promise<Test[]> {
  const { data } = await db.from('tests').select('id, type, value, date, source').eq('athlete_id', athleteId).order('date');
  return ((data ?? []) as Test[]).map((t) => ({ ...t, value: Number(t.value) }));
}
export async function addTest(db: DB, athleteId: string, type: Test['type'], value: number, date: string) {
  check(await db.from('tests').insert({ athlete_id: athleteId, type, value, date, source: 'coach' }));
  // FTP from a test also becomes the current FTP in Soner.
  if (type === 'ftp') check(await db.from('zones').upsert({ athlete_id: athleteId, ftp: value, updated_at: new Date().toISOString() }));
}
export async function deleteTest(db: DB, id: string) {
  check(await db.from('tests').delete().eq('id', id));
}

// ---------- Zones ----------
export type Zones = { max_hr: number | null; resting_hr: number | null; ftp: number | null; threshold_pace_s: number | null; vo2max: number | null; updated_at: string | null };
export type ZoneKey = Exclude<keyof Zones, 'updated_at'>;
export async function loadZones(db: DB, athleteId: string): Promise<Zones> {
  const { data } = await db.from('zones').select('max_hr, resting_hr, ftp, threshold_pace_s, vo2max, updated_at').eq('athlete_id', athleteId).maybeSingle();
  return {
    max_hr: num(data?.max_hr),
    resting_hr: num(data?.resting_hr),
    ftp: num(data?.ftp),
    threshold_pace_s: num(data?.threshold_pace_s),
    vo2max: num(data?.vo2max),
    updated_at: data?.updated_at ?? null,
  };
}
export async function saveZone(db: DB, athleteId: string, key: ZoneKey, value: number) {
  check(await db.from('zones').upsert({ athlete_id: athleteId, [key]: value, updated_at: new Date().toISOString() }));
}

// ---------- Goals (km per week) ----------
export type Goals = Partial<Record<'bike' | 'run' | 'swim', number>>;
export async function loadGoals(db: DB, athleteId: string): Promise<Goals> {
  const { data } = await db.from('goals').select('sport, km_per_week').eq('athlete_id', athleteId);
  return Object.fromEntries((data ?? []).map((g) => [g.sport, Number(g.km_per_week)]));
}
export async function saveGoal(db: DB, athleteId: string, sport: 'bike' | 'run' | 'swim', km: number) {
  check(await db.from('goals').upsert({ athlete_id: athleteId, sport, km_per_week: km }));
}

// ---------- Injuries ----------
export const INJ_PARTS = ['Skulder', 'Kne', 'Legg', 'Hofte', 'Rygg', 'Fot', 'Annet'] as const;
export const INJ_STATUS = ['Vondt', 'Under behandling', 'Bedre', 'Bra'] as const;
export const INJ_COLOR: Record<string, string> = { Vondt: 'var(--bad)', 'Under behandling': 'var(--warn)', Bedre: 'var(--swim)', Bra: 'var(--ok)' };
export type Injury = { id: string; date: string; body_part: string; status: (typeof INJ_STATUS)[number]; comment: string | null };
export async function loadInjuries(db: DB, athleteId: string): Promise<Injury[]> {
  const { data } = await db.from('injuries').select('id, date, body_part, status, comment').eq('athlete_id', athleteId).order('date', { ascending: false });
  return (data ?? []) as Injury[];
}
export async function saveInjury(db: DB, athleteId: string, x: Omit<Injury, 'id' | 'date'> & { id?: string }) {
  const row = { athlete_id: athleteId, body_part: x.body_part, status: x.status, comment: x.comment };
  if (x.id) check(await db.from('injuries').update(row).eq('id', x.id));
  else check(await db.from('injuries').insert(row));
}
export async function deleteInjury(db: DB, id: string) {
  check(await db.from('injuries').delete().eq('id', id));
}

// ---------- Packing list ----------
export const PACK_CATS = ['Svøm', 'Sykkel', 'Løp', 'Transisjon', 'Ernæring', 'Reise'] as const;
export const PACK_ST = [
  { v: 'Har', short: 'Har', bg: 'var(--ok)' },
  { v: 'Må kjøpe', short: 'Kjøp', bg: 'var(--bike)' },
  { v: 'Pakket', short: 'Pakket', bg: 'var(--swim)' },
] as const;
export type Gear = { id: string; group_name: string; name: string; status: 'Har' | 'Må kjøpe' | 'Pakket'; price: number | null; link: string | null; position: number };
export async function loadGear(db: DB, athleteId: string): Promise<Gear[]> {
  const { data } = await db.from('gear_items').select('id, group_name, name, status, price, link, position').eq('athlete_id', athleteId).order('position');
  return ((data ?? []) as Gear[]).map((g) => ({ ...g, price: num(g.price) }));
}
export async function saveGear(db: DB, athleteId: string, g: Omit<Gear, 'id' | 'position'> & { id?: string; position?: number }) {
  const row = { athlete_id: athleteId, group_name: g.group_name, name: g.name.slice(0, 120), status: g.status, price: g.price || null, link: g.link || null };
  if (g.id) check(await db.from('gear_items').update(row).eq('id', g.id));
  else check(await db.from('gear_items').insert({ ...row, position: g.position ?? Date.now() % 1e9 }));
}
export async function setGearStatus(db: DB, id: string, status: Gear['status']) {
  check(await db.from('gear_items').update({ status }).eq('id', id));
}
export async function deleteGear(db: DB, id: string) {
  check(await db.from('gear_items').delete().eq('id', id));
}
// Default list from the prototype, for an empty packing list.
const PACK0: [string, string, Gear['status'], number?][] = [
  ['Svøm', 'Våtdrakt', 'Har'], ['Svøm', 'Svømmebriller, klare', 'Har'], ['Svøm', 'Svømmebriller, tonede', 'Må kjøpe', 349], ['Svøm', 'Tri-drakt', 'Har'], ['Svøm', 'Anti-gnagkrem', 'Må kjøpe', 189],
  ['Sykkel', 'Sykkel – service før reise', 'Må kjøpe', 1200], ['Sykkel', 'Hjelm', 'Har'], ['Sykkel', 'Sykkelsko', 'Har'], ['Sykkel', 'Drikkeflasker ×2', 'Har'], ['Sykkel', 'Reserveslange ×2', 'Har'],
  ['Sykkel', 'CO2-patroner + adapter', 'Må kjøpe', 249], ['Sykkel', 'Dekkspaker og multiverktøy', 'Har'], ['Sykkel', 'Garmin + pulsbelte', 'Har'],
  ['Løp', 'Løpesko', 'Har'], ['Løp', 'Strikkelisser', 'Må kjøpe', 99], ['Løp', 'Caps', 'Har'], ['Løp', 'Startnummerbelte', 'Må kjøpe', 149], ['Løp', 'Solbriller', 'Har'],
  ['Transisjon', 'Transisjonsposer', 'Har'], ['Transisjon', 'Lite håndkle', 'Har'], ['Transisjon', 'Solkrem', 'Må kjøpe', 159], ['Transisjon', 'Vaselin', 'Har'],
  ['Ernæring', 'Gel ×8', 'Må kjøpe', 320], ['Ernæring', 'Energibarer ×4', 'Må kjøpe', 140], ['Ernæring', 'Sportsdrikkpulver', 'Har'], ['Ernæring', 'Salttabletter', 'Må kjøpe', 180],
  ['Reise', 'Pass', 'Har'], ['Reise', 'Reiseforsikring', 'Har'], ['Reise', 'Sykkelkoffert', 'Må kjøpe', 900], ['Reise', 'Påmeldingsbekreftelse', 'Har'], ['Reise', 'Ladere klokke og mobil', 'Har'], ['Reise', 'Lisens / ID', 'Har'],
];
export async function seedGear(db: DB, athleteId: string) {
  check(
    await db.from('gear_items').insert(PACK0.map(([group_name, name, status, price], i) => ({ athlete_id: athleteId, group_name, name, status, price: price ?? null, position: i }))),
  );
}
export const kr = (n: number) => `kr ${Math.round(n).toLocaleString('nb-NO')}`;
