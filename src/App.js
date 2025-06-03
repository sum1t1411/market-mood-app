// src/App.js
import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Activity } from 'lucide-react';

// Import the custom hook for data management
import { useFinancialNews } from './hooks/useFinancialNews';

// Import all the separate UI components
import Navigation from './components/Navigation';
import GaugeChart from './components/GaugeChart';
import SentimentCard from './components/SentimentCard';
import HeadlineCard from './components/HeadlineCard';
import LoadingSkeleton from './components/LoadingSkeleton';
import ErrorMessage from './components/ErrorMessage';
import NoNewsFound from './components/NoNewsFound';
import Footer from './components/Footer';

const App = () => {
  // State for dark mode, initialized from localStorage or system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('marketMoodDarkMode');
      if (stored !== null) {
        return stored === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default to light mode if not in a browser environment
  });

  // State to track the last updated timestamp
  const [lastUpdated, setLastUpdated] = useState('');

  // Destructure values and functions from the custom useFinancialNews hook
  const {
    headlines,
    moodScore,
    sentimentCounts,
    loading,
    errorMessage,
    loadData
  } = useFinancialNews(); // The hook handles data fetching and sentiment analysis

  // Effect to apply dark mode class to HTML element and save preference to localStorage
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('marketMoodDarkMode', isDarkMode.toString());
    } catch (error) {
      console.warn('Could not save dark mode preference to localStorage:', error);
    }
  }, [isDarkMode]);

  // Effect to load initial data when the component mounts
  useEffect(() => {
    loadData();
  }, [loadData]); // `loadData` is wrapped in useCallback in the hook, so it's stable

  // Effect to update the 'last updated' timestamp once loading is complete
  useEffect(() => {
    if (!loading) {
      // Format time to 2-digit hour and minute
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [loading]);

  // Handler to toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Handler to refresh data by calling loadData from the hook
  const handleRefresh = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 transition-all duration-700">
      {/* Navigation Bar - includes dark mode toggle and last updated status */}
      <Navigation
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        lastUpdated={lastUpdated}
        loading={loading}
      />

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Dashboard Section - Displays overall market sentiment */}
        <div className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5 mb-8">
          {/* Decorative background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-indigo-400/5"></div>

          <div className="relative p-8 lg:p-12">
            {/* Header with App Title and Description */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Activity className="w-8 h-8 text-white" /> {/* Icon for activity */}
                  </div>
                  {/* Live indicator dot */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-white dark:via-blue-100 dark:to-white bg-clip-text text-transparent">
                Market Pulse
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Real-time sentiment analysis of India's financial landscape powered by advanced AI
              </p>
            </div>

            {/* Dashboard Grid - Contains Gauge Chart and Sentiment Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Gauge Chart Section */}
              <div className="order-2 lg:order-1">
                {/* Conditional rendering for loading state or GaugeChart */}
                {loading && headlines.length === 0 && !errorMessage ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-blue-200 dark:border-slate-700 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
                      <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-ping border-t-blue-400"></div>
                    </div>
                  </div>
                ) : (
                  <GaugeChart score={moodScore} isDarkMode={isDarkMode} />
                )}
              </div>

              {/* Sentiment Cards Section */}
              <div className="order-1 lg:order-2 space-y-4">
                {/* Individual Sentiment Cards for Bullish, Neutral, Bearish */}
                <SentimentCard
                  icon="📈"
                  label="Bullish Sentiment"
                  count={sentimentCounts.bullish}
                  trend="up"
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20"
                />
                <SentimentCard
                  icon="⚖️"
                  label="Neutral Outlook"
                  count={sentimentCounts.neutral}
                  trend="neutral"
                  colorClass="text-slate-600 dark:text-slate-400"
                  bgClass="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/20 dark:to-slate-700/20"
                />
                <SentimentCard
                  icon="📉"
                  label="Bearish Sentiment"
                  count={sentimentCounts.bearish}
                  trend="down"
                  colorClass="text-red-600 dark:text-red-400"
                  bgClass="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
                />
              </div>
            </div>

            {/* Refresh Analysis Button */}
            <div className="text-center mt-12">
              <button
                onClick={handleRefresh}
                disabled={loading} // Disable button during loading
                className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
                <span>{loading ? 'Analyzing Market...' : 'Refresh Analysis'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Display Error Message if any */}
        {errorMessage && <ErrorMessage message={errorMessage} />}

        {/* Market Headlines Section */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" /> {/* Icon for trending */}
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-200">
                  Market Headlines
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Latest financial news with sentiment analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-800">
                {/* Display number of articles or loading status */}
                {loading && headlines.length === 0 && !errorMessage ? 'Analyzing...' : `${headlines.length} articles`}
              </div>
            </div>
          </div>

          {/* Conditional rendering for headlines: Loading, Displaying Headlines, or No News Found */}
          {loading && headlines.length === 0 && !errorMessage ? (
            <LoadingSkeleton />
          ) : headlines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {headlines.map((headline, index) => (
                <HeadlineCard
                  key={headline.url || `headline-${index}`} // Unique key for list items
                  headline={headline}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          ) : (
            // Display NoNewsFound component only if not loading and no error message
            !loading && !errorMessage && <NoNewsFound />
          )}
        </div>

        {/* Footer component */}
        <Footer />
      </main>
    </div>
  );
};

export default App;