export default function AdvancedPage() {
  return (
    <>
      <h1>Advanced APIs</h1>
      <p className="lead">
        Isogeny provides explicit lifecycle hooks for managing the Post-Quantum Shared Secret, enabling Perfect Forward Secrecy and robust error recovery.
      </p>

      <h2>Session Status & Heartbeats</h2>
      <p>
        Check if the server still holds the symmetric key for your session in its volatile memory.
      </p>

      <pre className="bg-foreground text-background p-4 rounded-xl overflow-x-auto">
        <code>{`const isAlive = await client.status();
if (!isAlive) {
  console.log("Session expired. Please re-authenticate.");
}`}</code>
      </pre>

      <h2>Explicit Termination</h2>
      <p>
        If a user logs out, you should immediately destroy the encryption key on the server.
      </p>

      <pre className="bg-foreground text-background p-4 rounded-xl overflow-x-auto">
        <code>{`await client.terminate();
// The key is completely purged from server RAM.`}</code>
      </pre>

      <h2>Auto-Rotation & Recovery</h2>
      <p>
        By default, the Next.js server stores sessions in memory. If the server restarts or a session times out, the key is lost. 
      </p>
      <p>
        You do not have to write custom logic for this! When <code>client.pqcfetch()</code> detects an HTTP 401 Unauthorized (Expired Session), it automatically intercepts the request, executes a new background Kyber-768 handshake (<code>rotate()</code>), and seamlessly retries your fetch. 
      </p>
    </>
  );
}
