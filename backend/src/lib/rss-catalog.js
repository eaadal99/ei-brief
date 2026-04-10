/**
 * Built-in RSS source catalog — 28 sources across all energy sectors.
 *
 * These are seeded into the `rss_sources` table on first startup.
 * Users can add more from the Preferences page.
 */

const RSS_CATALOG = [
  // ── Nuclear ─────────────────────────────────────────────────────────────
  { name: 'World Nuclear News', rss_url: 'https://www.world-nuclear-news.org/rss', sector: 'nuclear' },
  { name: 'Nuclear Engineering International', rss_url: 'https://www.neimagazine.com/feed/', sector: 'nuclear' },

  // ── Oil & Gas ───────────────────────────────────────────────────────────
  { name: 'Oil & Gas Journal', rss_url: 'https://www.ogj.com/rss', sector: 'oil_gas' },
  { name: 'Rigzone', rss_url: 'https://www.rigzone.com/news/rss/rigzone_latest.aspx', sector: 'oil_gas' },
  { name: 'Natural Gas World', rss_url: 'https://www.naturalgasworld.com/rss', sector: 'oil_gas' },
  { name: 'LNG Prime', rss_url: 'https://lngprime.com/feed/', sector: 'oil_gas' },

  // ── Wind ────────────────────────────────────────────────────────────────
  { name: 'Offshore Wind Biz', rss_url: 'https://www.offshorewind.biz/feed/', sector: 'wind' },
  { name: 'Windpower Monthly', rss_url: 'https://www.windpowermonthly.com/rss', sector: 'wind' },
  { name: 'Recharge News', rss_url: 'https://www.rechargenews.com/rss', sector: 'wind' },

  // ── Solar ───────────────────────────────────────────────────────────────
  { name: 'PV Tech', rss_url: 'https://www.pv-tech.org/feed/', sector: 'solar' },
  { name: 'Solar Power World', rss_url: 'https://www.solarpowerworldonline.com/feed/', sector: 'solar' },

  // ── Hydrogen ────────────────────────────────────────────────────────────
  { name: 'Hydrogen Insight', rss_url: 'https://www.hydrogeninsight.com/rss', sector: 'hydrogen' },
  { name: 'Hydrogen Fuel News', rss_url: 'https://www.hydrogenfuelnews.com/feed/', sector: 'hydrogen' },

  // ── Mining & Critical Minerals ──────────────────────────────────────────
  { name: 'The Northern Miner', rss_url: 'https://www.northernminer.com/feed/', sector: 'mining' },
  { name: 'Mining Journal', rss_url: 'https://www.mining-journal.com/rss', sector: 'mining' },
  { name: 'Kitco News', rss_url: 'https://www.kitco.com/rss/feed.xml', sector: 'mining' },

  // ── CCUS & Carbon ──────────────────────────────────────────────────────
  { name: 'Carbon Brief', rss_url: 'https://www.carbonbrief.org/feed/', sector: 'ccus' },
  { name: 'Carbon Pulse', rss_url: 'https://carbon-pulse.com/feed/', sector: 'carbon_markets' },

  // ── Storage / BESS ─────────────────────────────────────────────────────
  { name: 'Energy Storage News', rss_url: 'https://www.energy-storage.news/feed/', sector: 'bess' },

  // ── Data Centres ───────────────────────────────────────────────────────
  { name: 'Data Center Frontier', rss_url: 'https://www.datacenterfrontier.com/feed/', sector: 'data_centres' },
  { name: 'The Register', rss_url: 'https://www.theregister.com/headlines.rss', sector: 'data_centres' },

  // ── Grid & Infrastructure ──────────────────────────────────────────────
  { name: 'Utility Week', rss_url: 'https://utilityweek.co.uk/feed/', sector: 'grid_infrastructure' },
  { name: 'New Civil Engineer', rss_url: 'https://www.newcivilengineer.com/feed/', sector: 'grid_infrastructure' },

  // ── General Energy ─────────────────────────────────────────────────────
  { name: 'Politico Energy', rss_url: 'https://rss.politico.com/energy.xml', sector: 'general' },
  { name: 'Energy Monitor', rss_url: 'https://www.energymonitor.ai/feed/', sector: 'general' },
  { name: 'Canary Media', rss_url: 'https://www.canarymedia.com/feed', sector: 'general' },
  { name: 'Lexology Energy', rss_url: 'https://www.lexology.com/rss/energy.xml', sector: 'general' },
  { name: 'Reuters Energy', rss_url: 'https://www.reutersagency.com/feed/?best-topics=energy-environment', sector: 'general' },
];

export default RSS_CATALOG;
