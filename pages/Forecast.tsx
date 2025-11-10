import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ForecastNode, ForecastOutcome } from '../types';
import { ScenarioIcon, DriversIcon, DataPointIcon } from '../components/icons/MoreIcons';
import { getLiveForecast } from '../services/forecastService';
import { MOCK_FORECASTS } from '../constants';

const OutcomeCard: React.FC<{ outcome: ForecastOutcome, index: number }> = ({ outcome, index }) => (
  <div
    className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-5 flex items-start space-x-4 hover:border-[#64FFDA]/50 transition-all duration-300 hover:bg-slate-900/70 fade-in"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-full h-full" viewBox="0 0 36 36">
        <path
          className="text-slate-700"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
        <path
          className="text-[#64FFDA] transition-all duration-500 ease-in-out"
          strokeDasharray={`${outcome.probability}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{outcome.probability}%</span>
      </div>
    </div>
    <div>
      <h4 className="font-bold text-white">{outcome.title}</h4>
      <p className="text-sm text-slate-400 mt-1">{outcome.explanation}</p>
    </div>
  </div>
);

const Forecast: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [forecast, setForecast] = useState<ForecastNode | null>(null);
  const [scenarioKey, setScenarioKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>('');

  const loadForecast = useCallback(async (scenario?: string) => {
    if (!id) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const liveForecast = await getLiveForecast(id, { scenario });
      if (liveForecast) {
        setForecast(liveForecast);
      } else {
        const fallback = MOCK_FORECASTS[id] || null;
        setForecast(fallback);
        if (!fallback) {
          setError('Unable to generate a forecast for this event.');
        }
      }
    } catch (err) {
      console.warn('Forecast loading error:', err);
      const fallback = MOCK_FORECASTS[id] || null;
      setForecast(fallback);
      setError('Forecast unavailable. Showing cached baseline.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setActiveScenario('');
    setScenarioKey(prev => prev + 1);
    loadForecast();
  }, [id, loadForecast]);

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scenario = e.target.value;
    setActiveScenario(scenario);
    setScenarioKey(prev => prev + 1);

    if (!scenario) {
      loadForecast();
      return;
    }

    loadForecast(scenario);
  };

  if (!forecast) {
    return (
      <div className="p-8 text-white">
        {isLoading ? 'Generating live forecast...' : `Forecast not found for event: ${id}`}
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen p-8 space-x-8">
      {/* Central View */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="mb-8 flex-shrink-0">
          <h1 className="text-3xl font-bold text-white">Forecast</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center space-y-10">
            <div className="text-center p-6 bg-slate-900 border-2 border-[#64FFDA] rounded-full shadow-lg shadow-teal-500/30">
                <p className="text-slate-400 text-sm">Current Event</p>
                <h2 className="text-2xl font-bold text-[#64FFDA]">{forecast.eventName}</h2>
                {activeScenario && (
                  <p className="mt-2 text-xs text-slate-400">Scenario: {activeScenario}</p>
                )}
            </div>
            
            <div key={scenarioKey} className="w-full grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                <div>
                    <h3 className="text-xl font-semibold text-white mb-6 text-center">Short-Term Outlook</h3>
                    <div className="space-y-6">
                        {isLoading ? (
                          <p className="text-sm text-slate-500 text-center">Generating updated short-term outlook...</p>
                        ) : (
                          forecast.shortTerm.map((outcome, i) => <OutcomeCard key={`${outcome.title}-${i}`} outcome={outcome} index={i} />)
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-white mb-6 text-center">Medium-Term Outlook</h3>
                    <div className="space-y-6">
                        {isLoading ? (
                          <p className="text-sm text-slate-500 text-center">Crunching medium-term scenarios...</p>
                        ) : (
                          forecast.mediumTerm.map((outcome, i) => <OutcomeCard key={`${outcome.title}-${i}`} outcome={outcome} index={i} />)
                        )}
                    </div>
                </div>
            </div>
        </div>
        
        <div className="mt-auto bg-slate-900/50 border border-slate-800 rounded-lg p-6 flex-shrink-0">
          <h3 className="flex items-center space-x-2 text-xl font-bold text-white mb-4">
            <ScenarioIcon />
            <span>Run a "What-If" Scenario</span>
          </h3>
          <p className="text-slate-400 mb-4">Select a hypothetical event to see how this forecast might change.</p>
          <select 
            onChange={handleScenarioChange}
            className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
          >
            <option value="">Select Scenario...</option>
            <option value="A new international trade agreement is signed, easing supply chains.">New Trade Agreement Signed</option>
            <option value="A major geopolitical conflict disrupts key manufacturing regions.">Geopolitical Conflict Erupts</option>
            <option value="A breakthrough in chip manufacturing technology doubles efficiency.">Manufacturing Breakthrough</option>
          </select>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 bg-slate-900/50 border border-slate-800 rounded-lg p-6 flex-shrink-0 h-full overflow-y-auto">
        <h3 className="flex items-center space-x-2 text-xl font-bold text-white mb-4">
            <DriversIcon />
            <span>Key Drivers & Data Points</span>
        </h3>
        <ul className="space-y-3">
          {isLoading ? (
            <li className="text-slate-500 text-sm">Refreshing drivers...</li>
          ) : (
            forecast.keyDrivers.map(driver => (
              <li key={driver} className="flex items-center space-x-3 text-slate-300 bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-700 transition-colors">
                <DataPointIcon />
                <span>{driver}</span>
              </li>
            ))
          )}
        </ul>
        {error && (
          <p className="mt-4 text-xs text-red-300">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
};

export default Forecast;