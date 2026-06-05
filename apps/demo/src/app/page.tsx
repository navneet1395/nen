'use client';

import { useState, useEffect } from 'react';
import { IsogenyClient } from '@isogeny/client';

export default function Home() {
  const [client, setClient] = useState<IsogenyClient | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Top Secret Quantum Data');

  useEffect(() => {
    // Initialize the Isogeny Wasm Client
    const initIsogeny = async () => {
      try {
        const isogeny = new IsogenyClient(''); // empty string means relative to current host
        setClient(isogeny);
        addLog('Wasm Core Initialized successfully.');
      } catch (err: any) {
        addLog(`Error initializing Wasm: ${err.message}`);
      }
    };
    initIsogeny();
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const performHandshake = async () => {
    if (!client) return;
    setIsLoading(true);
    addLog('Generating ML-KEM-768 Keypair...');
    try {
      await client.handshake();
      addLog('Handshake Complete! Shared secret securely established via Kyber encapsulation.');
    } catch (err: any) {
      addLog(`Handshake failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendEncryptedData = async () => {
    if (!client) return;
    setIsLoading(true);
    addLog(`Encrypting data with ChaCha20-Poly1305: "${message}"`);
    try {
      // Use the drop-in fetch replacement
      const result = await client.pqcfetch('/api/secure-data', {
        method: 'POST',
        body: JSON.stringify({ secretInfo: message }),
      });
      addLog(`Received & Decrypted Server Response: ${JSON.stringify(result, null, 2)}`);
    } catch (err: any) {
      addLog(`Request failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 font-sans selection:bg-purple-500 selection:text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center pt-10">
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-4 tracking-tight drop-shadow-sm">
            Isogeny PQC Bridge
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            A frictionless Post-Quantum Cryptography SDK. Securing your Next.js and API endpoints with ML-KEM (Kyber) and ChaCha20, fully compiled to WebAssembly.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl transition-all duration-300 hover:border-purple-500/50 hover:shadow-purple-900/20">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-100">
              <span className="bg-purple-500/20 text-purple-400 p-2 rounded-lg mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </span>
              Security Workflow
            </h2>
            
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-400 mb-3">Step 1: Exchange Post-Quantum Keys</p>
                <button
                  onClick={performHandshake}
                  disabled={isLoading || !client}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl shadow-lg transform transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  {isLoading ? 'Processing...' : '1. Perform Kyber Handshake'}
                </button>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-3">Step 2: Send Encrypted Data</p>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 mb-4 text-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder-gray-600"
                  placeholder="Enter message to encrypt..."
                />
                <button
                  onClick={sendEncryptedData}
                  disabled={isLoading || !client}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl border border-gray-700 hover:border-gray-600 shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  2. Send via pqcfetch()
                </button>
              </div>
            </div>
          </div>

          {/* Terminal Logs Panel */}
          <div className="bg-black border border-gray-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600 opacity-50"></div>
            <div className="flex items-center mb-4 pb-4 border-b border-gray-800/50">
              <div className="flex space-x-2 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider">Isogeny Terminal Output</h2>
            </div>
            
            <div className="h-[350px] overflow-y-auto font-mono text-sm space-y-3 custom-scrollbar pr-2">
              {logs.length === 0 ? (
                <p className="text-gray-600 italic">Waiting for operations...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-emerald-400 break-words leading-relaxed animate-fade-in-up">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add custom scrollbar and simple animations in a global style for convenience */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}} />
    </main>
  );
}
