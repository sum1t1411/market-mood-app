// src/App.js
import React, { useState, useEffect, useCallback } from 'react';

// If you decide to use a client-side sentiment library:
// import Sentiment from 'sentiment';

// --- Helper Function to get today's date in YYYY-MM-DD format ---
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('marketMoodDarkMode');
      if (stored !== null) {
        return stored === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [headlines, setHeadlines] = useState([]);
  const [moodScore, setMoodScore] = useState(0);
  const [sentimentCounts, setSentimentCounts] = useState({ bullish: 0, bearish: 0, neutral: 0 });
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize sentiment analyzer if using one, e.g.:
  // const sentimentAnalyzer = new Sentiment();


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

  const calculateMoodScore = useCallback((headlinesData) => {
    if (!headlinesData || headlinesData.length === 0) {
      setSentimentCounts({ bullish: 0, bearish: 0, neutral: 0 });
      return 0;
    }
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    headlinesData.forEach((h) => {
      if (h.sentiment_label === 'Bullish') bullishCount++;
      else if (h.sentiment_label === 'Bearish') bearishCount++;
      else neutralCount++;
    });

    const total = headlinesData.length;
    const score = total > 0 ? ((bullishCount - bearishCount) / total) * 100 : 0;

    setSentimentCounts({ bullish: bullishCount, bearish: bearishCount, neutral: neutralCount });
    return Math.round(score);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    console.log("loadData called"); // DEBUG
    try {
      const financialKeywords = "India finance OR India business OR stocks OR economy OR market OR sensex OR nifty OR RBI OR SEBI OR mutual funds OR IPO";
      // const financialKeywords = "India finance business"; // Try this if the longer one fails consistently

      const encodedKeywords = encodeURIComponent(financialKeywords);
      const RSS_FEED_URL = `https://news.google.com/rss/search?q=${encodedKeywords}&hl=en-IN&gl=IN&ceid=IN:en`;
      
      console.log("Constructed Google News RSS URL:", RSS_FEED_URL); // DEBUGGING

      const Rss2JsonApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED_URL)}`;
      // If you have an rss2json API key for higher limits, add it like so:
      // const Rss2JsonApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED_URL)}&api_key=YOUR_RSS2JSON_KEY_HERE`;
      console.log("Calling rss2json with URL:", Rss2JsonApiUrl); // DEBUGGING

      const response = await fetch(Rss2JsonApiUrl);
      console.log("rss2json response status:", response.status); // DEBUG

      if (!response.ok) {
        let errorDetail = `HTTP error! status: ${response.status}`;
        if (response.status === 422) {
            try {
                const errorJson = await response.json();
                errorDetail += ` - ${errorJson.message || 'Rss2json: Unprocessable Entity'}`;
            } catch (e) { /* Ignore if error body is not JSON */ }
        } else {
            try {
                const errorText = await response.text();
                errorDetail += ` - ${errorText}`;
            } catch (e) { /* Ignore if error body cannot be read as text */ }
        }
        throw new Error(errorDetail);
      }
      const data = await response.json();
      console.log("rss2json data received:", data); // DEBUG

      if (data.status !== 'ok' || !data.items) {
        throw new Error(`RSS2JSON API error: ${data.message || 'Invalid data format or empty items'}`);
      }

      const todayString = getTodayDateString();
      console.log("Filtering for date:", todayString); // DEBUG

      const formattedAndFilteredData = data.items
        .map((item) => {
          let itemDateString = '';
          if (item.pubDate) {
            try {
              const itemDate = new Date(item.pubDate);
              const year = itemDate.getFullYear();
              const month = String(itemDate.getMonth() + 1).padStart(2, '0');
              const day = String(itemDate.getDate()).padStart(2, '0');
              itemDateString = `${year}-${month}-${day}`;
            } catch (e) {
              console.warn("Could not parse pubDate:", item.pubDate, "for title:", item.title);
            }
          }
          return {
            title: item.title || 'No Title Provided',
            source: item.link ? new URL(item.link).hostname.replace(/^www\./i, '') : 'Unknown Source',
            url: item.link,
            pubDate: item.pubDate,
            itemDateString: itemDateString,
            sentiment_score: 0,
            sentiment_label: 'Neutral',
          };
        })
        .filter(item => {
            // console.log(`Comparing item date "${item.itemDateString}" with today "${todayString}" for title: ${item.title}`); // DEBUG
            return item.itemDateString === todayString;
        });
      
      console.log("Number of articles after date filtering:", formattedAndFilteredData.length); // DEBUG

      if (formattedAndFilteredData.length === 0 && data.items.length > 0) {
        setErrorMessage(`No specific financial news found for today with the current keywords. ${data.items.length} articles were found from the feed, but none matched today's date or your keywords.`);
      } else if (formattedAndFilteredData.length === 0 && data.items.length === 0) {
         setErrorMessage("No financial news found at all with the current keywords. The RSS feed might be empty or the query too restrictive.");
      }


      const dataWithPseudoSentiment = formattedAndFilteredData.map(item => {
        let label = 'Neutral'; let score = 0;
        const titleLower = item.title.toLowerCase();
        const positiveKeywords = ['surge', 'rally', 'profit', 'gain', 'up', 'high', 'optimistic', 'boom', 'record', 'strong', 'rises', 'boost', 'jumps'];
        const negativeKeywords = ['drop', 'fall', 'loss', 'concern', 'down', 'slump', 'crisis', 'fear', 'weak', 'decline', 'tumble', 'warns', 'plunges'];

        if (positiveKeywords.some(kw => titleLower.includes(kw))) {
            label = 'Bullish'; score = Math.random() * 0.4 + 0.5;
        } else if (negativeKeywords.some(kw => titleLower.includes(kw))) {
            label = 'Bearish'; score = -(Math.random() * 0.4 + 0.5);
        } else { 
            const randomFactor = Math.random();
            if (randomFactor > 0.65) { label = 'Bullish'; score = Math.random() * 0.3; }
            else if (randomFactor < 0.35) { label = 'Bearish'; score = -(Math.random() * 0.3); }
        }
        return { ...item, sentiment_label: label, sentiment_score: parseFloat(score.toFixed(2)) };
      });

      const calculatedMoodScore = calculateMoodScore(dataWithPseudoSentiment);
      setHeadlines(dataWithPseudoSentiment);
      setMoodScore(calculatedMoodScore);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    } catch (error) {
      console.error('Data fetch error details:', error);
      setErrorMessage(`${error.message}. Please check internet or try refreshing.`);
      setHeadlines([]);
      setMoodScore(0);
      setSentimentCounts({ bullish: 0, bearish: 0, neutral: 0 });
    } finally {
      setLoading(false);
      console.log("loadData finished"); // DEBUG
    }
  }, [calculateMoodScore]);

  useEffect(() => {
    console.log("Initial useEffect to call loadData"); // DEBUG
    loadData();
  }, [loadData]); // `loadData` is memoized, this will run once on mount and when `loadData` changes (it shouldn't if dependencies are stable)

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const getSentimentStyles = (label) => {
    switch (label) {
      case 'Bullish':
        return {
          bg: 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30',
          text: 'text-green-700 dark:text-green-400',
          border: 'border-green-500 dark:border-green-600',
          tagBg: 'bg-green-200 dark:bg-green-700',
          tagText: 'text-green-800 dark:text-green-200',
        };
      case 'Bearish':
        return {
          bg: 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30',
          text: 'text-red-700 dark:text-red-400',
          border: 'border-red-500 dark:border-red-600',
          tagBg: 'bg-red-200 dark:bg-red-700',
          tagText: 'text-red-800 dark:text-red-200',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700 dark:bg-opacity-30',
          text: 'text-gray-700 dark:text-gray-400',
          border: 'border-gray-400 dark:border-gray-500',
          tagBg: 'bg-gray-200 dark:bg-gray-600',
          tagText: 'text-gray-800 dark:text-gray-200',
        };
    }
  };

  const GaugeChart = ({ score }) => {
    const normalizedScore = Math.max(-100, Math.min(100, score));
    const angle = ((normalizedScore + 100) / 200) * 180;
    let moodText = 'Neutral';
    let moodTextColor = 'text-gray-600 dark:text-gray-400';
    let progressColor = isDarkMode ? 'rgb(75 85 99)' : 'rgb(107 114 128)';
    if (score > 25) { moodText = 'Very Bullish'; moodTextColor = 'text-green-600 dark:text-green-400'; progressColor = 'rgb(16 185 129)'; }
    else if (score > 0) { moodText = 'Bullish'; moodTextColor = 'text-green-500 dark:text-green-400'; progressColor = 'rgb(16 185 129)'; }
    else if (score < -25) { moodText = 'Very Bearish'; moodTextColor = 'text-red-600 dark:text-red-400'; progressColor = 'rgb(239 68 68)'; }
    else if (score < 0) { moodText = 'Bearish'; moodTextColor = 'text-red-500 dark:text-red-400'; progressColor = 'rgb(239 68 68)'; }
    return (
      <div className="relative w-72 h-[170px] mx-auto">
        <svg viewBox="0 0 200 100" className="w-full h-full transform "><path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke={isDarkMode ? '#374151' : '#e5e7eb'} strokeWidth="20" strokeLinecap="round" />
          {score !== 0 && (<path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke={progressColor} strokeWidth="20" strokeLinecap="round" style={{ strokeDasharray: Math.PI * 70, strokeDashoffset: Math.PI * 70 * (1 - (angle / 180)), transition: 'stroke-dashoffset 0.7s ease-out' }} />)}
          <line x1="100" y1="90" x2="100" y2="20" stroke={isDarkMode ? '#a0aec0' : '#4a5568'} strokeWidth="3" strokeLinecap="round" className="gauge-needle" style={{ transformOrigin: '100px 90px', transform: `rotate(${angle - 90}deg)` }} />
          <circle cx="100" cy="90" r="6" fill={isDarkMode ? '#cbd5e1' : '#2d3748'} />
        </svg>
        <div className="absolute bottom-[5px] left-1/2 transform -translate-x-1/2 text-center w-full">
          <div className={`text-4xl font-bold ${moodTextColor}`}>{score >= 0 ? `+${score}` : score}</div>
          <div className={`text-md font-medium ${moodTextColor} uppercase tracking-wider`}>{moodText}</div>
        </div>
      </div>);
  };

  const HeadlineCard = ({ headline }) => {
    const styles = getSentimentStyles(headline.sentiment_label);
    const sentimentEmoji = headline.sentiment_label === 'Bullish' ? '📈' : headline.sentiment_label === 'Bearish' ? '📉' : '➡️';
    return (
      <div className={`border-l-4 ${styles.border} ${isDarkMode ? 'bg-dark-card hover:bg-gray-700' : 'bg-light-card hover:bg-gray-50'} rounded-lg p-5 shadow-lg hover:shadow-xl transition-all duration-300 group animate-fadeIn flex flex-col justify-between min-h-[180px]`}>
        <div>
          <div className="flex justify-between items-start mb-3"><span className={`text-xs font-medium ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'} truncate flex-1 mr-2`} title={headline.source}>{headline.source}</span><span className={`text-xs font-semibold ${styles.tagText} ${styles.tagBg} px-2.5 py-1 rounded-full whitespace-nowrap`}>{headline.sentiment_label}</span></div>
          <h4 className="text-lg font-semibold mb-2 leading-snug ">
            {headline.url && headline.url !== '#' ? (<a href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-blue-500 rounded transition-colors duration-200 line-clamp-3" title={headline.title}>{headline.title}</a>)
             : (<span className="line-clamp-3" title={headline.title}>{headline.title}</span>)}
          </h4>
        </div>
        <div className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'} flex justify-between items-center mt-auto pt-2`}><span>Score: <span className={`font-bold ${styles.text}`}>{headline.sentiment_score.toFixed(2)}</span></span><span className="text-2xl">{sentimentEmoji}</span></div>
      </div>);
  };

  const SentimentStatCard = ({ icon, label, count, colorClass, bgColorClass }) => (
    <div className={`flex flex-col items-center justify-center p-5 rounded-xl shadow-md ${isDarkMode ? 'bg-dark-card' : bgColorClass} w-full sm:w-auto min-w-[120px] transition-all duration-300`}>
      <span className="text-4xl mb-2">{icon}</span><span className={`font-bold text-3xl mb-1 ${colorClass}`}>{count}</span><span className={`text-sm font-medium ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>{label}</span>
    </div>);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-dark-bg text-dark-text' : 'bg-light-bg text-light-text'}`}>
      <nav className={`${isDarkMode ? 'bg-dark-card' : 'bg-light-card'} shadow-lg sticky top-0 z-50 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center gap-3"><span className="text-4xl">📊</span><span className="text-3xl font-bold gradient-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">Market Mood</span></div>
            <div className="flex items-center gap-4"><span className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'} hidden md:block`}>Last updated: {loading && !lastUpdated ? 'Updating...' : lastUpdated || 'N/A'}</span><button onClick={toggleDarkMode} className={`p-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 focus:ring-yellow-500' : 'bg-gray-200 hover:bg-gray-300 text-purple-600 focus:ring-purple-500'}`} title="Toggle Dark Mode">{isDarkMode ? '☀️' : '🌙'}</button></div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="mb-16 text-center">
          <h2 className="text-4xl font-extrabold mb-4 gradient-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">Today's Market Pulse</h2>
          <p className={`${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'} mb-10 text-lg max-w-2xl mx-auto`}>Sentiment analysis based on the latest financial headlines from India.</p>
          <div className="mb-8">{loading && headlines.length === 0 && !errorMessage ? (<div className="w-72 h-[170px] mx-auto flex items-center justify-center"><div className="animate-spinSlow rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-primary dark:border-blue-400"></div></div>) : (<GaugeChart score={moodScore} />)}</div>
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 sm:gap-6 mb-10"><SentimentStatCard icon="📈" label="Bullish" count={sentimentCounts.bullish} colorClass="text-green-600 dark:text-green-400" bgColorClass="bg-green-50" /><SentimentStatCard icon="➡️" label="Neutral" count={sentimentCounts.neutral} colorClass="text-gray-600 dark:text-gray-400" bgColorClass="bg-gray-50" /><SentimentStatCard icon="📉" label="Bearish" count={sentimentCounts.bearish} colorClass="text-red-600 dark:text-red-400" bgColorClass="bg-red-50" /></div>
          <button onClick={loadData} disabled={loading} className="px-8 py-3.5 text-lg font-semibold rounded-lg shadow-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"><span className={`text-xl ${loading ? 'animate-spin' : ''}`}>🔄</span><span>{loading ? 'Analyzing...' : 'Refresh Pulse'}</span></button>
        </section>
        {errorMessage && (<div className="mb-8 text-center p-4 rounded-md bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-300 max-w-3xl mx-auto"><p>{errorMessage}</p></div>)}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-2 border-b-2 border-dashed dark:border-gray-700 border-gray-300">
            <h3 className="text-3xl font-bold flex items-center gap-3 mb-4 sm:mb-0"><span>📰</span>Today's Financial Headlines</h3><span className={`text-sm font-medium px-3 py-1.5 rounded-full ${isDarkMode ? 'bg-blue-900 bg-opacity-50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{loading && headlines.length === 0 && !errorMessage ? 'Fetching...' : `${headlines.length} articles analyzed`}</span>
          </div>
          {loading && headlines.length === 0 && !errorMessage ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => (<div key={i} className={`rounded-lg p-5 shadow-lg ${isDarkMode ? 'bg-dark-card' : 'bg-light-card'} h-full flex flex-col min-h-[180px]`}><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-3 animate-pulse"></div><div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4 animate-pulse"></div><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2 animate-pulse"></div><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 animate-pulse"></div><div className="flex justify-between items-center mt-auto pt-2"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 animate-pulse"></div><div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div></div></div>))}</div>)
           : headlines.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{headlines.map((headline, index) => (<HeadlineCard key={headline.url || `headline-${index}`} headline={headline} />))}</div>)
           : (!loading && !errorMessage && <p className="text-center text-lg text-gray-500 dark:text-gray-400 py-8">No financial news found for today. Try different keywords or check again later.</p>)}
        </section>
        <footer className={`text-center mt-20 py-10 border-t ${isDarkMode ? 'border-gray-700 text-dark-text-secondary' : 'border-gray-200 text-light-text-secondary'}`}>
          <div className="flex justify-center items-center gap-2 mb-3"><span className="text-3xl">🚀</span><p className="text-xl font-semibold">Market Mood Analyzer</p></div>
          <p className="text-sm">Crafted with React & Tailwind CSS. News via Google News RSS (processed by rss2json.com).</p>
          <p className="text-xs mt-1">Sentiment analysis is currently illustrative. Implement actual sentiment analysis for meaningful results.</p>
        </footer>
      </main>
    </div>
  );
};
export default App;