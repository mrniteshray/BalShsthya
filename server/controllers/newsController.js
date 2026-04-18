
import axios from 'axios';

// Simple in-memory cache
let newsCache = {
    data: [],
    lastFetch: 0,
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Fallback static data
const staticNews = [
    {
        title: "New Guidelines for Infant Care",
        description: "Learn about the latest recommendations for taking care of your child, from nutrition to daily routines.",
        url: "https://en.wikipedia.org/wiki/Newborn_care_and_safety",
        image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=400&h=200&q=80",
        publishedAt: new Date().toISOString(),
        source: "Health Guidelines",
        author: "Dr. Sarah Wilson",
        category: "Health",
        id: "static-1"
    },
    {
        title: "The Benefits of Vaccination",
        description: "Explore how vaccinations can protect your child and ensure a healthy future.",
        url: "https://www.who.int/health-topics/vaccines-and-immunization",
        image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&h=200&q=80",
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        source: "WHO",
        author: "Dr. Michael Chen",
        category: "Prevention",
        id: "static-2"
    },
    {
        title: "Top Childcare Tips for 2024",
        description: "A comprehensive guide to the best childcare practices recommended by experts this year.",
        url: "https://en.wikipedia.org/wiki/Child_care",
        image: "https://images.unsplash.com/photo-1541557435984-1c79685a082b?auto=format&fit=crop&w=400&h=200&q=80",
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        source: "Parenting Daily",
        author: "Emma Rodriguez",
        category: "Tips",
        id: "static-3"
    },
    {
        title: "AI in First Aid for Kids",
        description: "Discover how artificial intelligence is transforming first aid practices for children.",
        url: "https://en.wikipedia.org/wiki/First_aid",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=400&h=200&q=80",
        publishedAt: new Date(Date.now() - 1209600000).toISOString(),
        source: "Tech Health",
        author: "Dr. Alex Johnson",
        category: "Technology",
        id: "static-4"
    }
];

export const getNews = async (req, res) => {
    try {
        const currentTime = Date.now();

        // Check if cache is valid (24h)
        if (newsCache.data.length > 0 && (currentTime - newsCache.lastFetch < CACHE_DURATION)) {
            console.log('Serving news from cache');
            return res.status(200).json({
                success: true,
                count: newsCache.data.length,
                data: newsCache.data,
            });
        }

        console.log('Fetching fresh news from API...');
        const API_KEY = process.env.NEWS_API_KEY;

        if (!API_KEY) {
            console.warn('NEWS_API_KEY is not set. Serving static fallback data.');
            return res.status(200).json({
                success: true,
                count: staticNews.length,
                data: staticNews,
                warning: "Served static data because NEWS_API_KEY is missing."
            });
        }

        // NewsData.io query
        // q in NewsData.io is for keywords
        // language: en
        // category: health (optional, but good)
        // Verified query: Focus on health/vaccination/outbreaks, aggressively exclude crime/theft
        const query = '(child OR pediatric) AND (health OR vaccination OR outbreak) NOT (theft OR crime)';

        try {
            // Using NewsData.io API
            // URL provided by user: https://newsdata.io/api/1/latest?apikey=... (implied v1) but standard is api/1/news
            // We use /news endpoint for keyword search
            const response = await axios.get('https://newsdata.io/api/1/news', {
                params: {
                    apikey: API_KEY,
                    q: query,
                    language: 'en',
                    category: 'health', // NewsData supports categories
                    image: 1, // Require images
                },
            });

            if (response.data.status === 'success') {
                const results = response.data.results || [];

                const articles = results
                    .filter(article => article.title && article.description) // Basic filtering
                    .map(article => ({
                        title: article.title,
                        description: article.description,
                        url: article.link, // NewsData uses 'link'
                        image: article.image_url, // NewsData uses 'image_url'
                        publishedAt: article.pubDate, // NewsData uses 'pubDate'
                        source: article.source_id, // NewsData uses 'source_id'
                        author: (article.creator && article.creator[0]) || article.source_id,
                        category: 'Health',
                        id: article.article_id || article.link,
                    }));

                // Update Cache
                newsCache = {
                    data: articles,
                    lastFetch: currentTime,
                };

                return res.status(200).json({
                    success: true,
                    count: articles.length,
                    data: articles,
                });
            } else {
                throw new Error(response.data.results?.message || 'API responded with non-success status');
            }
        } catch (apiError) {
            console.error('NewsAPI request failed:', apiError.response?.data || apiError.message);
            // Serve static data on specific API failures (like quota exceeded)
            console.warn('Falling back to static data due to API error.');
            return res.status(200).json({
                success: true,
                count: staticNews.length,
                data: staticNews,
                warning: "Served static data due to API error/quota."
            });
        }

    } catch (error) {
        console.error('Unexpected error in getNews:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error fetching news',
            error: error.message,
        });
    }
};
