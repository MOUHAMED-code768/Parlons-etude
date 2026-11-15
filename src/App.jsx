import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [onglet, setOnglet] = useState("groupes");
  const [groupe, setGroupe] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <p className="vide">Chargement…</p>;
  if (!session) return <Auth />;
  const user = session.user;

  return (
    <div className="app">
      <header>
        <h1>Parlons <span>Études</span></h1>
        <button className="lien" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
      </header>
      <main>
        {onglet === "groupes" &&
          (groupe ? <Chat groupe={groupe} user={user} retour={() => setGroupe(null)} /> : <Groupes user={user} ouvrir={setGroupe} />)}
        {onglet === "ia" && <IA session={session} />}
      </main>
      <nav>
        <button className={onglet === "groupes" ? "on" : ""} onClick={() => { setOnglet("groupes"); setGroupe(null); }}>Groupes</button>
        <button className={onglet === "ia" ? "on" : ""} onClick={() => setOnglet("ia")}>Parlons IA</button>
      </nav>
    </div>
  );
}

function Auth() {
  const [mode, setMode] = useState("connexion");
  const [f, setF] = useState({ email: "", password: "", username: "", full_name: "", niveau: "Seconde", serie: "Scientifique" });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const inscription = mode === "inscription";

  async function envoyer(e) {
    e.preventDefault();
    setMsg("");
    const { email, password, ...profil } = f;
    const { error } = inscription
      ? await supabase.auth.signUp({ email, password, options: { data: profil } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else if (inscription) setMsg("Compte créé ! Si on te demande de confirmer ton e-mail, fais-le, puis connecte-toi.");
  }

  return (
    <div className="app">
      <header><h1>Parlons <span>Études</span></h1></header>
      <form className="carte" onSubmit={envoyer}>
        <h2>{inscription ? "Créer mon compte" : "Connexion"}</h2>
        {inscription && (
          <>
            <input placeholder="Nom et prénom" value={f.full_name} onChange={set("full_name")} required />
            <input placeholder="Nom d’utilisateur" value={f.username} onChange={set("username")} required />
            <select value={f.niveau} onChange={set("niveau")}>
              <option>Seconde</option><option>Première</option><option>Terminale</option>
            </select>
            <select value={f.serie} onChange={set("serie")}>
              <option>Scientifique</option><option>Littéraire</option>
            </select>
          </>
        )}
        <input type="email" placeholder="Adresse e-mail" value={f.email} onChange={set("email")} required />
        <input type="password" placeholder="Mot de passe (6 caractères minimum)" minLength={6} value={f.password} onChange={set("password")} required />
        <button>{inscription ? "Créer mon compte" : "Me connecter"}</button>
        {msg && <p className="info">{msg}</p>}
        <button type="button" className="lien" onClick={() => setMode(inscription ? "connexion" : "inscription")}>
          {inscription ? "J’ai déjà un compte" : "Pas de compte ? S’inscrire"}
        </button>
      </form>
    </div>
  );
}

function Groupes({ user, ouvrir }) {
  const [liste, setListe] = useState([]);
  const [miens, setMiens] = useState([]);
  const [nom, setNom] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("public");
  const [msg, setMsg] = useState("");

  async function charger() {
    const { data: g } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    const { data: m } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    setListe(g || []);
    setMiens((m || []).map((x) => x.group_id));
  }
  useEffect(() => { charger(); }, []);

  async function creer(e) {
    e.preventDefault();
    const { error } = await supabase.from("groups").insert({ name: nom.trim(), description: desc.trim() || null, type });
    if (error) return setMsg(error.message);
    setNom(""); setDesc(""); setMsg("");
    charger();
  }
  async function rejoindre(g) {
    const { error } = await supabase.from("group_members").insert({ group_id: g.id, user_id: user.id, role: "member" });
    if (error) return setMsg(error.message);
    ouvrir(g);
  }

  return (
    <div className="page">
      <form className="carte" onSubmit={creer}>
        <h2>Créer un groupe</h2>
        <input placeholder="Nom du groupe (ex. Maths Seconde S)" value={nom} onChange={(e) => setNom(e.target.value)} minLength={2} maxLength={60} required />
        <input placeholder="Description (facultatif)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="public">Public : tout le monde peut rejoindre</option>
          <option value="prive">Privé : sur invitation</option>
        </select>
        <button>Créer</button>
        {msg && <p className="info">{msg}</p>}
      </form>
      <h2>Les groupes</h2>
      {liste.length === 0 && <p className="vide">Aucun groupe pour l’instant. Crée le premier !</p>}
      {liste.map((g) => (
        <div className="carte rang" key={g.id}>
          <div>
            <strong>{g.name}</strong><br />
            <small>{g.type === "public" ? "Public" : "Privé"}{g.description ? " · " + g.description : ""}</small>
          </div>
          {miens.includes(g.id)
            ? <button onClick={() => ouvrir(g)}>Ouvrir</button>
            : <button onClick={() => rejoindre(g)}>Rejoindre</button>}
        </div>
      ))}
    </div>
  );
}

const TYPES_FICHIERS = [
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function Chat({ groupe, user, retour }) {
  const [msgs, setMsgs] = useState([]);
  const [urls, setUrls] = useState({});
  const [texte, setTexte] = useState("");
  const [rec, setRec] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const fichierRef = useRef(null);
  const bas = useRef(null);

  async function charger() {
    const { data } = await supabase.from("messages").select("*, profiles(username)").eq("group_id", groupe.id).order("created_at").limit(200);
    const liste = data || [];
    setMsgs(liste);
    const o = {};
    for (const [bucket, champ] of [["audios", "audio_path"], ["fichiers", "file_path"]]) {
      const chemins = liste.filter((m) => m[champ]).map((m) => m[champ]);
      if (!chemins.length) continue;
      const { data: s } = await supabase.storage.from(bucket).createSignedUrls(chemins, 3600);
      (s || []).forEach((x) => { if (x.signedUrl) o[x.path] = x.signedUrl; });
    }
    setUrls(o);
  }

  useEffect(() => {
    charger();
    const canal = supabase.channel("groupe-" + groupe.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "group_id=eq." + groupe.id }, charger)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [groupe.id]);

  useEffect(() => { bas.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function envoyer(e) {
    e.preventDefault();
    const b = texte.trim();
    if (!b) return;
    setTexte("");
    await supabase.from("messages").insert({ group_id: groupe.id, kind: "texte", body: b });
    charger();
  }

  async function enregistrer() {
    if (rec) { rec.stop(); return; }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(flux);
      const morceaux = [];
      const debut = Date.now();
      r.ondataavailable = (e) => morceaux.push(e.data);
      r.onstop = async () => {
        flux.getTracks().forEach((t) => t.stop());
        setRec(null);
        const type = r.mimeType || "audio/mp4";
        const ext = type.includes("webm") ? "webm" : type.includes("ogg") ? "ogg" : "m4a";
        const duree = Math.min(120, Math.max(1, Math.round((Date.now() - debut) / 1000)));
        const chemin = groupe.id + "/" + user.id + "-" + Date.now() + "." + ext;
        const up = await supabase.storage.from("audios").upload(chemin, new Blob(morceaux, { type }), { contentType: type });
        if (up.error) return alert("Envoi impossible : " + up.error.message);
        await supabase.from("messages").insert({ group_id: groupe.id, kind: "audio", audio_path: chemin, duration_seconds: duree });
        charger();
      };
      r.start();
      setRec(r);
      setTimeout(() => { if (r.state === "recording") r.stop(); }, 120000);
    } catch {
      alert("Autorise le micro pour envoyer un message vocal.");
    }
  }

  async function joindre(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!TYPES_FICHIERS.includes(f.type)) return alert("Format non accepté. Choisis une image (JPG, PNG, WebP), un PDF ou un document Word (.docx).");
    if (f.size > 5 * 1024 * 1024) return alert("Fichier trop lourd (5 Mo maximum).");
    setEnvoi(true);
    const propre = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const chemin = groupe.id + "/" + user.id + "-" + Date.now() + "-" + propre;
    const up = await supabase.storage.from("fichiers").upload(chemin, f, { contentType: f.type });
    if (up.error) { setEnvoi(false); return alert("Envoi impossible : " + up.error.message); }
    await supabase.from("messages").insert({ group_id: groupe.id, kind: "fichier", file_path: chemin, file_name: f.name.slice(0, 120), file_type: f.type, file_size: f.size });
    setEnvoi(false);
    charger();
  }

  async function signaler(m) {
    const raison = prompt("Pourquoi signales-tu ce message ?");
    if (raison === null) return;
    const { error } = await supabase.from("reports").insert({ message_id: m.id, reason: raison });
    alert(error ? "Signalement impossible." : "Merci, ton signalement a été envoyé.");
  }

  async function supprimer(m) {
    await supabase.from("messages").delete().eq("id", m.id);
    if (m.audio_path) await supabase.storage.from("audios").remove([m.audio_path]);
    if (m.file_path) await supabase.storage.from("fichiers").remove([m.file_path]);
    charger();
  }

  function contenu(m) {
    if (m.kind === "audio") return urls[m.audio_path] ? <audio controls src={urls[m.audio_path]} /> : "Audio…";
    if (m.kind === "fichier") {
      const u = urls[m.file_path];
      if (!u) return "Fichier…";
      if (m.file_type && m.file_type.startsWith("image/"))
        return <a href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt={m.file_name} style={{ maxWidth: "100%", borderRadius: 12, display: "block" }} /></a>;
      return <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 600 }}>📄 {m.file_name} ({Math.max(1, Math.round((m.file_size || 0) / 1024))} Ko)</a>;
    }
    return m.body;
  }

  return (
    <div className="chat">
      <div className="entete">
        <button className="lien" onClick={retour}>← Groupes</button>
        <strong>{groupe.name}</strong>
      </div>
      <div className="fil">
        {msgs.length === 0 && <p className="vide">Aucun message. Écris ou envoie un vocal !</p>}
        {msgs.map((m) => (
          <div key={m.id} className={"bulle " + (m.user_id === user.id ? "moi" : "autre")}>
            <div className="auteur">{m.profiles?.username || "élève"}</div>
            {contenu(m)}
            <div>
              <button className="petit" onClick={() => signaler(m)}>Signaler</button>
              {m.user_id === user.id && <button className="petit" onClick={() => supprimer(m)}>Supprimer</button>}
            </div>
          </div>
        ))}
        <div ref={bas} />
      </div>
      <form className="barre" onSubmit={envoyer}>
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écris un message" />
        <input type="file" ref={fichierRef} onChange={joindre} accept="image/jpeg,image/png,image/webp,application/pdf,.docx" hidden />
        <button type="button" disabled={envoi} onClick={() => fichierRef.current.click()} aria-label="Joindre un fichier">{envoi ? "…" : "📎"}</button>
        <button type="button" onClick={enregistrer}>{rec ? "Arrêter" : "🎤"}</button>
        <button>Envoyer</button>
      </form>
    </div>
  );
}

function IA({ session }) {
  const meta = session.user.user_metadata || {};
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
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ messages: suite, niveau: meta.niveau, serie: meta.serie }),
      });
      const data = await rep.json();
      if (!rep.ok) throw new Error(data.error || "Erreur");
      setMessages([...suite, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...suite, { role: "assistant", content: "Je n’ai pas pu répondre. Vérifie ta connexion et réessaie." }]);
    }
    setAttente(false);
  }

  return (
    <div className="chat">
      <div className="entete"><strong>Parlons IA</strong><small>{meta.niveau} · {meta.serie}</small></div>
      <div className="fil">
        {messages.length === 0 && <p className="vide">Pose ta question de cours ou d’exercice.</p>}
        {messages.map((m, i) => (
          <div key={i} className={"bulle " + (m.role === "user" ? "moi" : "autre")}>{m.content}</div>
        ))}
        {attente && <div className="bulle autre">Je réfléchis…</div>}
        <div ref={bas} />
      </div>
      <form className="barre" onSubmit={envoyer}>
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écris ta question" />
        <button disabled={attente}>Envoyer</button>
      </form>
    </div>
  );
}
