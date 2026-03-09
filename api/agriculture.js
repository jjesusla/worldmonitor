import { cors } from './_cors';
import { Redis } from '@upstash/redis';
import { XMLParser } from 'fast-xml-parser';

// --- Redis Cache Setup ---
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const CACHE_KEY_AGRICULTURE = 'world-monitor:agriculture-dashboard:v3';
const CACHE_TTL_SECONDS = 3600; // 1 hour

// --- Data Fetching Functions ---

/**
 * Loads local context for Guanajuato from a curated JSON file.
 * This file should be periodically updated based on SECAM bulletins.
 */
async function getGuanajuatoContext() {
  console.log('Loading local Guanajuato context...');
  try {
    const contextData = await import('../data/guanajuato-context.json');
    return contextData.default;
  } catch (error) {
    console.error('Failed to load local context data:', error);
    return { source: "Curated Local Data", error: "Failed to load guanajuato-context.json." };
  }
}

/**
 * [Placeholder] Fetches national grain balance.
 * Technical Source: GCMA (Grupo Consultor de Mercados Agrícolas) reports.
 * Implementation: Requires manual parsing of weekly reports or a potential future data feed.
 */
async function getNationalBalance() {
  console.log('Fetching national balance from GCMA...');
  return {
    source: "GCMA (Placeholder)",
    import_dependency_pct: 49,
    by_grain: {
      yellow_corn: { dependency: "high", observation: "Critical for livestock sector" },
      wheat: { dependency: "high", observation: "Driven by low international prices" },
    }
  };
}

/**
 * [Placeholder] Fetches US export and supply data.
 * Technical Source: USDA Foreign Agricultural Service (FAS) API.
 * Implementation: Query the REST API for Export Sales (ESR) and Production/Supply (PSD).
 */
async function getUSDAGovData() {
    console.log('Fetching USDA FAS data...');
    return {
        source: "USDA FAS API (Placeholder)",
        latest_export_sales: {
            corn_tonnes_to_mexico: 250000,
            report_date: "2026-03-05",
        },
        psd_forecast: {
            world_corn_production_change_pct: -1.5,
            observation: "Slight decrease due to weather events in North America.",
        }
    };
}

/**
 * Fetches international market data (CME Futures and USD/MXN).
 * Technical Sources: CME Group RSS/API, Trading Economics API for FX.
 * Implementation: Uses a 3rd party commodity API and a placeholder for FX.
 */
async function getInternationalMarkets() {
    console.log('Fetching international markets...');
    const apiKey = process.env.COMMODITIES_API_KEY;
    const symbols = 'CORN,WHEAT,SOYBEAN';
    const commoditiesUrl = `https://commodities-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=${symbols}`;
    
    const currencyData = {
        source: "Trading Economics API (Placeholder)",
        usd_mxn_rate: 18.55,
    };

    if (!apiKey) {
      return {
        cme_futures: { source: 'CME (Placeholder - API Key Needed)', data: {} },
        currency: currencyData,
      };
    }

    try {
        const response = await fetch(commoditiesUrl);
        const data = await response.json();
        if (!data.success) throw new Error('Failed to fetch from commodities-api');

        return {
            cme_futures: {
                source: "commodities-api.com",
                data: {
                    corn_usd_per_bushel: 1 / data.data.rates.CORN,
                    wheat_usd_per_bushel: 1 / data.data.rates.WHEAT,
                    soy_usd_per_bushel: 1 / data.data.rates.SOYBEAN,
                }
            },
            currency: currencyData,
        };
    } catch (error) {
        console.error("Error fetching int'l market data:", error);
        return { cme_futures: { source: 'CME (Error)', data: {}, error: error.message }, currency: currencyData };
    }
}

/**
 * [Placeholder] Fetches real-time logistics data.
 * Technical Source: MarineTraffic or VesselFinder Port Calls API.
 * Implementation: Requires subscription to a maritime tracking API.
 */
async function getLogisticsData() {
  console.log('Fetching logistics data...');
  return {
    source: "MarineTraffic API (Placeholder)",
    ports: {
      altamira: { arriving_bulk_carriers: 3, last_arrival_hours_ago: 8 },
      manzanillo: { arriving_bulk_carriers: 5, last_arrival_hours_ago: 3 },
    }
  };
}

/**
 * [Placeholder] Fetches agro-input prices.
 * Technical Sources: SNIIM for national references, Trading Economics API for real-time.
 */
async function getAgroInputsData() {
  console.log('Fetching agro-inputs data...');
  return {
    source: "SNIIM / Trading Economics API (Placeholder)",
    fertilizers: {
      urea_usd_per_ton: { price: 583.50, change_month_pct: 28.52, change_year_pct: 52.25 },
    },
    national_reference_sniim: {
        tortilla_kg_price_mxn_león: 18.00,
    }
  };
}

/**
 * [Placeholder] Fetches local climate data.
 * Technical Source: OpenWeatherMap API for a specific lat/lon in Guanajuato.
 */
async function getClimateData() {
    console.log('Fetching climate data...');
    return {
        source: "OpenWeatherMap API (Placeholder)",
        location: "Valle de Santiago, GTO",
        forecast_5_day: {
            chance_of_rain_pct: 10,
            max_temp_celsius: 28,
        }
    };
}


/**
 * Fetches local news from relevant RSS feeds.
 * Technical Source: CME RSS, local newspapers.
 */
async function getSocialPulse() {
  console.log('Fetching social pulse...');
  const feedUrl = 'https://www.cmegroup.com/cme-group-en-feed.rss';
  try {
    const response = await fetch(feedUrl);
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });
    const parsed = parser.parse(xmlText);
    const rawItems = parsed?.rss?.channel?.item ?? [];
    const itemArray = Array.isArray(rawItems) ? rawItems : [rawItems];
    const articles = itemArray.slice(0, 4).map(item => ({
      title: item.title?.__cdata ?? item.title ?? '',
      link: item.link ?? '',
      source: 'CME Group News',
    })).filter(a => a.title && a.link);
    return { source: "RSS Feeds", articles };
  } catch (error) {
    console.error("Error fetching social pulse:", error);
    return { source: "RSS Feeds", articles: [], error: error.message };
  }
}

// --- Main API Handler ---

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send({ error: 'Method Not Allowed' });
  }

  await cors(req, res);

  try {
    const cachedData = await redis.get(CACHE_KEY_AGRICULTURE);
    if (cachedData) {
      res.status(200).json(JSON.parse(cachedData));
      return;
    }

    console.log('Cache miss. Fetching fresh data for agriculture dashboard...');

    const [
      guanajuatoContext,
      nationalBalance,
      usdaGovData,
      internationalMarkets,
      logisticsData,
      agroInputsData,
      climateData,
      socialPulse
    ] = await Promise.all([
      getGuanajuatoContext(),
      getNationalBalance(),
      getUSDAGovData(),
      getInternationalMarkets(),
      getLogisticsData(),
      getAgroInputsData(),
      getClimateData(),
      getSocialPulse()
    ]);

    const responseData = {
      dashboard_title: "Inteligencia de Mercados de Granos: Guanajuato",
      last_updated: new Date().toISOString(),
      data_sources: [
        "Curated Local Data (SECAM)", "GCMA", "USDA FAS API", "Commodities-API", "Trading Economics API",
        "MarineTraffic API", "SNIIM", "OpenWeatherMap API", "CME Group RSS"
      ],
      
      local_context: guanajuatoContext,
      national_balance: nationalBalance,
      global_supply_demand: usdaGovData,
      international_markets: internationalMarkets,
      logistics: logisticsData,
      agro_inputs_and_final_products: agroInputsData,
      climate: climateData,
      social_pulse: socialPulse,
    };

    await redis.set(CACHE_KEY_AGRICULTURE, JSON.stringify(responseData), {
      EX: CACHE_TTL_SECONDS,
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in agriculture handler:', error);
    res.status(500).json({ error: 'Failed to fetch agriculture dashboard data', details: error.message });
  }
}
