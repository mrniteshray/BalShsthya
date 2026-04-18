import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CONFIG from "../config.js";
import {
  Calendar,
  Clock,
  ArrowRight,
  Heart,
  Share2,
  BookOpen,
  Sparkles,
  Loader
} from "lucide-react";

const categoryColors = {
  Health: "bg-emerald-100 text-emerald-800",
  Prevention: "bg-blue-100 text-blue-800",
  Tips: "bg-purple-100 text-purple-800",
  Technology: "bg-orange-100 text-orange-800",
  General: "bg-gray-100 text-gray-800",
};

const News = () => {
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedArticles, setLikedArticles] = useState(new Set());
  const [hoveredCard, setHoveredCard] = useState(null);

  // pagination for Load More
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${CONFIG.BACKEND_URL}/api/news`);
        if (response.data.success) {
          setNewsData(response.data.data);
          setError(null);
        } else {
          // Fallback to empty state handled in UI
          setNewsData([]);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError("Unable to load latest news at the moment. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const toggleLike = (articleId) => {
    setLikedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) newSet.delete(articleId);
      else newSet.add(articleId);
      return newSet;
    });
  };

  // Helper to calculate read time (rough estimate)
  const calculateReadTime = (text) => {
    if (!text) return "3 min read";
    const wordsPerMinute = 200;
    const noOfWords = text.split(/\s/g).length;
    const minutes = noOfWords / wordsPerMinute;
    return `${Math.ceil(minutes)} min read`;
  }

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  const NewsCard = ({ news, index }) => {
    const isLiked = likedArticles.has(news.id || news.url);
    const isHovered = hoveredCard === (news.id || news.url);
    const [imageError, setImageError] = useState(false);
    const [shareStatus, setShareStatus] = useState("");

    const newsId = news.id || news.url;

    const handleShare = async (e) => {
      if (e && e.stopPropagation) e.stopPropagation();

      try {
        if (navigator && navigator.share) {
          await navigator.share({
            title: news.title,
            text: news.description,
            url: news.url,
          });
          setShareStatus("shared");
        } else if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(news.url);
          setShareStatus("copied");
        } else {
          // Fallback
          setShareStatus("copied");
        }
      } catch (err) {
        console.error("Share failed:", err);
        setShareStatus("error");
      }
      setTimeout(() => setShareStatus(""), 2000);
    };

    return (
      <div
        className={`group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col h-full`}
        style={{ animationDelay: `${index * 0.1}s` }}
        onMouseEnter={() => setHoveredCard(newsId)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        {/* Featured Badge (Randomly assign for UI variety if not present) */}
        {index === 0 && (
          <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center shadow-lg">
            <Sparkles className="w-4 h-4 mr-1" />
            Top Story
          </div>
        )}

        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {imageError || !news.image ? (
            <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-indigo-300" />
            </div>
          ) : (
            <img
              src={news.image}
              alt={news.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* Action Buttons */}
          <div
            className={`absolute top-4 right-4 flex space-x-2 transition-all duration-300 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
              }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(newsId);
              }}
              className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${isLiked
                ? "bg-red-500 text-white shadow-lg"
                : "bg-white/80 text-gray-700 hover:bg-white"
                }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              className="relative p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition-all duration-300"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {shareStatus && (
              <span className="absolute -top-8 right-0 bg-black text-white text-xs px-2 py-1 rounded shadow-md">
                {shareStatus === "copied" ? "Copied!" : shareStatus}
              </span>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6 flex flex-col flex-grow">
          {/* Meta */}
          <div className="flex items-center justify-between mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[news.category || 'General']}`}
            >
              {news.category || 'Health'}
            </span>
            <div className="flex items-center text-gray-500 text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(news.publishedAt)}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors duration-300 line-clamp-2">
            {news.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">{news.description}</p>

          {/* Footer */}
          <div className="mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {calculateReadTime(news.description || news.content)}
              </div>

              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-300 group/btn"
              >
                <span className="mr-2">Read More</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </a>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold uppercase">
                  {(news.source || "N").substring(0, 2)}
                </div>
                <span className="ml-3 text-sm text-gray-600 truncate max-w-[150px]">
                  {news.source || "News API"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-6 shadow-lg animate-pulse">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 animate-fadeIn">
            Latest News & Updates
          </h1>
          <p
            className="text-xl text-gray-600 max-w-2xl mx-auto animate-fadeIn"
            style={{ animationDelay: "0.2s" }}
          >
            Stay informed with the latest developments in childcare, health, and technology.
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-4 pb-20">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-600 text-lg">Curating the latest news for you...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 text-xl mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : newsData.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-xl">
            No news articles found at the moment.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {newsData.slice(0, visibleCount).map((news, index) => (
                <div key={news.url || index} className="animate-slideUp h-full" id={`news-card-${index}`}>
                  <NewsCard news={news} index={index} />
                </div>
              ))}
            </div>

            {/* Load More */}
            {visibleCount < newsData.length && (
              <div className="text-center pt-12 pb-20">
                <button
                  onClick={() => {
                    const prev = visibleCount;
                    const next = Math.min(newsData.length, prev + PAGE_SIZE);
                    setVisibleCount(next);

                    // Smooth scroll logic
                    setTimeout(() => {
                      const el = document.getElementById(`news-card-${prev}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  }}
                  className="px-8 py-4 rounded-full font-semibold transition-all duration-300 transform shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105"
                >
                  Load More Articles
                </button>
              </div>
            )}
          </>
        )}
      </div>


      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out both; }
        .animate-slideUp { animation: slideUp 0.6s ease-out both; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default News;