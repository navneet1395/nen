"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Unlock,
  Zap,
  ShieldCheck,
  Server,
  MonitorSmartphone,
  TerminalSquare,
  Play,
  RotateCcw,
} from "lucide-react";

export function InteractiveDemo() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customPayload, setCustomPayload] = useState(
    '{"balance": 1500.00, "user_id": "usr_99X"}',
  );
  const [kemLevel, setKemLevel] = useState("768");
  const [symmetricAlgo, setSymmetricAlgo] = useState("ChaCha20-Poly1305");
  const demoRef = useRef<HTMLDivElement>(null);

  const steps = [
    { label: "Initialize", desc: "Client generates ML-KEM & ML-DSA keypairs" },
    { label: "Handshake", desc: "Transmit PK & Signature to Server" },
    { label: "Encapsulate", desc: "Server creates Shared Secret & ciphertext" },
    {
      label: "Derive Keys",
      desc: "Derive AEAD Session Keys on Client & Server",
    },
    { label: "Secure Send", desc: "Encrypt and send custom payload" },
  ];

  const resetDemo = () => {
    setStep(0);
    setIsPlaying(false);
    setLogs([
      `[SYSTEM] Configured: ML-KEM-${kemLevel} + ${symmetricAlgo}. Ready to initiate handshake.`,
    ]);
  };

  // Generate deterministic-looking hash for ciphertext and session keys based on inputs
  const getMockCiphertext = () => {
    let hash = 0;
    const input = customPayload + kemLevel + symmetricAlgo;
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hex = Math.abs(hash).toString(16).padEnd(16, "f");
    return `CT_${kemLevel}_${hex.substring(0, 8).toUpperCase()}...[${symmetricAlgo == "ChaCha20-Poly1305" ? "AEAD" : "GCM"}]`;
  };

  const getMockSharedSecret = () => {
    let hash = 0;
    const input = kemLevel + symmetricAlgo + "secret";
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hex = Math.abs(hash).toString(16).padEnd(16, "a");
    return `SS_${hex.substring(0, 12).toUpperCase()}`;
  };

  const getEncryptedPayload = () => {
    let result = "";
    for (let i = 0; i < customPayload.length; i++) {
      const charCode = customPayload.charCodeAt(i) ^ 0x42; // simple mock XOR encryption
      result += charCode.toString(16).padStart(2, "0");
    }
    return result.substring(0, 24).toUpperCase() + "...[ENC]";
  };

  const addLog = (msg: string) => {
    setLogs((prev) => {
      const newLogs = [
        ...prev,
        `[${new Date().toISOString().substring(11, 23)}] ${msg}`,
      ];
      return newLogs.slice(-6); // Keep last 6 logs
    });
  };

  const runHandshake = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    // Step 0 -> 1: Initialization
    setStep(1);
    addLog(`[CLIENT] Initiating ML-KEM-${kemLevel} Key Generation...`);
    await new Promise((r) => setTimeout(r, 800));
    addLog(`[CLIENT] Generated Public/Private Keypair (ML-KEM-${kemLevel}).`);
    addLog(`[CLIENT] Signed Public Key with ML-DSA identity key.`);

    // Step 1 -> 2: Handshake (Network Transmit)
    await new Promise((r) => setTimeout(r, 1000));
    setStep(2);
    addLog(
      `[NETWORK] POST /api/nen/handshake - Transmitting Client Public Key.`,
    );
    addLog(
      `[NETWORK] Payload: { pk_len: ${kemLevel === "512" ? 800 : kemLevel === "768" ? 1184 : 1568}B, algo: "ML-KEM-${kemLevel}" }`,
    );

    // Step 2 -> 3: Encapsulate
    await new Promise((r) => setTimeout(r, 1200));
    setStep(3);
    addLog(`[SERVER] Verified ML-DSA Identity Signature.`);
    addLog(`[SERVER] Generating Ephemeral Shared Secret...`);
    await new Promise((r) => setTimeout(r, 600));
    addLog(`[SERVER] Encapsulated Shared Secret. Ciphertext generated.`);
    addLog(`[NETWORK] Returning Ciphertext payload back to Client.`);

    // Step 3 -> 4: Derive Keys
    await new Promise((r) => setTimeout(r, 1200));
    setStep(4);
    addLog(`[CLIENT] Decapsulating server response...`);
    await new Promise((r) => setTimeout(r, 600));
    addLog(
      `[CLIENT] Decapsulation successful. Both sides derived identical Shared Secret.`,
    );
    addLog(`[SYSTEM] Derived ${symmetricAlgo} Symmetrical Session Keys.`);

    // Step 4 -> 5: Secure Send (Payload Transmission)
    await new Promise((r) => setTimeout(r, 1200));
    setStep(5);
    addLog(
      `[CLIENT] Encrypting payload with derived ${symmetricAlgo} session key.`,
    );
    addLog(`[NETWORK] Sending encrypted payload: ${getEncryptedPayload()}`);
    await new Promise((r) => setTimeout(r, 800));
    addLog(`[SERVER] Symmetrically decrypted payload.`);
    addLog(`[SERVER] Received verified plaintext: ${customPayload}`);

    setIsPlaying(false);
  };

  useEffect(() => {
    setLogs([
      `[SYSTEM] Configured: ML-KEM-${kemLevel} + ${symmetricAlgo}. Ready to initiate handshake.`,
    ]);
  }, [kemLevel, symmetricAlgo]);

  return (
    <Card
      ref={demoRef}
      className="w-full  mx-auto shadow-2xl border-border bg-background/50 backdrop-blur-md overflow-hidden flex flex-col relative"
    >
      <CardHeader className="border-b bg-muted/10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Zap className="h-5 w-5 text-primary" />
              Cryptographic Dashboard
            </CardTitle>
            <CardDescription className="mt-1.5">
              Interactive Post-Quantum Key Exchange & Payload Encryption
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>
      </CardHeader>

      {/* Interactive Controls Panel */}
      <div className="p-5 border-b bg-muted/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-sm">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Plaintext Payload to Encrypt
          </label>
          <input
            type="text"
            value={customPayload}
            disabled={isPlaying}
            onChange={(e) => setCustomPayload(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            placeholder='{"data": "secure message"}'
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            ML-KEM Level
          </label>
          <select
            value={kemLevel}
            disabled={isPlaying}
            onChange={(e) => setKemLevel(e.target.value)}
            className="w-full bg-background border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="512">ML-KEM-512 (Fast)</option>
            <option value="768">ML-KEM-768 (Standard)</option>
            <option value="1024">ML-KEM-1024 (Paranoid)</option>
          </select>
        </div>

        <div className="flex gap-2 relative">
          {!isPlaying && step === 0 && (
            <div className="absolute -top-8 left-0 right-0 text-center animate-bounce">
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                Click Start to run demo 👇
              </span>
            </div>
          )}
          <Button
            onClick={runHandshake}
            disabled={isPlaying}
            size="sm"
            className={`flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 shadow-md ${!isPlaying && step === 0 ? "animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          >
            <Play className="w-3.5 h-3.5" /> Start
          </Button>
          <Button
            variant="outline"
            onClick={resetDemo}
            disabled={isPlaying}
            size="sm"
            className="px-2 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-0 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 p-6 items-stretch bg-gradient-to-b from-transparent to-muted/5 relative">
          {/* Client Side Panel */}
          <div
            className={
              "flex flex-col border rounded-xl bg-background/80 shadow-sm transition-all duration-500 overflow-hidden " +
              (step >= 1
                ? "ring-2 ring-primary/50 border-primary/20"
                : "border-border/50")
            }
          >
            <div className="bg-muted/30 p-3 border-b flex items-center gap-2 font-medium text-sm">
              <MonitorSmartphone className="w-4 h-4 text-primary" />
              Client Edge
            </div>
            <div className="p-4 space-y-3 min-h-[200px] flex flex-col justify-center">
              {step >= 1 ? (
                <div className="space-y-2.5 text-xs font-mono">
                  <div>
                    <div className="flex justify-between items-center text-muted-foreground mb-1">
                      <span>Kyber Public Key</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {kemLevel === "512"
                          ? "800"
                          : kemLevel === "768"
                            ? "1184"
                            : "1568"}{" "}
                        bytes
                      </span>
                    </div>
                    <div className="break-all text-emerald-400 bg-zinc-950 p-2 rounded border border-zinc-800 shadow-inner">
                      PK_{kemLevel}_A7F2B9...[TRUNCATED]
                    </div>
                  </div>

                  {step >= 4 && (
                    <div>
                      <div className="flex justify-between items-center text-muted-foreground mb-1">
                        <span>Derived Session Key</span>
                      </div>
                      <div className="break-all text-blue-400 bg-zinc-950 p-2 rounded border border-zinc-800 shadow-inner font-bold">
                        {getMockSharedSecret()}
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="animate-pulse">
                      <div className="flex justify-between items-center text-muted-foreground mb-1">
                        <span>Encrypting & Sending...</span>
                      </div>
                      <div className="break-all text-orange-400 bg-zinc-950 p-2 rounded border border-zinc-800 shadow-inner">
                        {getEncryptedPayload()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-4">
                  <Unlock className="w-8 h-8 mb-2" />
                  <span className="text-sm">Awaiting Key Generation</span>
                </div>
              )}
            </div>
          </div>

          {/* Network Visualization */}
          <div className="flex flex-col items-center justify-center py-4 md:py-0 w-full md:w-32 relative min-h-[60px]">
            <div className="hidden md:block h-0.5 w-full bg-border absolute top-1/2 -translate-y-1/2 z-0"></div>

            {step === 2 && (
              <div className="absolute top-1/2 -translate-y-1/2 z-10 flex w-full justify-center">
                <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shadow-md shadow-primary/30 animate-pulse">
                  &rarr; HANDSHAKE
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="absolute top-1/2 -translate-y-1/2 z-10 flex w-full justify-center">
                <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shadow-md shadow-primary/30 animate-pulse">
                  &larr; CIPHERTEXT
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="absolute top-1/2 -translate-y-1/2 z-10 flex w-full justify-center">
                <div className="bg-orange-600 text-white px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shadow-md shadow-orange-950 animate-pulse">
                  &rarr; ENCRYPTED DATA
                </div>
              </div>
            )}

            {/* <div className={"z-10 rounded-full p-2 transition-colors duration-500 bg-background border " + (step >= 4 ? 'border-green-500 text-green-500' : 'border-muted-foreground text-muted-foreground')}>
                <ShieldCheck className="w-6 h-6" />
             </div> */}
          </div>

          {/* Server Side Panel */}
          <div
            className={
              "flex flex-col border rounded-xl bg-background/80 shadow-sm transition-all duration-500 overflow-hidden " +
              (step >= 3
                ? "ring-2 ring-primary/50 border-primary/20"
                : "border-border/50")
            }
          >
            <div className="bg-muted/30 p-3 border-b flex items-center gap-2 font-medium text-sm">
              <Server className="w-4 h-4 text-primary" />
              Nen Middleware
            </div>
            <div className="p-4 space-y-3 min-h-[200px] flex flex-col justify-center">
              {step >= 3 ? (
                <div className="space-y-2.5 text-xs font-mono">
                  <div>
                    <div className="flex justify-between items-center text-muted-foreground mb-1">
                      <span>Server Symmetrical Key</span>
                    </div>
                    <div className="break-all text-blue-400 bg-zinc-950 p-2 rounded border border-zinc-800 shadow-inner font-bold">
                      {step >= 4 ? getMockSharedSecret() : "DERIVING..."}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-muted-foreground mb-1">
                      <span>Server Ciphertext</span>
                    </div>
                    <div className="break-all text-emerald-400 bg-zinc-950 p-2 rounded border border-zinc-800 shadow-inner">
                      {getMockCiphertext()}
                    </div>
                  </div>

                  {step === 5 && (
                    <div className="animate-fade-in">
                      <div className="flex justify-between items-center text-muted-foreground mb-1">
                        <span>Decrypted Plaintext</span>
                      </div>
                      <div className="break-all text-green-400 bg-zinc-950/80 p-2 rounded border border-green-900/30 shadow-inner font-semibold">
                        {customPayload}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-4">
                  <Lock className="w-8 h-8 mb-2" />
                  <span className="text-sm">Awaiting Handshake</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Faux Terminal Logs */}
        <div className="bg-muted/30 p-4 font-mono text-xs border-t min-h-[140px] flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground pb-2 border-b border-border/50">
            <TerminalSquare className="w-4 h-4" />
            <span>nen-engine.log</span>
          </div>
          <div className="space-y-1 overflow-hidden">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes("[SYSTEM]")
                    ? "text-primary/95 font-semibold"
                    : log.includes("[SERVER]")
                      ? "text-emerald-600 dark:text-emerald-400"
                      : log.includes("[CLIENT]")
                        ? "text-blue-600 dark:text-blue-400"
                        : log.includes("[NETWORK]")
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-zinc-700 dark:text-zinc-300"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
