export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Méthode non autorisée" }, { status: 405 });

  const cle = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!cle) return Response.json({ error: "Clé API manquante" }, { status: 500 });

  let corps;
  try { corps = await req.json(); } catch { return Response.json({ error: "Requête invalide" }, { status: 400 }); }

  const messages = (Array.isArray(corps.messages) ? corps.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user")
    return Response.json({ error: "Message manquant" }, { status: 400 });

  const niveau = ["Seconde", "Première", "Terminale"].includes(corps.niveau) ? corps.niveau : "Seconde";
  const serie = ["Scientifique", "Littéraire"].includes(corps.serie) ? corps.serie : "Scientifique";

  const system = `Tu es Parlons IA, l'assistant scolaire de la plateforme Parlons Études, pour les lycéens du Sénégal.
L'élève est en ${niveau}, série ${serie}. Suis les programmes scolaires sénégalais.
Règles :
- Explique étape par étape, avec un vocabulaire adapté à son niveau et des exemples.
- Pour un exercice, explique le raisonnement au lieu de donner seulement le résultat.
- Termine souvent par une courte question pour vérifier la compréhension.
- Si tu n'es pas sûr d'une réponse ou d'un point du programme, dis-le clairement.
- Réponds uniquement sur les études et la scolarité, avec bienveillance et en français clair.`;

  const rep = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Netlify.env.get("CLAUDE_MODEL") || "claude-sonnet-5-5",
      max_tokens: 800,
      system,
      messages,
    }),
  });
  if (!rep.ok) return Response.json({ error: "Erreur du service IA" }, { status: 502 });

  const data = await rep.json();
  const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return Response.json({ reply });
};

export const config = { path: "/api/chat" };
