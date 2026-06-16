/** Hyderabad + outskirts service area for emergency flows */

export type HyderabadArea = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  aliases?: string[];
};

/** Generous bounding box — city + ORR outskirts */
export const HYDERABAD_BOUNDS = {
  minLat: 17.18,
  maxLat: 17.62,
  minLng: 78.22,
  maxLng: 78.72,
} as const;

export const HYDERABAD_SERVICE_LABEL = 'Hyderabad & outskirts';

export const HYDERABAD_AREAS: HyderabadArea[] = [
  // Central & Old City
  { id: 'abids', name: 'Abids', zone: 'Central', lat: 17.3925, lng: 78.4742 },
  { id: 'amberpet', name: 'Amberpet', zone: 'Central', lat: 17.3992, lng: 78.5087 },
  { id: 'ameerpet', name: 'Ameerpet', zone: 'Central', lat: 17.4372, lng: 78.4482 },
  { id: 'basheerbagh', name: 'Basheerbagh', zone: 'Central', lat: 17.3985, lng: 78.4698 },
  { id: 'barkas', name: 'Barkas', zone: 'Old City', lat: 17.3312, lng: 78.4815 },
  { id: 'charminar', name: 'Charminar', zone: 'Old City', lat: 17.3616, lng: 78.4747 },
  { id: 'chaderghat', name: 'Chaderghat', zone: 'Central', lat: 17.3774, lng: 78.4861 },
  { id: 'chandrayangutta', name: 'Chandrayangutta', zone: 'South', lat: 17.3448, lng: 78.4912 },
  { id: 'dabeerpura', name: 'Dabeerpura', zone: 'Old City', lat: 17.3712, lng: 78.4895 },
  { id: 'domalguda', name: 'Domalguda', zone: 'Central', lat: 17.4045, lng: 78.4898 },
  { id: 'falaknuma', name: 'Falaknuma', zone: 'Old City', lat: 17.3382, lng: 78.4674 },
  { id: 'ghansi-bazaar', name: 'Ghansi Bazaar', zone: 'Old City', lat: 17.3658, lng: 78.4782 },
  { id: 'himayatnagar', name: 'Himayatnagar', zone: 'Central', lat: 17.4062, lng: 78.4891 },
  { id: 'hussaini-alam', name: 'Hussaini Alam', zone: 'Old City', lat: 17.3685, lng: 78.4768 },
  { id: 'kachiguda', name: 'Kachiguda', zone: 'Central', lat: 17.3884, lng: 78.4892 },
  { id: 'khairatabad', name: 'Khairatabad', zone: 'Central', lat: 17.4125, lng: 78.4658 },
  { id: 'koti', name: 'Koti', zone: 'Central', lat: 17.3852, lng: 78.4865 },
  { id: 'lakdikapul', name: 'Lakdikapul', zone: 'Central', lat: 17.3998, lng: 78.4612 },
  { id: 'malakpet', name: 'Malakpet', zone: 'Central', lat: 17.3742, lng: 78.5075 },
  { id: 'moghalpura', name: 'Moghalpura', zone: 'Old City', lat: 17.3598, lng: 78.4725 },
  { id: 'narayanguda', name: 'Narayanguda', zone: 'Central', lat: 17.3945, lng: 78.4925 },
  { id: 'nampally', name: 'Nampally', zone: 'Central', lat: 17.3921, lng: 78.4692 },
  { id: 'necklace-road', name: 'Necklace Road', zone: 'Central', lat: 17.4185, lng: 78.4652, aliases: ['Tank Bund'] },
  { id: 'old-city', name: 'Old City', zone: 'Old City', lat: 17.3616, lng: 78.4747, aliases: ['Charminar area'] },
  { id: 'rtc-crossroads', name: 'RTC Crossroads', zone: 'Central', lat: 17.4068, lng: 78.4785 },
  { id: 'shah-ali-banda', name: 'Shah Ali Banda', zone: 'Old City', lat: 17.3578, lng: 78.4812 },
  { id: 'sitaphalmandi', name: 'Sitaphalmandi', zone: 'East', lat: 17.4258, lng: 78.5285 },
  { id: 'talab-katta', name: 'Talab Katta', zone: 'Old City', lat: 17.3545, lng: 78.4788 },
  { id: 'yakutpura', name: 'Yakutpura', zone: 'Old City', lat: 17.3525, lng: 78.4845 },

  // Banjara / Jubilee belt
  { id: 'banjara-hills', name: 'Banjara Hills', zone: 'Central', lat: 17.4156, lng: 78.4487 },
  { id: 'banjara-hills-road-12', name: 'Banjara Hills Road 12', zone: 'Central', lat: 17.4182, lng: 78.4425 },
  { id: 'film-nagar', name: 'Film Nagar', zone: 'Central', lat: 17.4198, lng: 78.4312 },
  { id: 'jubilee-hills', name: 'Jubilee Hills', zone: 'Central', lat: 17.4234, lng: 78.4731 },
  { id: 'jubilee-hills-checkpost', name: 'Jubilee Hills Checkpost', zone: 'Central', lat: 17.4285, lng: 78.4412 },
  { id: 'panjagutta', name: 'Panjagutta', zone: 'Central', lat: 17.4284, lng: 78.4572 },
  { id: 'punjagutta', name: 'Punjagutta', zone: 'Central', lat: 17.4242, lng: 78.4551 },
  { id: 'somajiguda', name: 'Somajiguda', zone: 'Central', lat: 17.4231, lng: 78.4662 },
  { id: 'yousufguda', name: 'Yousufguda', zone: 'West', lat: 17.4332, lng: 78.4345 },

  // West — IT corridor
  { id: 'botanical-garden-road', name: 'Botanical Garden Road', zone: 'West', lat: 17.4568, lng: 78.3712 },
  { id: 'durgam-cheruvu', name: 'Durgam Cheruvu', zone: 'West', lat: 17.4305, lng: 78.3845 },
  { id: 'financial-district', name: 'Financial District', zone: 'West', lat: 17.4192, lng: 78.3425 },
  { id: 'gachibowli', name: 'Gachibowli', zone: 'West', lat: 17.4401, lng: 78.3489 },
  { id: 'hitech-city', name: 'Hitech City', zone: 'West', lat: 17.4435, lng: 78.3772, aliases: ['HiTech City', 'HITEC City', 'Cyberabad'] },
  { id: 'hitech-city-madhapur-road', name: 'Hitech City Madhapur Road', zone: 'West', lat: 17.4458, lng: 78.3845 },
  { id: 'inorbit-mall', name: 'Inorbit Mall', zone: 'West', lat: 17.4348, lng: 78.3865, aliases: ['Madhapur Inorbit'] },
  { id: 'kavuri-hills', name: 'Kavuri Hills', zone: 'West', lat: 17.4512, lng: 78.3885 },
  { id: 'kondapur', name: 'Kondapur', zone: 'West', lat: 17.4602, lng: 78.3635 },
  { id: 'madhapur', name: 'Madhapur', zone: 'West', lat: 17.4485, lng: 78.3908 },
  { id: 'mindspace', name: 'Mindspace', zone: 'West', lat: 17.4505, lng: 78.3812 },
  { id: 'nanakramguda', name: 'Nanakramguda', zone: 'West', lat: 17.4042, lng: 78.3485 },
  { id: 'raidurg', name: 'Raidurg', zone: 'West', lat: 17.4325, lng: 78.3785 },
  { id: 'wave-rock', name: 'Wave Rock', zone: 'West', lat: 17.4318, lng: 78.3825 },
  { id: 'whitefields', name: 'Whitefields', zone: 'West', lat: 17.4625, lng: 78.3558 },

  // West — residential
  { id: 'attapur', name: 'Attapur', zone: 'West', lat: 17.3685, lng: 78.4312 },
  { id: 'budvel', name: 'Budvel', zone: 'South', lat: 17.3192, lng: 78.4415 },
  { id: 'chandanagar', name: 'Chandanagar', zone: 'West', lat: 17.4945, lng: 78.3285 },
  { id: 'erragadda', name: 'Erragadda', zone: 'West', lat: 17.4552, lng: 78.4245 },
  { id: 'gandipet', name: 'Gandipet', zone: 'West', lat: 17.3852, lng: 78.3185 },
  { id: 'hafeezpet', name: 'Hafeezpet', zone: 'West', lat: 17.4845, lng: 78.3685 },
  { id: 'jntu', name: 'JNTU', zone: 'North-West', lat: 17.4985, lng: 78.3912, aliases: ['JNTU Kukatpally'] },
  { id: 'kokapet', name: 'Kokapet', zone: 'West', lat: 17.3925, lng: 78.3385 },
  { id: 'kphb', name: 'KPHB', zone: 'North-West', lat: 17.4935, lng: 78.4012, aliases: ['KPHB Colony', 'Kukatpally Housing Board'] },
  { id: 'kphb-phase-3', name: 'KPHB Phase 3', zone: 'North-West', lat: 17.4885, lng: 78.3958 },
  { id: 'langar-houz', name: 'Langar Houz', zone: 'West', lat: 17.3745, lng: 78.4062 },
  { id: 'lingampally', name: 'Lingampally', zone: 'West', lat: 17.4912, lng: 78.3185 },
  { id: 'manikonda', name: 'Manikonda', zone: 'West', lat: 17.4045, lng: 78.3862 },
  { id: 'mehdipatnam', name: 'Mehdipatnam', zone: 'West', lat: 17.3852, lng: 78.4425 },
  { id: 'nallagandla', name: 'Nallagandla', zone: 'West', lat: 17.4785, lng: 78.3125 },
  { id: 'narsingi', name: 'Narsingi', zone: 'West', lat: 17.3885, lng: 78.3585 },
  { id: 'puppalaguda', name: 'Puppalaguda', zone: 'West', lat: 17.3985, lng: 78.3525 },
  { id: 'serilingampally', name: 'Serilingampally', zone: 'West', lat: 17.4845, lng: 78.3058, aliases: ['Serilingampalle'] },
  { id: 'shaikpet', name: 'Shaikpet', zone: 'West', lat: 17.4012, lng: 78.4015 },
  { id: 'sun-city', name: 'Sun City', zone: 'South', lat: 17.3485, lng: 78.4185 },
  { id: 'tellapur', name: 'Tellapur', zone: 'West', lat: 17.4685, lng: 78.2785 },
  { id: 'tolichowki', name: 'Tolichowki', zone: 'West', lat: 17.3985, lng: 78.4225 },
  { id: 'bhel', name: 'BHEL', zone: 'West', lat: 17.4985, lng: 78.2985, aliases: ['BHEL Township'] },

  // North-West
  { id: 'ameenpur', name: 'Ameenpur', zone: 'North-West', lat: 17.5285, lng: 78.3185 },
  { id: 'bachupally', name: 'Bachupally', zone: 'North', lat: 17.5442, lng: 78.3875 },
  { id: 'balanagar', name: 'Balanagar', zone: 'North-West', lat: 17.4585, lng: 78.4385 },
  { id: 'kukatpally', name: 'Kukatpally', zone: 'North-West', lat: 17.4852, lng: 78.4135 },
  { id: 'miyapur', name: 'Miyapur', zone: 'North-West', lat: 17.4965, lng: 78.3572 },
  { id: 'moosapet', name: 'Moosapet', zone: 'North-West', lat: 17.4725, lng: 78.4225 },
  { id: 'nizampet', name: 'Nizampet', zone: 'North-West', lat: 17.5102, lng: 78.3895 },
  { id: 'pragathi-nagar', name: 'Pragathi Nagar', zone: 'North-West', lat: 17.5185, lng: 78.3785 },
  { id: 'quthbullapur', name: 'Quthbullapur', zone: 'North', lat: 17.5085, lng: 78.4585, aliases: ['Qutbullapur'] },

  // North & Secunderabad
  { id: 'alwal', name: 'Alwal', zone: 'North', lat: 17.4952, lng: 78.5095 },
  { id: 'begumpet', name: 'Begumpet', zone: 'North', lat: 17.4442, lng: 78.4665 },
  { id: 'bolarum', name: 'Bolarum', zone: 'North', lat: 17.5185, lng: 78.5085 },
  { id: 'bowenpally', name: 'Bowenpally', zone: 'North', lat: 17.4685, lng: 78.4935 },
  { id: 'karkhana', name: 'Karkhana', zone: 'North', lat: 17.4562, lng: 78.4985 },
  { id: 'kompally', name: 'Kompally', zone: 'North', lat: 17.5425, lng: 78.4835 },
  { id: 'lalaguda', name: 'Lalaguda', zone: 'North', lat: 17.4485, lng: 78.5185 },
  { id: 'marredpally', name: 'Marredpally', zone: 'North', lat: 17.4485, lng: 78.5085 },
  { id: 'mettuguda', name: 'Mettuguda', zone: 'North', lat: 17.4385, lng: 78.5285 },
  { id: 'musheerabad', name: 'Musheerabad', zone: 'North', lat: 17.4185, lng: 78.4985 },
  { id: 'paradise', name: 'Paradise', zone: 'North', lat: 17.4432, lng: 78.5015 },
  { id: 'patny', name: 'Patny', zone: 'North', lat: 17.4412, lng: 78.4945 },
  { id: 'ranigunj', name: 'Ranigunj', zone: 'North', lat: 17.4385, lng: 78.4885 },
  { id: 'secunderabad', name: 'Secunderabad', zone: 'North', lat: 17.4392, lng: 78.4982 },
  { id: 'secunderabad-railway-station', name: 'Secunderabad Railway Station', zone: 'North', lat: 17.4335, lng: 78.5012 },
  { id: 'suchitra', name: 'Suchitra', zone: 'North', lat: 17.5585, lng: 78.4785 },
  { id: 'trimulgherry', name: 'Trimulgherry', zone: 'North', lat: 17.4785, lng: 78.5185 },
  { id: 'yapral', name: 'Yapral', zone: 'North', lat: 17.5085, lng: 78.5245 },

  // North-East & East
  { id: 'as-rao-nagar', name: 'AS Rao Nagar', zone: 'North-East', lat: 17.4785, lng: 78.5485, aliases: ['ASRao Nagar'] },
  { id: 'bn-reddy-nagar', name: 'BN Reddy Nagar', zone: 'East', lat: 17.3285, lng: 78.5685 },
  { id: 'boduppal', name: 'Boduppal', zone: 'East', lat: 17.4285, lng: 78.5885 },
  { id: 'champapet', name: 'Champapet', zone: 'East', lat: 17.3485, lng: 78.5385 },
  { id: 'cherlapally', name: 'Cherlapally', zone: 'East', lat: 17.5185, lng: 78.5985 },
  { id: 'dammaiguda', name: 'Dammaiguda', zone: 'East', lat: 17.4985, lng: 78.5785 },
  { id: 'dilsukhnagar', name: 'Dilsukhnagar', zone: 'East', lat: 17.3685, lng: 78.5245 },
  { id: 'ecil', name: 'ECIL', zone: 'North-East', lat: 17.4735, lng: 78.5695 },
  { id: 'ghatkesar', name: 'Ghatkesar', zone: 'East Outskirts', lat: 17.4502, lng: 78.6855 },
  { id: 'habsiguda', name: 'Habsiguda', zone: 'East', lat: 17.4125, lng: 78.5425 },
  { id: 'hayathnagar', name: 'Hayathnagar', zone: 'East', lat: 17.3195, lng: 78.5975 },
  { id: 'keesara', name: 'Keesara', zone: 'East', lat: 17.4785, lng: 78.6285 },
  { id: 'kothapet', name: 'Kothapet', zone: 'East', lat: 17.3702, lng: 78.5405 },
  { id: 'lb-nagar', name: 'LB Nagar', zone: 'East', lat: 17.3502, lng: 78.5525, aliases: ['L.B. Nagar', 'LBNagar'] },
  { id: 'mallapur', name: 'Mallapur', zone: 'East', lat: 17.4485, lng: 78.5785 },
  { id: 'malkajgiri', name: 'Malkajgiri', zone: 'North-East', lat: 17.4485, lng: 78.5385 },
  { id: 'medipally', name: 'Medipally', zone: 'East', lat: 17.3985, lng: 78.5985 },
  { id: 'moula-ali', name: 'Moula Ali', zone: 'North-East', lat: 17.4585, lng: 78.5585 },
  { id: 'nacharam', name: 'Nacharam', zone: 'East', lat: 17.4285, lng: 78.5585 },
  { id: 'nagaram', name: 'Nagaram', zone: 'East', lat: 17.4885, lng: 78.6085 },
  { id: 'nagole', name: 'Nagole', zone: 'East', lat: 17.3725, lng: 78.5585 },
  { id: 'neredmet', name: 'Neredmet', zone: 'North-East', lat: 17.4885, lng: 78.5385 },
  { id: 'peerzadiguda', name: 'Peerzadiguda', zone: 'East', lat: 17.4185, lng: 78.5985 },
  { id: 'pocharam', name: 'Pocharam', zone: 'East', lat: 17.4685, lng: 78.6485 },
  { id: 'ramanthapur', name: 'Ramanthapur', zone: 'East', lat: 17.3995, lng: 78.5385 },
  { id: 'sainikpuri', name: 'Sainikpuri', zone: 'North-East', lat: 17.4985, lng: 78.5485 },
  { id: 'tarnaka', name: 'Tarnaka', zone: 'East', lat: 17.4275, lng: 78.5285 },
  { id: 'uppal', name: 'Uppal', zone: 'East', lat: 17.4015, lng: 78.5585 },
  { id: 'vanasthalipuram', name: 'Vanasthalipuram', zone: 'East', lat: 17.3265, lng: 78.5765 },
  { id: 'warasiguda', name: 'Warasiguda', zone: 'East', lat: 17.4185, lng: 78.5185 },

  // South & outskirts
  { id: 'abdullapurmet', name: 'Abdullapurmet', zone: 'East Outskirts', lat: 17.3185, lng: 78.6285 },
  { id: 'aramghar', name: 'Aramghar', zone: 'South', lat: 17.3185, lng: 78.4285 },
  { id: 'jeedimetla', name: 'Jeedimetla', zone: 'North Outskirts', lat: 17.5185, lng: 78.4585 },
  { id: 'mailardevpally', name: 'Mailardevpally', zone: 'South', lat: 17.2985, lng: 78.4385 },
  { id: 'medchal', name: 'Medchal', zone: 'North Outskirts', lat: 17.6295, lng: 78.4815 },
  { id: 'pahadi-shareef', name: 'Pahadi Shareef', zone: 'South', lat: 17.2885, lng: 78.4585 },
  { id: 'patancheru', name: 'Patancheru', zone: 'West Outskirts', lat: 17.5335, lng: 78.2645 },
  { id: 'petbasheerabad', name: 'Petbasheerabad', zone: 'North Outskirts', lat: 17.5485, lng: 78.4685 },
  { id: 'rajendranagar', name: 'Rajendranagar', zone: 'South', lat: 17.3525, lng: 78.4285 },
  { id: 'rgia-airport', name: 'RGIA Airport', zone: 'South', lat: 17.2403, lng: 78.4294, aliases: ['Airport', 'Rajiv Gandhi Airport', 'Shamshabad Airport'] },
  { id: 'shamirpet', name: 'Shamirpet', zone: 'North Outskirts', lat: 17.5702, lng: 78.5655 },
  { id: 'shamshabad', name: 'Shamshabad', zone: 'South', lat: 17.2545, lng: 78.3795 },
  { id: 'shivrampally', name: 'Shivrampally', zone: 'South', lat: 17.3285, lng: 78.4185 },
  { id: 'dundigal', name: 'Dundigal', zone: 'North Outskirts', lat: 17.5685, lng: 78.4185 },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.\s,_-]+/g, ' ')
    .replace(/\bphase\b/g, 'phase')
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text).split(' ').filter((t) => t.length > 1);
}

export function isWithinHyderabadServiceArea(lat: number, lng: number): boolean {
  return (
    lat >= HYDERABAD_BOUNDS.minLat &&
    lat <= HYDERABAD_BOUNDS.maxLat &&
    lng >= HYDERABAD_BOUNDS.minLng &&
    lng <= HYDERABAD_BOUNDS.maxLng
  );
}

function scoreArea(area: HyderabadArea, query: string): number {
  const q = normalize(query);
  if (!q) return 1;

  const haystacks = [area.name, area.zone, ...(area.aliases ?? [])].map(normalize);
  let score = 0;

  for (const h of haystacks) {
    if (h === q) score = Math.max(score, 120);
    else if (h.startsWith(q)) score = Math.max(score, 100);
    else if (q.startsWith(h)) score = Math.max(score, 95);
    else if (h.includes(q)) score = Math.max(score, 80);
    else if (q.includes(h)) score = Math.max(score, 70);
  }

  const qTokens = tokens(query);
  if (qTokens.length > 0) {
    for (const h of haystacks) {
      const hTokens = tokens(h);
      const overlap = qTokens.filter((t) => hTokens.some((ht) => ht.startsWith(t) || t.startsWith(ht)));
      if (overlap.length === qTokens.length) score = Math.max(score, 90);
      else if (overlap.length > 0) score = Math.max(score, 50 + overlap.length * 15);
    }
  }

  if (q.includes('hyd') || q.includes('hyderabad')) score = Math.max(score, 5);

  return score;
}

export function searchHyderabadAreas(query: string, limit = 20): HyderabadArea[] {
  const q = normalize(query);
  if (!q) return HYDERABAD_AREAS.slice(0, limit);

  const scored = HYDERABAD_AREAS.map((area) => ({ area, score: scoreArea(area, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.area.name.localeCompare(b.area.name));

  return scored.slice(0, limit).map((row) => row.area);
}

export function resolveHyderabadArea(query: string): HyderabadArea | null {
  const q = normalize(query);
  if (!q) return null;

  const exact = HYDERABAD_AREAS.find((area) => {
    const names = [area.name, ...(area.aliases ?? [])].map(normalize);
    return (
      names.includes(q) ||
      names.some((n) => q === `${n} hyderabad` || q === `hyderabad ${n}`)
    );
  });
  if (exact) return exact;

  const results = searchHyderabadAreas(query, 1);
  const top = results[0];
  if (!top) return null;
  return scoreArea(top, query) >= 50 ? top : null;
}

/** Snap unknown coords to the nearest catalogued area (within ~8 km). */
export function nearestHyderabadArea(lat: number, lng: number): HyderabadArea | null {
  if (!isWithinHyderabadServiceArea(lat, lng)) return null;

  let best: HyderabadArea | null = null;
  let bestKm = Infinity;

  for (const area of HYDERABAD_AREAS) {
    const dLat = area.lat - lat;
    const dLng = area.lng - lng;
    const km = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
    if (km < bestKm) {
      bestKm = km;
      best = area;
    }
  }

  return bestKm <= 8 ? best : null;
}

export function areaToDisplayName(area: HyderabadArea, landmark?: string): string {
  const base = `${area.name}, Hyderabad`;
  const detail = landmark?.trim();
  return detail ? `${detail}, ${base}` : base;
}
