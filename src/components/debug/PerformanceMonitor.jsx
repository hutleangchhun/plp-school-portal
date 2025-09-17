/**
 * Performance Monitor Component
 * Shows real-time performance metrics and detects infinite loops
 */

import { useState, useEffect } from 'react';
import { useRenderTracker } from '../../utils/reactOptimization';

const PerformanceMonitor = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    warnings: []
  });

  const renderCount = useRenderTracker('PerformanceMonitor');

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => {
        const newMetrics = {
          renderCount: renderCount,
          lastRenderTime: renderTime,
          averageRenderTime: (prev.averageRenderTime * (renderCount - 1) + renderTime) / renderCount,
          slowRenders: renderTime > 50 ? prev.slowRenders + 1 : prev.slowRenders,
          warnings: [
            ...prev.warnings,
            ...(renderTime > 100 ? [`Slow render: ${renderTime.toFixed(2)}ms`] : []),
            ...(renderCount > 20 ? [`High render count: ${renderCount}`] : [])
          ].slice(-5) // Keep only last 5 warnings
        };
        
        return newMetrics;
      });
    };
  }, [enabled, renderCount]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="text-green-400 font-bold mb-2">🚀 Performance Monitor</div>
      
      <div className="space-y-1">
        <div>Renders: <span className={renderCount > 20 ? 'text-red-400' : 'text-green-400'}>{renderCount}</span></div>
        <div>Last: <span className={metrics.lastRenderTime > 50 ? 'text-yellow-400' : 'text-green-400'}>{metrics.lastRenderTime.toFixed(1)}ms</span></div>
        <div>Avg: <span className={metrics.averageRenderTime > 30 ? 'text-yellow-400' : 'text-green-400'}>{metrics.averageRenderTime.toFixed(1)}ms</span></div>
        <div>Slow: <span className={metrics.slowRenders > 5 ? 'text-red-400' : 'text-yellow-400'}>{metrics.slowRenders}</span></div>
      </div>
      
      {metrics.warnings.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-red-400 text-xs">⚠️ Warnings:</div>
          {metrics.warnings.map((warning, index) => (
            <div key={index} className="text-red-300 text-xs">{warning}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;