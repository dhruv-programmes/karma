export default function AiHome() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Carbon Loop AI</h1>
      <p>Document extract / chat + Karma support agent (port 8001).</p>
      <ul>
        <li>POST /api/documents/extract</li>
        <li>POST /api/documents/chat</li>
        <li>POST /api/documents/confirm</li>
        <li>POST /api/support/chat — UIMessage stream (useChat) + tools</li>
      </ul>
    </main>
  );
}
