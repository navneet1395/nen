"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  RotateCcw,
  Clock,
  Users,
  ArrowRightLeft,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import data from "@/data/bench-data.json";

// Hook for animating numbers
function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "50px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(start + (end - start) * easeProgress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration, start]);

  return { count, ref };
}

function StatCard({
  title,
  value,
  unit,
  description,
}: {
  title: string;
  value: number;
  unit: string;
  description: string;
}) {
  const { count, ref } = useCountUp(value);

  // Format based on magnitude
  const displayValue =
    value < 1
      ? count.toFixed(3)
      : value < 10
        ? count.toFixed(1)
        : Math.round(count);

  return (
    <div
      ref={ref}
      className="flex flex-col p-5 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm dark:shadow-md relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
          {displayValue}
        </div>
        <div className="text-sm text-primary font-medium">{unit}</div>
      </div>
      <div className="text-zinc-600 dark:text-zinc-500 text-xs leading-relaxed">{description}</div>
    </div>
  );
}

function ThroughputChart() {
  const levels = data.loadtest.levels.map((l: any) => ({
    concurrency: l.concurrency,
    throughput: l.throughputReqPerSec,
    p99: l.latencyMs.p99
  }));

  return (
    <div className="h-[250px] sm:h-[300px] w-full mt-6" style={{ minWidth: "100%" }}>
      <ResponsiveContainer width="99%" height="100%">
        <AreaChart data={levels} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#a1a1aa" strokeOpacity={0.3} vertical={false} />
          <XAxis 
            dataKey="concurrency" 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => `C=${val}`} 
            dy={10}
          />
          <YAxis 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
            formatter={(value: any, name: any) => [value, name === 'throughput' ? 'Requests / sec' : 'p99 Latency (ms)']}
            labelFormatter={(label) => `Concurrency: ${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="throughput" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorThroughput)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function OverheadTable() {
  const scaling = data.profile.payloadScaling;

  return (
    <div className="overflow-x-auto w-full mt-6 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/30 dark:bg-zinc-900/30">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Payload
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Plaintext
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Wire Size
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Overhead
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              p50 Latency
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              p99 Latency
            </th>
          </tr>
        </thead>
        <tbody>
          {scaling.map((s: any, i: number) => (
            <tr
              key={i}
              className="border-b border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors last:border-0"
            >
              <td className="py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-200">
                {s.label}
              </td>
              <td className="py-3 px-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                {(s.plaintextBytes / 1024).toFixed(1)} KB
              </td>
              <td className="py-3 px-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                {(s.wireBytes / 1024).toFixed(1)} KB
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-primary font-medium">
                    {s.wireOverheadRatio}x
                  </span>
                  <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/80"
                      style={{
                        width: `${Math.min((s.wireOverheadRatio - 1) * 200, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm font-mono text-zinc-700 dark:text-zinc-300">
                {s.roundTripMs.p50} ms
              </td>
              <td className="py-3 px-4 text-sm font-mono text-zinc-700 dark:text-zinc-300">
                {s.roundTripMs.p99} ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioCard({ icon: Icon, title, metric, unit, desc, delay }: any) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "50px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex items-start gap-4 p-5 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm dark:shadow-md opacity-0 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "translate-y-8"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-1">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-zinc-900 dark:text-zinc-200 font-semibold mb-1">{title}</h4>
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{metric}</span>
          <span className="text-sm text-primary font-medium">{unit}</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export function BenchmarksDashboard() {
  const peak = data.loadtest.peakThroughput;
  const prof = data.profile;
  const scen = data.scenarios;

  return (
    <section
      className="w-full py-24 relative border-t border-border/40 overflow-hidden"
      id="performance"
    >
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute top-1/4 -right-64 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-64 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col gap-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-primary/20 bg-primary/10 text-primary mb-4">
            <Activity className="w-3.5 h-3.5 mr-1" /> Performance & Scale
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-zinc-900 dark:text-foreground">
            Designed for the edge.
            <br className="hidden sm:block" />
            <span className="text-zinc-500">Built to be ignored.</span>
          </h2>
          <p className="text-zinc-600 dark:text-muted-foreground max-w-2xl mx-auto text-lg">
            Post-quantum cryptography sounds slow. We made it invisible. Nen
            sustains thousands of encrypted requests with sub-millisecond crypto
            overhead.
          </p>
        </div>

        {/* Big Container 1: Throughput & Scaling */}
        <div className="p-6 sm:p-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">Sustained Throughput</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
                Nen is highly optimized for concurrent workloads. Built-in session caching and efficient key derivation means the server scales effortlessly across thousands of active connections without sacrificing latency.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  title="Peak Throughput"
                  value={peak.reqPerSec}
                  unit="req/s"
                  description={`At concurrency ${peak.concurrency} with 0% errors.`}
                />
                <StatCard
                  title="ML-KEM Handshake"
                  value={prof.handshakeMs}
                  unit="ms"
                  description="Initial key exchange latency."
                />
              </div>
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center min-w-0 w-full">
              <ThroughputChart />
            </div>
          </div>
        </div>

        {/* Big Container 2: Overhead & Profile */}
        <div className="p-6 sm:p-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-4 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">Microsecond Overhead</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
                By leveraging native bindings and optimized WebAssembly for ChaCha20-Poly1305, encrypting payloads takes fractions of a millisecond. Our wire format adds minimal base64 padding.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <StatCard
                  title="Crypto Engine"
                  value={prof.clientCryptoMsPerOp.p50}
                  unit="ms/op"
                  description="To encrypt & decrypt a typical payload."
                />
                <StatCard
                  title="Wire Size Inflation"
                  value={prof.payloadScaling[0].wireOverheadRatio}
                  unit="x"
                  description="For a base64 encoded 1KB JSON structure."
                />
              </div>
            </div>
            <div className="lg:col-span-8 flex flex-col justify-center min-w-0 w-full">
              <OverheadTable />
            </div>
          </div>
        </div>

        {/* Big Container 3: Stress Tests */}
        {scen && (
          <div className="p-6 sm:p-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl">
            <div className="mb-8 max-w-2xl">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                Real-World Scenarios
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We don't just benchmark simple loops. We evaluate Nen against demanding application patterns like session churn, connection bursts, and extended lifetime sessions to ensure stability.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <ScenarioCard
                icon={Users}
                title="Concurrent Handshakes"
                metric={scen.concurrentHandshakes.peak.throughputReqPerSec}
                unit="hs/s"
                desc={`Sustained ML-KEM-768 handshakes per sec during peak burst (C=${scen.concurrentHandshakes.peak.concurrency}).`}
                delay={0}
              />
              <ScenarioCard
                icon={RotateCcw}
                title="Key Rotation"
                metric={scen.keyRotation.rotationLatencyMs.p50}
                unit="ms"
                desc={`p50 latency to renegotiate keys mid-session while under load. Normal requests stayed at ${scen.keyRotation.normalLatencyMs.p50}ms.`}
                delay={100}
              />
              <ScenarioCard
                icon={Clock}
                title="Long-Lived Sessions"
                metric={scen.longLivedSession.latencyDrift.driftMs}
                unit="ms drift"
                desc={`Negligible latency drift over ${scen.longLivedSession.durationSec}s session (${scen.longLivedSession.totalRequests} reqs). Growth: ${scen.longLivedSession.memoryGrowthMB}MB.`}
                delay={200}
              />
              <ScenarioCard
                icon={ArrowRightLeft}
                title="Multi-User Burst"
                metric={scen.multiUserBurst.aggregateThroughput}
                unit="req/s"
                desc={`Aggregate throughput when ${Math.max(...scen.multiUserBurst.levels)} distinct users simultaneously execute full CRUD lifecycles.`}
                delay={300}
              />
              <ScenarioCard
                icon={RefreshCw}
                title="Session Churn"
                metric={scen.sessionChurn.sessionsPerSec}
                unit="sess/s"
                desc={`Sustained create/destroy cycles per second over ${scen.sessionChurn.totalSessions} sessions. ${scen.sessionChurn.errors} errors.`}
                delay={400}
              />
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-zinc-500 font-mono">
          Measured on: {data.env.platform} • Node {data.env.node} •{" "}
          {data.env.cpus} CPUs • dev-server (single instance)
        </div>
      </div>
    </section>
  );
}
