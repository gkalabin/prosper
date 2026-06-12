'use client';
import {type ECharts, type EChartsOption, init} from 'echarts';
import {useEffect, useRef} from 'react';

// Renders a single ECharts chart and keeps it in sync with the given option.
export function Echart({option}: {option: EChartsOption}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const chart = init(container);
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, {notMerge: true});
  }, [option]);

  return <div ref={containerRef} className="h-[300px] w-full" />;
}
