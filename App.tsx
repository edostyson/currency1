import React, { useState, useEffect, useCallback } from 'react';
import { HistoryItem } from './types';
import { CURRENCIES } from './constants';
import { getExchangeRate } from './services/geminiService';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Sub-component for displaying history list
const HistoryList: React.FC<{ history: HistoryItem[]; onDeleteHistory: () => void; }> = ({ history, onDeleteHistory }) => {
  if (history.length === 0) {
    return (
      <div className="mt-8 text-center">
        <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Conversion History</h3>
        <p className="text-gray-500 dark:text-gray-400">No conversions yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 text-left">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Conversion History</h3>
        <button
          onClick={onDeleteHistory}
          className="flex items-center text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium py-1 px-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          aria-label="Delete conversion history"
        >
          <TrashIcon />
          Clear History
        </button>
      </div>
      <ul className="space-y-2">
        {history.map((item, index) => (
          <li key={index} className="bg-gray-50 dark:bg-gray-700/50 p-3 border-l-4 border-blue-500 dark:border-blue-400 text-sm text-gray-600 dark:text-gray-300 rounded-r-md shadow-sm">
            <div className="font-medium text-gray-800 dark:text-gray-100">
              {item.amount} {item.from} = {item.converted} {item.to}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Rate: 1 {item.from} = {item.rate} {item.to}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.timestamp}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const App: React.FC = () => {
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('EUR');
  const [result, setResult] = useState<string | null>(null);
  const [rate, setRate] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favoriteCurrencies, setFavoriteCurrencies] = useState<string[]>(['USD', 'EUR', 'GBP', 'JPY']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('conversionHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }

      const storedFavorites = localStorage.getItem('favoriteCurrencies');
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites);
        if (Array.isArray(parsedFavorites) && parsedFavorites.length > 0) {
          setFavoriteCurrencies(parsedFavorites);
        }
      }
    } catch (e) {
      console.error("Failed to parse localStorage data", e);
      setHistory([]);
      setFavoriteCurrencies(['USD', 'EUR', 'GBP', 'JPY']);
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    try {
      localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  };

  const saveFavorites = (newFavorites: string[]) => {
    try {
      localStorage.setItem('favoriteCurrencies', JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Failed to save favorites to localStorage", e);
    }
  };

  const toggleFavoriteCurrency = (currencyCode: string) => {
    setFavoriteCurrencies(prevFavorites => {
      const nextFavorites = prevFavorites.includes(currencyCode)
        ? prevFavorites.filter(code => code !== currencyCode)
        : [currencyCode, ...prevFavorites].slice(0, 6);

      saveFavorites(nextFavorites);
      return nextFavorites;
    });
  };
  
  const handleConvert = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      setResult(null);
      setRate(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setRate(null);

    try {
      const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = (numAmount * exchangeRate).toFixed(2);
      
      setResult(`${numAmount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`);
      setRate(`1 ${fromCurrency} = ${exchangeRate.toFixed(4)} ${toCurrency}`);

      const newHistoryItem: HistoryItem = {
        timestamp: new Date().toLocaleString(),
        from: fromCurrency,
        to: toCurrency,
        amount: numAmount,
        converted: parseFloat(convertedAmount),
        rate: exchangeRate.toFixed(4),
      };

      setHistory(prevHistory => {
        const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 10);
        saveHistory(updatedHistory);
        return updatedHistory;
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to fetch exchange rate. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [amount, fromCurrency, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleDeleteHistory = () => {
    if (window.confirm('Are you sure you want to clear your conversion history? This action cannot be undone.')) {
      setHistory([]);
      saveHistory([]); // Clears localStorage
    }
  };

  const recentPairs = Array.from(
    new Map(
      history.slice(0, 8).map(item => [`${item.from}-${item.to}`, item])
    ).values()
  );

  const CurrencySelector: React.FC<{
    value: string;
    onChange: (value: string) => void;
    id: string;
    label: string;
    onSelectFavorite: (currencyCode: string) => void;
  }> = ({ value, onChange, id, label, onSelectFavorite }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <div className="flex flex-wrap justify-end gap-1">
          {favoriteCurrencies.slice(0, 4).map(currencyCode => (
            <button
              key={currencyCode}
              type="button"
              onClick={() => onSelectFavorite(currencyCode)}
              className={`px-2 py-1 text-[10px] font-medium rounded-full border transition ${
                value === currencyCode
                  ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
              }`}
              aria-label={`Use ${currencyCode} as ${label.toLowerCase()} currency`}
            >
              {currencyCode}
            </button>
          ))}
        </div>
      </div>
      <input
        id={id}
        list={`${id}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="Type or select a currency"
        className="p-3 border border-gray-300 rounded-md text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 shadow-sm"
      />
      <datalist id={`${id}-list`}>
        {CURRENCIES.map(currency => (
          <option key={currency.code} value={currency.code} label={`${currency.flag} ${currency.code} - ${currency.name}`} />
        ))}
      </datalist>
    </div>
  );

  return (
    <div className="bg-gray-100 dark:bg-gray-900 flex justify-center items-center min-h-screen font-sans p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md relative">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Currency Converter</h1>
        </header>

        <main>
          <div className="flex flex-col gap-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="p-3 border border-gray-300 rounded-md text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <div className="flex items-center gap-4">
              <div className="w-full">
                <CurrencySelector
                  id="from-currency"
                  label="From"
                  value={fromCurrency}
                  onChange={(value) => setFromCurrency(value)}
                  onSelectFavorite={(currencyCode) => setFromCurrency(currencyCode)}
                />
              </div>
              <button
                onClick={handleSwap}
                className="p-3 mt-6 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full text-gray-600 dark:text-gray-300 transition-transform duration-300 ease-in-out transform hover:rotate-180"
                aria-label="Swap currencies"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              <div className="w-full">
                <CurrencySelector
                  id="to-currency"
                  label="To"
                  value={toCurrency}
                  onChange={(value) => setToCurrency(value)}
                  onSelectFavorite={(currencyCode) => setToCurrency(currencyCode)}
                />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Quick favorites</p>
                <button
                  type="button"
                  onClick={() => toggleFavoriteCurrency(fromCurrency)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium"
                >
                  {favoriteCurrencies.includes(fromCurrency) ? 'Remove from favorites' : 'Save from'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.filter(currency => favoriteCurrencies.includes(currency.code)).map(currency => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => toggleFavoriteCurrency(currency.code)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      currency.code === fromCurrency || currency.code === toCurrency
                        ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    {currency.flag} {currency.code}
                  </button>
                ))}
                {favoriteCurrencies.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No favorites saved yet.</p>
                )}
              </div>
            </div>

            {recentPairs.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Recent pairs</p>
                <div className="flex flex-wrap gap-2">
                  {recentPairs.map((item) => (
                    <button
                      key={`${item.from}-${item.to}`}
                      type="button"
                      onClick={() => {
                        setAmount(String(item.amount));
                        setFromCurrency(item.from);
                        setToCurrency(item.to);
                      }}
                      className="px-3 py-1.5 rounded-full border bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 text-sm transition"
                    >
                      {item.from} → {item.to}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={handleConvert}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg shadow-md"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Converting...
                </div>
              ) : 'Convert'}
            </button>
          </div>

          <div className="mt-6 text-center min-h-[72px]">
            {error && <p className="text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
            {result && <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{result}</p>}
            {rate && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rate}</p>}
          </div>

          <HistoryList history={history} onDeleteHistory={handleDeleteHistory} />
        </main>
      </div>
    </div>
  );
};

export default App;