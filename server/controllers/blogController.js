import RSSParser from 'rss-parser';
import * as cheerio from 'cheerio';

const parser = new RSSParser({
    customFields: {
        item: [
            ['media:content', 'media:content', { keepArray: true }],
            ['media:thumbnail', 'media:thumbnail'],
            ['content:encoded', 'contentEncoded'],
            ['content', 'content'],
            ['description', 'description']
        ]
    }
});

// Simple in-memory cache
let blogCache = {
    data: [],
    lastFetch: 0,
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Trusted Sources - Verified/Updated URLs
const RSS_FEEDS = [
    { url: 'https://www.who.int/rss-feeds/news-english.xml', source: 'WHO' }, // Updated WHO feed
    { url: 'https://tools.cdc.gov/api/v2/resources/media/403372.rss', source: 'CDC' }, // CDC Child Development
    { url: 'https://www.unicef.org/press-releases/feed', source: 'UNICEF' }, // Updated UNICEF feed
    { url: 'https://www.sciencedaily.com/rss/health_medicine/children\'s_health.xml', source: 'ScienceDaily' },
    { url: 'https://www.medicalnewstoday.com/feed/pediatrics', source: 'MedicalNewsToday' } // Added backup source
];

// Fallback images (if RSS doesn't provide one)
const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1502086223501-6364d0c75cc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1536640717769-e3b79ce74645?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1594824476960-e78191426854?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1632762343774-4b8b99d70928?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80", // Research
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80", // Medical
    "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?auto=format&fit=crop&w=800&q=80", // Happy kid
    "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=800&q=80", // Father and child
    "https://images.unsplash.com/photo-1532330393533-443990a51d10?auto=format&fit=crop&w=800&q=80", // Mother and baby
    "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&w=800&q=80"  // Playground
];

const getDeterministicImage = (title) => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % FALLBACK_IMAGES.length;
    return FALLBACK_IMAGES[index];
};

// Helper function to extract image URL from an RSS item
const extractImage = (item) => {
    let imageUrl = null;

    // 1. Check Media Content / Enclosure
    if (item.enclosure?.url) imageUrl = item.enclosure.url;
    else if (item['media:content']?.['$']?.url) imageUrl = item['media:content']['$'].url;
    else if (item['media:content']?.url) imageUrl = item['media:content'].url;
    else if (item['media:thumbnail']?.['$']?.url) imageUrl = item['media:thumbnail']['$'].url;

    // 2. Check HTML Content for <img> tags using Cheerio
    if (!imageUrl) {
        const contentToSearch = (item.contentEncoded || item.content || item.description || "");
        const $ = cheerio.load(contentToSearch);
        const img = $('img').first();
        if (img.length) {
            imageUrl = img.attr('src');
        }
    }

    // 3. Fallback: Deterministic based on title
    if (!imageUrl) imageUrl = getDeterministicImage(item.title);

    return imageUrl;
};

// Keywords to filter for 0-18 age group relevance
const KEYWORDS = [
    'child', 'baby', 'infant', 'newborn', 'toddler', 'adolescent', 'teen', 'youth', 'pediatric', 'kid', 'school', 'parent', 'vaccin'
];

export const getBlogs = async (req, res) => {
    try {
        const currentTime = Date.now();

        // Check cache
        if (blogCache.data.length > 0 && (currentTime - blogCache.lastFetch < CACHE_DURATION)) {
            console.log('Serving blogs from cache');
            return res.status(200).json({
                success: true,
                count: blogCache.data.length,
                data: blogCache.data
            });
        }

        console.log('Fetching fresh blogs from RSS feeds...');

        const feedPromises = RSS_FEEDS.map(async (feedInfo) => {
            try {
                const feed = await parser.parseURL(feedInfo.url);
                return feed.items.map(item => {
                    const imageUrl = extractImage(item);

                    return {
                        id: item.guid || item.id || item.link, // Stable key for React
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        content: item.contentSnippet || item.content || item.description || "",
                        contentFull: item.contentEncoded || item.content || item.contentSnippet || "",
                        source: feedInfo.source,
                        author: item.creator || feedInfo.source,
                        image: imageUrl,
                        category: item.categories ? item.categories[0] : 'Health'
                    };
                });
            } catch (err) {
                console.error(`Error fetching feed ${feedInfo.url}:`, err.message);
                return [];
            }
        });

        const allFeeds = await Promise.all(feedPromises);
        const flattenedFeeds = allFeeds.flat();

        // Filter and Sort
        const filteredBlogs = flattenedFeeds.filter(blog => {
            const text = `${blog.title} ${blog.content}`.toLowerCase();
            return KEYWORDS.some(keyword => text.includes(keyword));
        }).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Take top 20
        const topBlogs = filteredBlogs.slice(0, 20);

        // Update Cache
        if (topBlogs.length > 0) {
            blogCache = {
                data: topBlogs,
                lastFetch: currentTime
            };
        }

        return res.status(200).json({
            success: true,
            count: topBlogs.length,
            data: topBlogs
        });

    } catch (error) {
        console.error('Error in getBlogs:', error);
        // Serve stale cache if available
        if (blogCache.data.length > 0) {
            return res.status(200).json({
                success: true,
                count: blogCache.data.length,
                data: blogCache.data,
                warning: "Served stale data due to server error"
            });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch blogs' });
    }
};
