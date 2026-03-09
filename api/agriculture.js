import { cors } from './_cors';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_KEY_AGRICULTURE = 'world-monitor:agriculture:v1';
const CACHE_TTL_SECONDS = 1800; // 30 minutes

/**
 * Loads local agricultural production data for Guanajuato.
 * This data is manually curated from SIAP's open data portal.
 * See: https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php
 * The file is expected at ../data/siap-guanajuato.json
 * @returns {Promise<object>}
 */
async function getSIAPData() {
  console.log('Loading local SIAP data...');
  try {
    // Vercel Edge Functions can't access the file system directly with `fs`.
    // Instead, we import the JSON file as if it were a module.
    // This bundles the data with the function at deployment.
    const siapData = await import('../data/siap-guanajuato.json');
    return siapData.default;
  } catch (error) {
    console.error('Failed to load local SIAP data. Make sure ../data/siap-guanajuato.json exists.', error);
    return {
      source: 'SIAP (Local)',
      error: 'Failed to load local SIAP data file. Please check the server logs.',
      production_summary: {},
    };
  }
}

/**
 * Fetches near-real-time futures prices for corn and wheat from a commodity API.
 * This function requires a valid API key from https://commodities-api.com/.
 * The key should be stored in the COMMODITIES_API_KEY environment variable.
 * @returns {Promise<object>}
 */
async function getCMEFutures() {
  console.log('Fetching CME futures...');

  const apiKey = process.env.COMMODITIES_API_KEY;
  const symbols = 'CORN,WHEAT';
  const url = `https://commodities-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=${symbols}`;

  if (!apiKey) {
    console.warn('COMMODITIES_API_KEY not found. Returning placeholder data for futures.');
    return {
      source: 'CME via commodities-api.com (Placeholder - API Key Needed)',
      lastUpdated: new Date().toISOString(),
      futures: {
        corn: {
          symbol: 'CORN',
          price_usd_per_unit: null,
          change: null,
          error: 'API key not provided.',
        },
        wheat: {
          symbol: 'WHEAT',
          price_usd_per_unit: null,
          change: null,
          error: 'API key not provided.',
        }
      }
    };
  }

  /*
  // UNCOMMENT THIS BLOCK AFTER ADDING THE COMMODITIES_API_KEY
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Commodities API request failed with status ${response.status}`);
    }
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Commodities API error: ${data.error?.info}`);
    }

    const cornPrice = data.data.rates.CORN;
    const wheatPrice = data.data.rates.WHEAT;

    // The API provides the price relative to the base currency, so 1/price gives the USD price.
    return {
      source: 'CME via commodities-api.com',
      lastUpdated: new Date(data.data.timestamp * 1000).toISOString(),
      futures: {
        corn: {
          symbol: 'CORN',
          price_usd_per_unit: 1 / cornPrice,
        },
        wheat: {
          symbol: 'WHEAT',
          price_usd_per_unit: 1 / wheatPrice,
        }
      }
    };
  } catch (error) {
    console.error('Failed to fetch CME futures:', error);
    throw error; // Re-throw to be caught by the main handler
  }
  */

  // Returning placeholder data for now as the fetch call is commented out.
  return {
    source: 'CME via commodities-api.com (Placeholder - Code ready)',
    lastUpdated: new Date().toISOString(),
    futures: {
      corn: {
        symbol: 'CORN',
        price_usd_per_unit: 4.50,
        note: "This is placeholder data. Uncomment code in getCMEFutures to use API."
      },
      wheat: {
        symbol: 'WHEAT',
        price_usd_per_unit: 6.20,
        note: "This is placeholder data. Uncomment code in getCMEFutures to use API."
      }
    }
  };
}

/**
 * Gathers relevant news by fetching and parsing a specialized RSS feed.
 * @returns {Promise<object>}
 */
async function getRegionalNews() {
  console.log('Fetching regional news...');
  const feedUrl = 'https://www.hortidaily.es/rss.asp';
  const maxArticles = 5;

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'WorldMonitor-Agriculture-Module/1.0',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed, status: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Basic manual XML parsing to avoid adding dependencies.
    const articles = [];
    const items = xmlText.split('<item>');
    items.shift(); // Remove everything before the first <item>

    for (let i = 0; i < items.length && i < maxArticles; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch && linkMatch && pubDateMatch) {
        articles.push({
          title: titleMatch[1],
          link: linkMatch[1],
          published: new Date(pubDateMatch[1]).toISOString(),
          source: 'HortiDaily ES',
        });
      }
    }

    return {
      source: 'HortiDaily ES RSS',
      articles,
    };

  } catch (error) {
    console.error('Failed to fetch or parse regional news RSS:', error);
    // Return an empty or error state, but don't block the whole API response
    return {
      source: 'HortiDaily ES RSS',
      articles: [],
      error: 'Failed to retrieve news.',
    };
  }
}


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  await cors(req, res);

  try {
    const cachedData = await redis.get(CACHE_KEY_AGRICULTURE);
    if (cachedData) {
      res.status(200).json(JSON.parse(cachedData));
      return;
    }

    console.log('Cache miss. Fetching fresh data for agriculture module...');

    const [siapData, cmeFutures, regionalNews] = await Promise.all([
      getSIAPData(),
      getCMEFutures(),
      getRegionalNews()
    ]);

    const responseData = {
      siap_data: siapData,
      cme_futures: cmeFutures,
      regional_news: regionalNews,
    };

    await redis.set(CACHE_KEY_AGRICULTURE, JSON.stringify(responseData), {
      EX: CACHE_TTL_SECONDS,
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in agriculture handler:', error);
    res.status(500).json({ error: 'Failed to fetch agriculture data' });
  }
}
