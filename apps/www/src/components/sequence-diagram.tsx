"use client";

import React from "react";
import {
  Laptop,
  Server,
  Database,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Participant = {
  id: string;
  name: string;
  type?: "client" | "server" | "database" | "user";
};

export type Step = {
  id: string;
  from: string;
  to: string;
  label: React.ReactNode;
  body?: React.ReactNode;
  color?: "primary" | "muted" | "success";
  animated?: boolean;
};

const IconMap = {
  client: Laptop,
  server: Server,
  database: Database,
  user: User,
};

export function SequenceDiagram({
  participants,
  steps,
}: {
  participants: Participant[];
  steps: Step[];
}) {
  return (
    <div className="relative w-full overflow-x-auto overflow-y-hidden pb-6 my-8 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800/60 p-4 sm:p-8">
      <div className="relative font-sans mx-auto" style={{ minWidth: `${participants.length * 220}px` }}>
        {/* Header row (Participants) */}
        <div className="flex relative z-20 w-full mb-8">
          {participants.map((p) => {
            const Icon = p.type ? IconMap[p.type] : null;
            return (
              <div key={p.id} className="flex-1 flex flex-col items-center">
                <div className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-sm font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lifelines container */}
        <div className="absolute top-10 bottom-0 left-0 right-0 flex z-0 pointer-events-none">
          {participants.map((p) => (
            <div key={p.id} className="flex-1 flex justify-center">
              <div className="w-px h-full bg-transparent border-l-2 border-dashed border-zinc-200 dark:border-zinc-800/80" />
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="relative z-10 flex flex-col gap-6">
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              participants={participants}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepRow({
  step,
  participants,
}: {
  step: Step;
  participants: Participant[];
}) {
  const fromIdx = participants.findIndex((p) => p.id === step.from);
  const toIdx = participants.findIndex((p) => p.id === step.to);

  if (fromIdx === -1 || toIdx === -1) return null;

  const fromPct = ((fromIdx + 0.5) / participants.length) * 100;
  const toPct = ((toIdx + 0.5) / participants.length) * 100;

  const isSelf = fromIdx === toIdx;
  const isRight = toIdx > fromIdx;

  const widthPct = Math.abs(toPct - fromPct);
  const leftPct = Math.min(fromPct, toPct);

  // Colors
  const colorMap = {
    primary: "border-primary bg-primary text-primary",
    success: "border-emerald-500 bg-emerald-500 text-emerald-500",
    muted:
      "border-zinc-400 bg-zinc-400 text-zinc-400 dark:border-zinc-600 dark:bg-zinc-600 dark:text-zinc-500",
  };
  const colorClass = colorMap[step.color || "primary"];
  const lineClass = colorClass.split(" ")[0]; // just the border color

  if (isSelf) {
    return (
      <div className="relative w-full py-2 flex items-start group">
        {/* Invisible Spacer */}
        <div
          className="invisible"
          style={{ width: "100%", paddingLeft: `${fromPct}%` }}
        >
          <div className="pl-8 flex flex-col items-start w-max max-w-[250px]">
            <div className="text-[11px] mb-1 px-2 border">{step.label}</div>
            {step.body && (
              <div className="p-2 text-[11px] font-mono whitespace-pre">
                {step.body}
              </div>
            )}
          </div>
        </div>

        {/* Absolute Content */}
        <div
          className="absolute top-2 bottom-2 flex flex-col items-start z-10"
          style={{ left: `${fromPct}%`, width: `calc(100% - ${fromPct}%)` }}
        >
          {/* Self-loop line */}
          <div
            className={cn(
              "absolute top-2 left-0 w-6 h-[calc(100%-8px)] border-t-2 border-b-2 border-r-2 rounded-r-xl z-0 transition-colors",
              lineClass,
              step.animated && "border-dashed animate-pulse",
            )}
          />

          {/* Arrow head */}
          <div
            className={cn(
              "absolute bottom-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 transform -rotate-45 -translate-x-[1px] translate-y-1/2",
              lineClass,
            )}
          />

          <div className="pl-10 flex flex-col items-start pt-0">
            <div className="text-[11px] font-semibold bg-white dark:bg-zinc-950 px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 rounded-md z-10 mb-2 shadow-sm text-zinc-900 dark:text-zinc-100">
              {step.label}
            </div>
            {step.body && (
              <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/80 rounded-md p-2.5 text-[11px] font-mono z-10 text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-all shadow-sm relative group-hover:border-primary/30 transition-colors w-max max-w-full">
                {step.body}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full py-2 flex items-start group">
      {/* Invisible Spacer to give row height */}
      <div className="invisible w-full flex flex-col items-center">
        <div className="text-[11px] px-2 border mb-1">{step.label}</div>
        {step.body && (
          <div className="p-2 text-[11px] font-mono whitespace-pre">
            {step.body}
          </div>
        )}
      </div>

      {/* Absolute Content */}
      <div
        className="absolute top-2 bottom-2 flex flex-col items-center z-10"
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      >
        <div className="text-[11px] font-semibold bg-white dark:bg-zinc-950 px-2.5 py-0.5 border border-zinc-200 dark:border-zinc-800 rounded-full z-10 mb-2 shadow-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
          {step.label}
        </div>

        {/* The line */}
        <div
          className={cn(
            "absolute top-3.5 left-0 right-0 h-[2px] z-0 flex items-center transition-colors",
            lineClass,
            step.animated && "animate-pulse", // simple animation
          )}
        >
          {/* Animated dashes using gradient trick */}
          {step.animated && (
            <div className="absolute inset-0 overflow-hidden">
              <div
                className={cn(
                  "w-[200%] h-full opacity-50",
                  isRight ? "animate-flow" : "animate-flow-reverse",
                )}
                style={{
                  background:
                    "repeating-linear-gradient(to right, transparent, transparent 5px, currentColor 5px, currentColor 10px)",
                }}
              />
            </div>
          )}
          {/* Base solid line if not animated heavily, or just let CSS borders do it */}
          {!step.animated && (
            <div className="absolute inset-0 bg-current opacity-80" />
          )}

          {/* Arrow Head */}
          {isRight ? (
            <div className="absolute right-0 w-2.5 h-2.5 border-t-2 border-r-2 transform rotate-45 translate-x-[1px]" />
          ) : (
            <div className="absolute left-0 w-2.5 h-2.5 border-t-2 border-l-2 transform -rotate-45 -translate-x-[1px]" />
          )}
        </div>

        {step.body && (
          <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/80 rounded-md p-2.5 text-[11px] font-mono z-10 text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-all shadow-sm relative mt-1 group-hover:border-primary/30 transition-colors text-left w-max max-w-[90%] mx-auto">
            {step.body}
          </div>
        )}
      </div>
    </div>
  );
}
