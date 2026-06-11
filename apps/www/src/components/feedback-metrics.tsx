"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { QUESTIONS } from "./nen-feedback-widget";

interface DataPoint {
  question_id: string;
  total: number;
  option_0?: number;
  option_1?: number;
  option_2?: number;
  option_3?: number;
  [key: string]: any;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DataPoint;
    const questionObj = QUESTIONS.find((q) => q.id === data.question_id);
    const questionText = questionObj ? questionObj.question : data.question_id;
    
    // Sort payload so the top stack item is at the top of the tooltip
    const sortedPayload = [...payload].reverse();

    return (
      <div className="bg-background border border-border shadow-lg rounded-lg p-3 max-w-[240px] z-50">
        <p className="text-[11px] font-semibold text-foreground leading-tight mb-2">{questionText}</p>
        <div className="flex flex-col gap-1 mb-2">
          {sortedPayload.map((entry, index) => {
            const optionIndexStr = entry.dataKey as string;
            const optIdx = parseInt(optionIndexStr.split('_')[1]);
            const optionText = questionObj?.options[optIdx] || `Option ${optIdx + 1}`;
            
            return (
              <div key={index} className="flex justify-between items-center text-[10px] gap-3">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground truncate" title={optionText}>{optionText}</span>
                </div>
                <span className="font-mono text-foreground font-medium">{entry.value}</span>
              </div>
            );
          })}
        </div>
        <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px] font-semibold text-foreground">
          <span>Total</span>
          <span>{data.total}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function FeedbackMetrics() {
  const [data, setData] = useState<DataPoint[] | null>(null);

  useEffect(() => {
    fetch('/api/feedback/metrics')
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          setData(json.data);
        }
      })
      .catch(e => console.error("Metrics fetch failed", e));
  }, []);

  if (!data) return null;

  const totalFeedback = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/40">
      <div className="flex justify-between items-end">
        <span className="font-semibold text-foreground text-xs">Feedback Pulse</span>
        <span className="text-[10px] text-muted-foreground font-medium">{totalFeedback} Total</span>
      </div>
      <div className="h-24 w-full opacity-80 hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
            <XAxis dataKey="question_id" hide />
            <YAxis hide />
            <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<CustomTooltip />} />
            <Bar dataKey="option_0" stackId="a" fill="hsl(var(--chart-1))" />
            <Bar dataKey="option_1" stackId="a" fill="hsl(var(--chart-2))" />
            <Bar dataKey="option_2" stackId="a" fill="hsl(var(--chart-3))" />
            <Bar dataKey="option_3" stackId="a" fill="hsl(var(--chart-4))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
