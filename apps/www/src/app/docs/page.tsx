export default function IntroductionPage() {
  return (
    <>
      <h1>Introduction</h1>
      <p className="lead">
        Isogeny is a Post-Quantum Cryptography (PQC) middleware and SDK built specifically for modern serverless architectures like Next.js.
      </p>

      <h2>The Problem</h2>
      <p>
        Traditional End-to-End Encryption (E2EE) relies on RSA or Elliptic Curve Cryptography (ECC) to exchange symmetric keys securely over the internet. However, with the rapid advancement of quantum computing, these classical algorithms are fundamentally compromised. 
      </p>
      <p>
        To make matters worse, most existing cryptographic libraries require compiled C/C++ bindings, which fail instantly in edge and serverless environments.
      </p>

      <h2>The Solution</h2>
      <p>
        Isogeny solves this by packaging the <strong>FIPS-203 standard ML-KEM (Kyber-768)</strong> into a pure WebAssembly module that runs natively in the browser, Node.js, and Vercel Edge functions. 
      </p>

      <h3>Core Features</h3>
      <ul>
        <li><strong>Post-Quantum Key Exchange:</strong> ML-KEM 768 handshakes generated natively in WebAssembly.</li>
        <li><strong>Perfect Forward Secrecy:</strong> Session keys are kept in memory and rotated automatically.</li>
        <li><strong>Serverless Ready:</strong> Zero native dependencies. Guaranteed to compile in Next.js.</li>
        <li><strong>Developer Experience:</strong> The <code>withIsogeny</code> wrapper makes your API routes secure with zero cryptographic boilerplate.</li>
      </ul>
    </>
  );
}
