import React, { useState, useEffect } from "react";
import {
  Calendar,
  User,
  Clock,
  ArrowRight,
  Eye,
  Heart,
  BookOpen,
  Loader,
  ExternalLink
} from "lucide-react";
import axios from 'axios';
import CONFIG from "../config.js";


const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(6);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 100);
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/blogs`);
      if (response.data.success) {
        setBlogs(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
      setError("Unable to load latest insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const calculateReadTime = (text) => {
    if (!text) return "3 min read";
    const wordsPerMinute = 200;
    const noOfWords = text.split(/\s/g).length;
    const minutes = noOfWords / wordsPerMinute;
    return `${Math.ceil(minutes)} min read`;
  };


  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (blog.content && blog.content.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const handleLike = (blogId) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blogId)) newSet.delete(blogId);
      else newSet.add(blogId);
      return newSet;
    });
  };

  const handleLoadMore = () => setVisibleCount((prev) => prev + 3);

  const displayedBlogs = filteredBlogs.slice(0, visibleCount);

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          className={`text-center mb-16 transform transition-all duration-1000 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
        >
          <BookOpen className="w-16 h-16 text-purple-400 mx-auto" />
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            Expert Insights
          </h1>
          <p className="text-gray-300 mt-4 text-lg max-w-2xl mx-auto">
            Discover trusted advice from WHO, CDC, and UNICEF to support your parenting journey.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-300">Curating expert articles...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchBlogs}
              className="px-6 py-2 bg-purple-600 rounded-full hover:bg-purple-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : !selectedBlog ? (
          <>
            {/* Blog Cards */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {displayedBlogs.map((blog, index) => (
                <BlogCard
                  key={blog.id || blog.link || index}
                  blog={blog}
                  animate={animate}
                  index={index}
                  onClick={() => setSelectedBlog(blog)}
                  calculateReadTime={calculateReadTime}
                />
              ))}
            </div>

            {/* Load More */}
            {visibleCount < filteredBlogs.length && (
              <div
                className={`text-center mt-12 transition-all duration-1000 delay-700 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                  }`}
              >
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-semibold hover:scale-105 transition"
                >
                  Load More Articles
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            className={`max-w-4xl mx-auto bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-xl transition-all duration-700 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
          >
            <button
              onClick={() => setSelectedBlog(null)}
              className="text-purple-400 mb-6 hover:underline flex items-center gap-2"
            >
              ← Back to Articles
            </button>
            <img
              src={selectedBlog.image}
              alt={selectedBlog.title}
              className="rounded-2xl mb-6 w-full object-cover max-h-[500px]"
            />
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              {selectedBlog.title}
            </h2>

            <div className="flex items-center text-purple-300 mb-8 space-x-4 text-sm">
              <span className="bg-purple-900/50 px-3 py-1 rounded-full">{selectedBlog.source}</span>
              <span>{new Date(selectedBlog.pubDate).toLocaleDateString()}</span>
              <span>{calculateReadTime(selectedBlog.contentFull || selectedBlog.content)}</span>
            </div>

            {/* Render full HTML content safely */}
            <div
              className="text-gray-300 leading-relaxed text-lg prose prose-invert max-w-none blog-content"
              dangerouslySetInnerHTML={{ __html: selectedBlog.contentFull || selectedBlog.content }}
            />

            <div className="mt-10 pt-6 border-t border-white/10 flex justify-center">
              <a
                href={selectedBlog.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-3 bg-purple-600 rounded-full text-white font-semibold hover:bg-purple-700 transition"
              >
                Read Original Source <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            <style>{`
                  .blog-content img {
                      border-radius: 1rem;
                      margin: 2rem 0;
                      margin-left: auto;
                      margin-right: auto;
                      max-width: 100%;
                      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                  }
                  .blog-content p {
                      margin-bottom: 1.5rem;
                  }
                  .blog-content a {
                      color: #c084fc;
                      text-decoration: underline;
                  }
                  .blog-content h1, .blog-content h2, .blog-content h3 {
                      color: white;
                      margin-top: 2rem;
                      margin-bottom: 1rem;
                      font-weight: bold;
                  }
              `}</style>
          </div>
        )}
      </div>
    </section>
  );
};

// Memoized Blog Card Component to prevent flickering on re-renders
const BlogCard = React.memo(({ blog, animate, index, onClick, calculateReadTime }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl transition-all duration-700 ${animate
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-10"
        } flex flex-col h-full`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className={`w-full overflow-hidden rounded-xl mb-4 aspect-[16/10] relative ${!imageLoaded && !imageError ? 'bg-gray-800 animate-pulse' : 'bg-gray-800'}`}>
        {!imageError ? (
          <img
            src={blog.image}
            alt={blog.title}
            loading="lazy"
            className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true); // Stop loading state
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/50 to-slate-900/50 text-purple-300">
            <BookOpen className="w-12 h-12 opacity-50 mb-2" />
            <span className="text-xs font-medium opacity-70">Read Article</span>
          </div>
        )}
      </div>

      <div className="flex items-center text-xs text-purple-300 mb-2 space-x-2">
        <span className="bg-purple-900/50 px-2 py-1 rounded">{blog.source}</span>
        <span>• {new Date(blog.pubDate).toLocaleDateString()}</span>
      </div>

      <h2 className="text-xl font-bold mb-3 line-clamp-2">{blog.title}</h2>
      <p className="text-gray-300 mb-4 line-clamp-3 text-sm flex-grow">
        {blog.content.replace(/<[^>]*>/g, "")}
      </p>

      <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-400">
          <Clock className="w-4 h-4 mr-1" />
          {calculateReadTime(blog.content)}
        </div>

        <button
          onClick={onClick}
          className="text-purple-400 font-medium flex items-center gap-1 hover:text-purple-300 transition-colors"
        >
          Read Article <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default Blog;
