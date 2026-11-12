import { useState, useRef, useEffect } from "react";

export default function App() {
  const [niveau, setNiveau] = useState("Seconde");
  const [serie, setSerie] = useState("Scientifique");
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [attente, setAttente] = useState(false);
  const bas = useRef(null);

  useEffect(() => { bas.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, attente]);

  async function envoyer(e) {
    e.preventDefault();
    const question = texte.trim();
    if (!question || attente) return;
    const suite = [...messages, { role: "user", content: question }];
    setMessages(suite);
    setTexte("");
    setAttente(true);
    try {
      const rep = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: suite, niveau, serie }),
      });
      const data = await rep.json();
      if (!rep.ok) throw new Error(data.error || "Erreur");
      setMessages([...suite, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...suite, { role: "assistant", content: "Je n'ai pas pu répondre. Vérifie ta connexion et réessaie." }]);
    }
    setAttente(false);
  }

  return (
    <div className="app">
      <header>
        <h1>Parlons <span>IA</span></h1>
        <div className="choix">
          <select value={niveau} onChange={(e) => setNiveau(e.target.value)} aria-label="Niveau">
            <option>Seconde</option><option>Première</option><option>Terminale</option>
          </select>
          <select value={serie} onChange={(e) => setSerie(e.target.value)} aria-label="Série">
            <option>Scientifique</option><option>Littéraire</option>
          </select>
        </div>
      </header>
      <div className="messages">
        {messages.length === 0 && <p className="vide">Pose ta question de cours ou d'exercice.</p>}
        {messages.map((m, i) => (
          <div key={i} className={"msg " + (m.role === "user" ? "moi" : "ia")}>{m.content}</div>
        ))}
        {attente && <div className="msg ia">Je réfléchis…</div>}
        <div ref={bas} />
      </div>
      <form onSubmit={envoyer}>
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écris ta question" />
        <button disabled={attente}>Envoyer</button>
      </form>
    </div>
  );
}
