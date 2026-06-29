"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  RotateCcw,
  Clock,
  Users,
  ArrowRightLeft,
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

  const displayValue =
    value < 1
      ? count.toFixed(3)
      : value < 10
        ? count.toFixed(1)
        : Math.round(count);

  return (
    <div
      ref={ref}
      className="flex flex-col p-5 glass rounded-2xl relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-candy-blue/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="text-muted-foreground/80 text-xs font-semibold uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-3xl md:text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
          {displayValue}
        </div>
        <div className="text-sm text-primary font-medium">{unit}</div>
      </div>
      <div className="text-muted-foreground/60 text-xs leading-relaxed">{description}</div>
    </div>
  );
}

function ThroughputChart() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              <stop offset="5%" stopColor="#b2d5e5" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#b2d5e5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,213,229,0.15)" vertical={false} />
          <XAxis
            dataKey="concurrency"
            stroke="rgba(148,163,184,0.5)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `C=${val}`}
            dy={10}
          />
          <YAxis
            stroke="rgba(148,163,184,0.5)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(178,213,229,0.2)', borderRadius: '8px', color: '#f0f0f5' }}
            itemStyle={{ color: '#b2d5e5', fontWeight: 600 }}
            labelStyle={{ color: 'rgba(240,240,245,0.5)', marginBottom: '4px' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [value, name === 'throughput' ? 'Requests / sec' : 'p99 Latency (ms)']}
            labelFormatter={(label) => `Concurrency: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="throughput"
            stroke="#b2d5e5"
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
    <div className="overflow-x-auto w-full mt-6 rounded-xl border border-border bg-muted/20">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground/80">
              Payload
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground/80">
              Plaintext
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground/80">
              Wire Size
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground/80">
              Overhead
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground/80">
              p50 Latency
            </th>
            <th className="py-3 px-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground/80">
              p99 Latency
            </th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {scaling.map((s: any, i: number) => (
            <tr
              key={i}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0"
            >
              <td className="py-3 px-4 text-sm font-semibold text-foreground/80">
                {s.label}
              </td>
              <td className="py-3 px-4 text-sm font-mono text-muted-foreground/80">
                {(s.plaintextBytes / 1024).toFixed(1)} KB
              </td>
              <td className="py-3 px-4 text-sm font-mono text-muted-foreground/80">
                {(s.wireBytes / 1024).toFixed(1)} KB
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-primary font-medium">
                    {s.wireOverheadRatio}x
                  </span>
                  <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60"
                      style={{
                        width: `${Math.min((s.wireOverheadRatio - 1) * 200, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                {s.roundTripMs.p50} ms
              </td>
              <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                {s.roundTripMs.p99} ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      className={`flex items-start gap-4 p-5 glass opacity-0 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "translate-y-8"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary mt-1">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-foreground/80 font-semibold mb-1">{title}</h4>
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-2xl font-bold text-foreground tracking-tight">{metric}</span>
          <span className="text-sm text-primary font-medium">{unit}</span>
        </div>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">{desc}</p>
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
      className="w-full py-24 relative overflow-hidden"
      id="performance"
    >
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-candy-blue/20 to-transparent" />
      <div className="absolute top-1/4 -right-64 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-64 w-96 h-96 bg-primary/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col gap-8">

        <div className="text-center mb-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold bg-primary/5 text-primary mb-5 backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5 mr-1" /> Performance & Scale
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Designed for the edge.
            <br className="hidden sm:block" />
            <span className="gradient-text">Built to be ignored.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Post-quantum cryptography sounds slow. We made it invisible. Nen
            sustains thousands of encrypted requests with sub-millisecond crypto
            overhead.
          </p>
        </div>

        {/* Big Container 1: Throughput & Scaling */}
        <div className="p-6 sm:p-10 glass-strong shadow-2xl rounded-3xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-foreground mb-3">Sustained Throughput</h3>
              <p className="text-muted-foreground/80 leading-relaxed mb-8">
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
        <div className="p-6 sm:p-10 glass-strong shadow-2xl rounded-3xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-4 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-foreground mb-3">Microsecond Overhead</h3>
              <p className="text-muted-foreground/80 leading-relaxed mb-8">
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
          <div className="p-6 sm:p-10 glass-strong shadow-2xl rounded-3xl">
            <div className="mb-8 max-w-2xl">
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Real-World Scenarios
              </h3>
              <p className="text-muted-foreground/80 leading-relaxed">
                We don&apos;t just benchmark simple loops. We evaluate Nen against demanding application patterns like session churn, connection bursts, and extended lifetime sessions to ensure stability.
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

        <div className="mt-8 text-center text-xs text-muted-foreground/60 font-mono">
          Measured on: {data.env.platform} • Node {data.env.node} •{" "}
          {data.env.cpus} CPUs • dev-server (single instance)
        </div>
      </div>
    </section>
  );
}
