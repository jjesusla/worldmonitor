// Agricultural geographic data: grain exchanges, bulk ports, locust watch zones

export interface AgroExchange {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  commodities: string[];
  description?: string;
}

export interface GrainPort {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  mainCommodities: string[];
  annualVolumeMt?: number;
  description?: string;
}

export interface LocustWatchZone {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  riskLevel: 'watch' | 'warning' | 'alert';
  description?: string;
}

export const AGRO_EXCHANGES: AgroExchange[] = [
  {
    id: 'cbot', name: 'CBOT (CME Group)', city: 'Chicago', country: 'US',
    lat: 41.878, lon: -87.631,
    commodities: ['wheat', 'corn', 'soybeans', 'oats', 'rice'],
    description: 'World benchmark for US grain futures',
  },
  {
    id: 'euronext-matif', name: 'Euronext MATIF', city: 'Paris', country: 'France',
    lat: 48.869, lon: 2.349,
    commodities: ['wheat', 'corn', 'rapeseed'],
    description: 'European milling wheat benchmark',
  },
  {
    id: 'dce', name: 'Dalian Commodity Exchange', city: 'Dalian', country: 'China',
    lat: 38.914, lon: 121.614,
    commodities: ['soybean', 'corn', 'palm oil', 'egg'],
    description: "China's leading agri futures exchange",
  },
  {
    id: 'czce', name: 'Zhengzhou Commodity Exchange', city: 'Zhengzhou', country: 'China',
    lat: 34.746, lon: 113.625,
    commodities: ['wheat', 'cotton', 'sugar', 'rapeseed'],
    description: "China's wheat and cotton futures hub",
  },
  {
    id: 'b3', name: 'B3 (Bolsa do Brasil)', city: 'São Paulo', country: 'Brazil',
    lat: -23.549, lon: -46.634,
    commodities: ['coffee', 'sugar', 'soybeans', 'corn'],
    description: "Brazil's leading commodity exchange",
  },
  {
    id: 'ice-liffe', name: 'ICE Futures Europe (LIFFE)', city: 'London', country: 'UK',
    lat: 51.508, lon: -0.118,
    commodities: ['cocoa', 'coffee', 'sugar', 'wheat'],
    description: 'Global soft commodity futures',
  },
  {
    id: 'ncdex', name: 'NCDEX', city: 'Mumbai', country: 'India',
    lat: 19.076, lon: 72.877,
    commodities: ['wheat', 'sugar', 'spices', 'pulses'],
    description: "India's national agricultural exchange",
  },
];

export const GRAIN_PORTS: GrainPort[] = [
  {
    id: 'new-orleans', name: 'Port of New Orleans', city: 'New Orleans', country: 'US',
    lat: 29.953, lon: -90.059,
    mainCommodities: ['corn', 'soybeans', 'wheat'], annualVolumeMt: 60,
    description: 'Primary US Gulf export hub for grains, largest US grain export point',
  },
  {
    id: 'odesa', name: 'Port of Odesa', city: 'Odesa', country: 'Ukraine',
    lat: 46.477, lon: 30.733,
    mainCommodities: ['wheat', 'corn', 'sunflower oil'],
    description: 'Largest Ukrainian grain port, Black Sea corridor hub',
  },
  {
    id: 'novorossiysk', name: 'Novorossiysk Grain Terminal', city: 'Novorossiysk', country: 'Russia',
    lat: 44.722, lon: 37.770,
    mainCommodities: ['wheat', 'barley'],
    description: "Russia's main Black Sea grain export terminal",
  },
  {
    id: 'santos', name: 'Port of Santos', city: 'Santos', country: 'Brazil',
    lat: -23.954, lon: -46.333,
    mainCommodities: ['soybeans', 'corn', 'sugar', 'coffee'], annualVolumeMt: 45,
    description: "Largest port in Latin America, Brazil's primary soy/corn export hub",
  },
  {
    id: 'paranagua', name: 'Port of Paranaguá', city: 'Paranaguá', country: 'Brazil',
    lat: -25.520, lon: -48.506,
    mainCommodities: ['soybeans', 'corn', 'wheat'],
    description: "Brazil's second largest grain port",
  },
  {
    id: 'haldia', name: 'Haldia Port', city: 'Haldia', country: 'India',
    lat: 22.025, lon: 88.069,
    mainCommodities: ['rice', 'wheat'],
    description: 'Key Indian grain port, rice export hub',
  },
  {
    id: 'tianjin-grain', name: 'Tianjin Grain Terminal', city: 'Tianjin', country: 'China',
    lat: 38.991, lon: 117.706,
    mainCommodities: ['soybeans', 'corn', 'wheat'],
    description: 'Major Chinese grain import terminal',
  },
  {
    id: 'portland-grain', name: 'Port of Portland', city: 'Portland', country: 'US',
    lat: 45.528, lon: -122.668,
    mainCommodities: ['wheat'],
    description: 'Largest US Pacific Northwest wheat export terminal',
  },
];

export const LOCUST_WATCH_ZONES: LocustWatchZone[] = [
  {
    id: 'horn-africa', name: 'Horn of Africa', region: 'Eastern Africa',
    lat: 7.0, lon: 42.0, riskLevel: 'warning',
    description: 'Ethiopia, Somalia, Kenya — persistent Desert Locust breeding ground',
  },
  {
    id: 'sahel-locust', name: 'West African Sahel', region: 'West Africa',
    lat: 14.0, lon: -2.0, riskLevel: 'watch',
    description: 'Seasonal migration corridor during wet season',
  },
  {
    id: 'sw-asia', name: 'Southwest Asia', region: 'Middle East/South Asia',
    lat: 25.0, lon: 58.0, riskLevel: 'watch',
    description: 'Iran, Pakistan, India — monsoon-linked breeding',
  },
  {
    id: 'nw-india-pak', name: 'Northwest India/Pakistan', region: 'South Asia',
    lat: 27.0, lon: 72.0, riskLevel: 'watch',
    description: 'Rajasthan-Sindh corridor, Kharif season risk',
  },
  {
    id: 'red-sea-coast', name: 'Red Sea Coastal Zone', region: 'MENA',
    lat: 20.0, lon: 37.0, riskLevel: 'alert',
    description: 'Yemen, Eritrea, Sudan — year-round breeding risk',
  },
];
