// DnD DM Dashboard — single-file React component
// - Keep file in src/, function name preserved: App
// - Adds: delete player/monster + friendly monster search suggestions (autocomplete)
// - Uses https://www.dnd5eapi.co

import React, { useEffect, useRef, useState } from "react";

function App() {
  const BASE_API = "https://www.dnd5eapi.co/api";
  // default players
  const defaultPlayers = [
    { id: "p1", name: "Arin", className: "paladin", hp: 38, maxHp: 38, ac: 18, initiative: 12, lore: "Stalwart defender.", overallDmg: 0 },
    { id: "p2", name: "Lyra", className: "wizard", hp: 22, maxHp: 22, ac: 12, initiative: 16, lore: "Student of arcane arts.", overallDmg: 0 },
    { id: "p3", name: "Thog", className: "barbarian", hp: 45, maxHp: 45, ac: 15, initiative: 8, lore: "Mountain-born berserker.", overallDmg: 0 },
    { id: "p4", name: "Miri", className: "rogue", hp: 24, maxHp: 24, ac: 14, initiative: 14, lore: "Quick hands, quicker wit.", overallDmg: 0 },
  ];

  // state (localStorage-backed)
  const [players, setPlayers] = useState(() => {
    try { const raw = localStorage.getItem("dm_players"); return raw ? JSON.parse(raw) : defaultPlayers; } catch { return defaultPlayers; }
  });
  const [monsters, setMonsters] = useState(() => {
    try { const raw = localStorage.getItem("dm_monsters"); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [encounters, setEncounters] = useState(() => {
    try { const raw = localStorage.getItem("dm_encounters"); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [mode, setMode] = useState(() => localStorage.getItem("dm_mode") || "normal");

  // UI
  const [selected, setSelected] = useState(null); // {type, item}
  const [modalOpen, setModalOpen] = useState(false);
  const [monsterIndexInput, setMonsterIndexInput] = useState("");
  const [notification, setNotification] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [playerAttackModal, setPlayerAttackModal] = useState({ open: false, player: null });
  const [monsterAttackModal, setMonsterAttackModal] = useState({ open: false, monster: null });
  const [healModal, setHealModal] = useState({ open: false, type: null, source: null });
  const [editingField, setEditingField] = useState(null); // {type, id, field}

  // search suggestions
  const [monsterIndexList, setMonsterIndexList] = useState([]); // from /api/monsters
  const [suggestions, setSuggestions] = useState([]);
  const suggestTimeout = useRef(null);
  const searchInputRef = useRef(null);

  // drag ref
  const dragRef = useRef(null);

  // persist
  useEffect(()=> localStorage.setItem("dm_players", JSON.stringify(players)), [players]);
  useEffect(()=> localStorage.setItem("dm_monsters", JSON.stringify(monsters)), [monsters]);
  useEffect(()=> localStorage.setItem("dm_encounters", JSON.stringify(encounters)), [encounters]);
  useEffect(()=> localStorage.setItem("dm_mode", mode), [mode]);

  // class images
  const classImages = {
    paladin: "https://www.enworld.org/media/paladin-png.42575/full",
    druid: "https://dndspellslist.com/static/media/druid_logo.988b26f9.png",
    monk: "https://www.enworld.org/media/monk-png.42574/full", 
    wizard: "https://www.enworld.org/attachments/wizard-png.80084/",
    barbarian: "https://www.enworld.org/media/barbarian-png.42568/full",
    rogue: "https://www.enworld.org/attachments/rogue-png.80081/",
    cleric: "https://www.enworld.org/media/cleric-png.42570/full",
    ranger: "https://www.enworld.org/media/ranger-png.42576/full",
    fighter: "https://www.enworld.org/attachments/fighter-png.80077/",
    sorcerer: "https://www.enworld.org/attachments/sorcerer-png.80082/",
    bard: "https://www.enworld.org/media/bard-png.42569/full",
    warlock: "https://dndspellslist.com/static/media/warlock_logo.a9404802.png",
  };

  // fallback emoji icons in case images fail to load
  const classIcons = {
    paladin: "🛡️", wizard: "✨", barbarian: "🪓", rogue: "🗡️", cleric: "✝️",
    ranger: "🏹", fighter: "⚔️", druid: "🌿", monk: "🥋", sorcerer: "🔥", bard: "🎶", warlock: "🔮",
  };

  // fetch list of monster indices once for suggestions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_API}/monsters`);
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.results)) {
          // store as [{index,name},...]
          setMonsterIndexList(json.results.map(r => ({ index: r.index, name: r.name })));
        }
      } catch (err) { /*ignore*/ }
    })();
  }, []);

  // initial quick add: if monsters empty, fetch 3
  useEffect(() => {
    if (monsters.length) return;
    (async () => {
      try {
        const res = await fetch(`${BASE_API}/monsters`);
        if (!res.ok) return;
        const list = await res.json();
        const picks = (list.results || []).slice(0, 6).slice(0,3);
        const fetched = [];
        for (const p of picks) {
          const r = await fetch(`${BASE_API}/monsters/${encodeURIComponent(p.index)}`);
          if (!r.ok) continue;
          const data = await r.json();
          const ac = Array.isArray(data.armor_class) ? (data.armor_class[0]?.value ?? data.armor_class[0]) : data.armor_class ?? 10;
          fetched.push({
            id: "m_" + Date.now() + "_" + Math.random().toString(36).slice(2,7),
            name: data.name,
            index: data.index,
            hp: data.hit_points ?? 0,
            maxHp: data.hit_points ?? 0,
            ac,
            fullData: data,
            description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || "",
            initiative: -1,
          });
        }
        if (fetched.length) setMonsters(fetched);
      } catch (err) { /*ignore*/ }
    })();
    // eslint-disable-next-line
  }, []);

  // generic fetch monster full JSON
  const fetchMonster = async (index) => {
    try {
      const r = await fetch(`${BASE_API}/monsters/${encodeURIComponent(index)}`);
      if (!r.ok) return null;
      return await r.json();
    } catch (err) { return null; }
  };

  // add monster by exact index
  const addMonsterByIndex = async () => {
    const index = (monsterIndexInput || "").trim().toLowerCase();
    if (!index) { setNotification("Enter monster index"); return; }
    setLoadingIndex(index); setNotification("Fetching...");
    const data = await fetchMonster(index);
    setLoadingIndex(null);
    if (!data) { setNotification("Monster not found"); return; }
    const ac = Array.isArray(data.armor_class) ? (data.armor_class[0]?.value ?? data.armor_class[0]) : data.armor_class ?? 10;
    const newM = {
      id: "m_" + Date.now(),
      name: data.name,
      index: data.index,
      hp: data.hit_points ?? 0,
      maxHp: data.hit_points ?? 0,
      ac,
      fullData: data,
      description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || "",
      initiative: -1,
    };
    setMonsters(prev => [...prev, newM]);
    setMonsterIndexInput("");
    setSuggestions([]);
    setNotification(`${data.name} added`);
  };

  // friendly search: debounce and filter with highlighting logic in UI
  const onSearchChange = (text) => {
    setMonsterIndexInput(text);
    setSuggestions([]);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    suggestTimeout.current = setTimeout(() => {
      const q = (text || "").trim().toLowerCase();
      if (!q) { setSuggestions([]); return; }
      // find matches in name or index
      const matches = monsterIndexList.filter(m => m.name.toLowerCase().includes(q) || m.index.toLowerCase().includes(q)).slice(0, 10);
      setSuggestions(matches);
    }, 220); // debounce 220ms
  };

  // when user clicks suggestion -> fetch + add
  const addMonsterFromSuggestion = async (suggestion) => {
    setMonsterIndexInput(suggestion.index);
    setSuggestions([]);
    setLoadingIndex(suggestion.index);
    const data = await fetchMonster(suggestion.index);
    setLoadingIndex(null);
    if (!data) { setNotification("Failed to fetch"); return; }
    const ac = Array.isArray(data.armor_class) ? (data.armor_class[0]?.value ?? data.armor_class[0]) : data.armor_class ?? 10;
    const newM = {
      id: "m_" + Date.now(),
      name: data.name,
      index: data.index,
      hp: data.hit_points ?? 0,
      maxHp: data.hit_points ?? 0,
      ac,
      fullData: data,
      description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || "",
      initiative: -1,
    };
    setMonsters(prev => [...prev, newM]);
    setNotification(`${data.name} added`);
  };

  // select inspector
  const openPlayerInspector = (player) => { setSelected({ type: "player", item: player }); setModalOpen(true); };
  const openMonsterInspector = async (monster) => {
    if (monster.fullData) { setSelected({ type: "monster", item: monster }); setModalOpen(true); return; }
    setNotification("Fetching monster details...");
    const data = await fetchMonster(monster.index || monster.name);
    setNotification("");
    if (!data) { setSelected({ type: "monster", item: monster }); setModalOpen(true); return; }
    const ac = Array.isArray(data.armor_class) ? (data.armor_class[0]?.value ?? data.armor_class[0]) : data.armor_class ?? 10;
    setMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, fullData: data, ac, hp: data.hit_points ?? m.hp, maxHp: data.hit_points ?? m.maxHp, description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || m.description } : m));
    const updated = { ...monster, fullData: data, ac, hp: data.hit_points ?? monster.hp, maxHp: data.hit_points ?? monster.maxHp, description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || monster.description };
    setSelected({ type: "monster", item: updated });
    setModalOpen(true);
  };

  // hp changes and deletes
  const changePlayerHp = (playerId, delta) => setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, hp: Math.max(0, Math.min(p.maxHp ?? 9999, (p.hp||0) + delta)) } : p));
  const setPlayerHp = (playerId, value) => setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, hp: Math.max(0, Math.min(p.maxHp ?? value, value)) } : p));
  const changeMonsterHp = (monsterId, delta) => setMonsters(prev => prev.map(m => m.id === monsterId ? { ...m, hp: Math.max(0, Math.min(m.maxHp ?? 9999, (m.hp||0) + delta)) } : m));
  const setMonsterHp = (monsterId, value) => setMonsters(prev => prev.map(m => m.id === monsterId ? { ...m, hp: Math.max(0, Math.min(m.maxHp ?? value, value)) } : m));
  const deletePlayer = (playerId) => { setPlayers(prev => prev.filter(p => p.id !== playerId)); setNotification("Player removed"); if (selected?.type==='player' && selected.item.id===playerId) { setSelected(null); setModalOpen(false); } };
  const deleteMonster = (monsterId) => { setMonsters(prev => prev.filter(m => m.id !== monsterId)); setNotification("Monster removed"); if (selected?.type==='monster' && selected.item.id===monsterId) { setSelected(null); setModalOpen(false); } };

  // player attack on monster
  const playerAttackMonster = (playerId, monsterIds, damage) => {
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
      setNotification("Invalid player");
      return;
    }

    let totalDamage = 0;
    monsterIds.forEach(monsterId => {
      const monster = monsters.find(m => m.id === monsterId);
      if (monster) {
        changeMonsterHp(monsterId, -damage);
        totalDamage += damage;
      }
    });

    // Add to player's overall damage
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, overallDmg: (p.overallDmg || 0) + totalDamage } : p
    ));

    const msg = `${player.name} -> ${monsterIds.length} target(s): ${damage} damage each (total: ${totalDamage})`;
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg }, ...prev].slice(0,80));
    setNotification(msg);
    setPlayerAttackModal({ open: false, player: null });
  };

  // monster attack on players
  const monsterAttackPlayer = (monsterId, playerIds, damage) => {
    const monster = monsters.find(m => m.id === monsterId);
    
    if (!monster) {
      setNotification("Invalid monster");
      return;
    }

    playerIds.forEach(playerId => {
      changePlayerHp(playerId, -damage);
    });

    const msg = `${monster.name} -> ${playerIds.length} player(s): ${damage} damage each`;
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg }, ...prev].slice(0,80));
    setNotification(msg);
    setMonsterAttackModal({ open: false, monster: null });
  };

  // heal targets
  const healTargets = (targetIds, healAmount, source, isPlayerSource) => {
    targetIds.forEach(targetId => {
      if (isPlayerSource) {
        changePlayerHp(targetId, healAmount);
      } else {
        changeMonsterHp(targetId, healAmount);
      }
    });

    const sourceName = isPlayerSource 
      ? players.find(p => p.id === source)?.name 
      : monsters.find(m => m.id === source)?.name;

    const msg = `${sourceName} -> ${targetIds.length} target(s): ${healAmount} heal each`;
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg }, ...prev].slice(0,80));
    setNotification(msg);
    setHealModal({ open: false, type: null, source: null });
  };

  // update player stats
  const updatePlayerStat = (playerId, field, value) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, [field]: value } : p
    ));
  };

  // update monster stats
  const updateMonsterStat = (monsterId, field, value) => {
    setMonsters(prev => prev.map(m => 
      m.id === monsterId ? { ...m, [field]: value } : m
    ));
  };

  // start editing field
  const startEditing = (type, id, field) => {
    setEditingField({ type, id, field });
  };

  // finish editing field
  const finishEditing = () => {
    setEditingField(null);
  };

  // handle field edit
  const handleFieldEdit = (e, type, id, field) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    if (type === 'player') {
      updatePlayerStat(id, field, value);
    } else {
      updateMonsterStat(id, field, value);
    }
  };

  // drag & drop reordering
  const onDragStart = (e, id, listType) => { dragRef.current = { id, listType }; e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDropItem = (e, targetId, listType) => {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.listType !== listType) { dragRef.current = null; return; }
    if (listType === "players") {
      const copy = [...players];
      const from = copy.findIndex(x => x.id === drag.id);
      const to = copy.findIndex(x => x.id === targetId);
      if (from < 0 || to < 0) { dragRef.current = null; return; }
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      const anchored = copy.map((pl, i) => ({ ...pl, initiative: (copy.length - i) * 5 }));
      setPlayers(anchored);
    } else {
      const copy = [...monsters];
      const from = copy.findIndex(x => x.id === drag.id);
      const to = copy.findIndex(x => x.id === targetId);
      if (from < 0 || to < 0) { dragRef.current = null; return; }
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      setMonsters(copy);
    }
    dragRef.current = null;
  };

  // simple dice parser NdM+K
  const rollDice = (expr) => {
    try {
      const cleaned = (expr || "").replace(/\s+/g, "");
      if (!cleaned) return { total: 0, details: "" };
      let total = 0; const details = [];
      // split by +
      const plusParts = cleaned.split("+");
      for (const part of plusParts) {
        if (!part) continue;
        if (part.includes("d")) {
          const [nStr, sStr] = part.split("d");
          const n = nStr === "" ? 1 : parseInt(nStr,10);
          const s = parseInt(sStr,10);
          let sum = 0; const rolls = [];
          for (let i=0;i<n;i++){ const r = Math.floor(Math.random()*s)+1; rolls.push(r); sum += r; }
          total += sum; details.push(`${part}=>[${rolls.join(",")}]`);
        } else {
          const v = parseInt(part,10); if (!isNaN(v)) { total += v; details.push(String(v)); }
        }
      }
      return { total, details: details.join(" ; ") };
    } catch (err) { return { total: 0, details: "err" }; }
  };

  // monster attack vs player
  const rollMonsterAttack = ({ monster, targetPlayerId, attackBonus = 0, dmgExpr = "1d6" }) => {
    const target = players.find(p => p.id === targetPlayerId);
    if (!target) { setNotification("Select a valid player target"); return null; }
    const d20 = Math.floor(Math.random()*20)+1;
    const attackTotal = d20 + Number(attackBonus || 0);
    const nat20 = d20 === 20; const nat1 = d20 === 1;
    const hit = nat20 ? true : (attackTotal >= (target.ac || 10));
    let dmgRes = { total: 0, details: "" };
    if (hit) { dmgRes = rollDice(dmgExpr); if (nat20) { const extra = rollDice(dmgExpr); dmgRes.total += extra.total; dmgRes.details += ` ; CRIT_EXTRA ${extra.details}`; } changePlayerHp(targetPlayerId, -dmgRes.total); }
    const msg = `${monster.name} -> ${target.name}: d20=${d20}+${attackBonus}=${attackTotal} → ${hit ? `HIT ${dmgRes.total} (${dmgRes.details})` : "MISS"}${nat20 ? " (CRIT)" : nat1 ? " (NAT1)" : ""}`;
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg }, ...prev].slice(0,80));
    setNotification(msg);
    return { d20, attackTotal, hit, dmgRes };
  };

  // quick format speed
  const formatSpeed = speed => {
    if (!speed) return "—"; if (typeof speed === "string") return speed;
    return Object.entries(speed).map(([k,v])=>`${k} ${v}`).join(" • ");
  };

  // export/import
  const exportState = () => {
    const payload = { players, monsters, encounters, mode };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "dm_state.json"; a.click(); URL.revokeObjectURL(url);
  };
  const importState = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const parsed = JSON.parse(reader.result); if (parsed.players) setPlayers(parsed.players); if (parsed.monsters) setMonsters(parsed.monsters); if (parsed.encounters) setEncounters(parsed.encounters); if (parsed.mode) setMode(parsed.mode); setNotification("Imported"); } catch { setNotification("Invalid file"); }
    };
    reader.readAsText(file);
  };

  // get HP color based on percentage
  const getHpColor = (hp, maxHp) => {
    if (maxHp <= 0) return '#0a0e11';
    const percentage = (hp / maxHp) * 100;
    if (percentage <= 30) return 'rgba(255, 0, 0, 0.3)'; // Red for critical
    if (percentage <= 60) return 'rgba(255, 165, 0, 0.3)'; // Orange/Yellow for medium
    return 'rgba(255, 255, 255, 0.01)'; // Normal
  };

  // get log color based on content and HP
  const getLogColor = (log) => {
    const summary = log.summary.toLowerCase();
    
    // Check for damage logs
    if (summary.includes('damage') || summary.includes('dmg') || summary.includes('hit')) {
      // Try to find player name in the log
      const playersInLog = players.filter(p => summary.includes(p.name.toLowerCase()));
      
      if (playersInLog.length > 0) {
        const player = playersInLog[0];
        const hpPercentage = (player.hp / player.maxHp) * 100;
        
        if (hpPercentage <= 30) {
          return { background: 'rgba(255, 0, 0, 0.2)', color: '#ff6b6b' }; // Red for critical HP
        } else {
          return { background: 'rgba(255, 165, 0, 0.2)', color: '#ffa500' }; // Orange for damage
        }
      }
    }
    
    // Check for heal logs
    if (summary.includes('heal')) {
      return { background: 'rgba(0, 255, 0, 0.2)', color: '#90ee90' }; // Green for heal
    }
    
    // Default
    return { background: 'transparent', color: 'inherit' };
  };

  // UI CSS (inline)
  const css = `
:root{--bg:#05060a;--panel:#0f1316;--muted:#9aa2a9;--accent:#7c5cff;--danger:#ff5a7a}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(180deg,var(--bg) 0%, #071017 100%);color:#e6eef6}
.app{padding:14px;min-height:100vh;display:flex;flex-direction:column;gap:12px}
.topbar{display:flex;justify-content:space-between;align-items:center}
.title{font-weight:800;font-size:20px}
.controls{display:flex;gap:8px;align-items:center}
.btn{background:transparent;border:1px solid rgba(255,255,255,0.04);padding:8px 10px;border-radius:8px;cursor:pointer;color:inherit}
.layout{display:grid;grid-template-columns:300px 1fr 360px;gap:12px;align-items:start}
.panel{background:linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.006));padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.03);min-height:120px}
.player-card{display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.01);cursor:grab;position:relative;overflow:visible;transition: background-color 0.3s ease}
.player-card:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(0,0,0,0.6)}
.player-icon{width:56px;height:56px;border-radius:10px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));display:flex;align-items:center;justify-content:center;font-size:26px;overflow:hidden}
.player-icon img{width:100%;height:100%;object-fit:cover;filter: invert(1) brightness(2)}
.player-meta{display:flex;flex-direction:column;min-width:0}
.player-name{font-weight:700}
.player-small{font-size:13px;color:var(--muted)}
.hp-badge{margin-left:auto;background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(0,0,0,0.12));padding:6px 8px;border-radius:8px;font-weight:700}
.dead-tag{color:var(--danger);font-weight:900;margin-left:8px}
.hover-panel{position:absolute;left:calc(100% + 12px);top:0;width:300px;background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.008));border:1px solid rgba(255,255,255,0.03);padding:12px;border-radius:10px;box-shadow:0 30px 70px rgba(0,0,0,0.6);z-index:40;display:none}
.player-card:hover .hover-panel{display:block}
.input{background:#0a0e11;border:1px solid rgba(255,255,255,0.1);padding:8px;border-radius:8px;color:#fff}
.input:focus{outline:none;border-color:rgba(124,92,255,0.5)}
select.input{background:#0a0e11;color:#fff}
select.input option{background:#0a0e11;color:#fff}
.small-muted{color:var(--muted);font-size:13px}
.inspector{min-height:460px;display:flex;flex-direction:column;gap:12px}
.center-card{display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:12px}
.center-left{width:220px;display:flex;flex-direction:column;align-items:center;gap:12px}
.center-icon{width:140px;height:140px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:64px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));overflow:hidden}
.center-icon img{width:100%;height:100%;object-fit:cover;filter: invert(1) brightness(2)}
.center-main{flex:1;display:flex;flex-direction:column}
.section{margin-top:8px}
.monster-card{display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.01);cursor:grab;transition: background-color 0.3s ease}
.monster-icon{width:48px;height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(255,255,255,0.02)}
.suggestions{position: absolute; background: linear-gradient(180deg,#0d1114,#0a0e11);border:1px solid rgba(255,255,255,0.1);border-radius:8px;max-height:220px;overflow:auto;width:100%;z-index:90;box-shadow:0 18px 40px rgba(0,0,0,0.6)}
.suggestion-item{padding:8px 10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.1);color:#fff}
.suggestion-item:hover{background:rgba(255,255,255,0.05)}
@media (max-width:1100px){ .layout{grid-template-columns:260px 1fr} .monster-column{display:none} }
.notification{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:linear-gradient(180deg,#111417,#0b0f12);padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);box-shadow:0 20px 40px rgba(0,0,0,0.6);z-index:999}
.delete-btn{background:transparent;border:1px solid rgba(255,255,255,0.03);padding:6px;border-radius:6px;cursor:pointer;color:#ffb4c7}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal{background:linear-gradient(180deg, #0f1316, #0a0e11);padding:20px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);min-width:400px;max-width:90vw;max-height:90vh;overflow:auto;color:#fff}
.modal h3{margin-top:0;margin-bottom:16px}
.target-list{max-height:200px;overflow-y:auto;margin:12px 0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px}
.target-item{display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.05)}
.target-item:last-child{border-bottom:none}
.checkbox-label{display:flex;align-items:center;gap:8px;cursor:pointer;width:100%}
.checkbox-input{width:16px;height:16px}
.editable-field{cursor:pointer;padding:4px;border-radius:4px;transition: background-color 0.2s}
.editable-field:hover{background:rgba(255,255,255,0.05)}
.editable-input{background:transparent;border:1px solid rgba(255,255,255,0.2);color:inherit;padding:4px;border-radius:4px;width:100%}
`;

  // Player Attack Modal Component
  const PlayerAttackModal = ({ player, onClose, onAttack }) => {
    const [selectedMonsterIds, setSelectedMonsterIds] = useState([]);
    const [damage, setDamage] = useState("");

    const handleAttack = () => {
      if (selectedMonsterIds.length === 0 || !damage) {
        setNotification("Select at least one monster and enter damage");
        return;
      }
      const dmgValue = parseInt(damage);
      if (isNaN(dmgValue) || dmgValue <= 0) {
        setNotification("Enter valid damage amount");
        return;
      }
      onAttack(player.id, selectedMonsterIds, dmgValue);
    };

    const toggleMonster = (monsterId) => {
      setSelectedMonsterIds(prev => 
        prev.includes(monsterId) 
          ? prev.filter(id => id !== monsterId)
          : [...prev, monsterId]
      );
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0}}>{player.name} - Attack</h3>
            <button className="btn" onClick={onClose} style={{padding: '4px 8px'}}>✕</button>
          </div>
          
          <div style={{marginBottom: '12px'}}>
            <div className="small-muted">Target Monsters (select multiple)</div>
            <div className="target-list">
              {monsters.map(m => (
                <div key={m.id} className="target-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={selectedMonsterIds.includes(m.id)}
                      onChange={() => toggleMonster(m.id)}
                    />
                    <span>{m.name} (HP: {m.hp}/{m.maxHp})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginBottom: '16px'}}>
            <div className="small-muted">Damage</div>
            <input
              className="input"
              type="number"
              value={damage}
              onChange={e => setDamage(e.target.value)}
              placeholder="Enter damage amount"
              style={{width: '100%', marginTop: '4px'}}
            />
          </div>

          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button 
              className="btn" 
              onClick={handleAttack}
              style={{background: 'rgba(124, 92, 255, 0.1)', borderColor: 'rgba(124, 92, 255, 0.3)'}}
            >
              Attack ({selectedMonsterIds.length} targets)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Monster Attack Modal Component
  const MonsterAttackModal = ({ monster, onClose, onAttack }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
    const [damage, setDamage] = useState("");

    const handleAttack = () => {
      if (selectedPlayerIds.length === 0 || !damage) {
        setNotification("Select at least one player and enter damage");
        return;
      }
      const dmgValue = parseInt(damage);
      if (isNaN(dmgValue) || dmgValue <= 0) {
        setNotification("Enter valid damage amount");
        return;
      }
      onAttack(monster.id, selectedPlayerIds, dmgValue);
    };

    const togglePlayer = (playerId) => {
      setSelectedPlayerIds(prev => 
        prev.includes(playerId) 
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0}}>{monster.name} - Attack</h3>
            <button className="btn" onClick={onClose} style={{padding: '4px 8px'}}>✕</button>
          </div>
          
          <div style={{marginBottom: '12px'}}>
            <div className="small-muted">Target Players (select multiple)</div>
            <div className="target-list">
              {players.map(p => (
                <div key={p.id} className="target-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={selectedPlayerIds.includes(p.id)}
                      onChange={() => togglePlayer(p.id)}
                    />
                    <span>{p.name} (HP: {p.hp}/{p.maxHp}, AC: {p.ac})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginBottom: '16px'}}>
            <div className="small-muted">Damage</div>
            <input
              className="input"
              type="number"
              value={damage}
              onChange={e => setDamage(e.target.value)}
              placeholder="Enter damage amount"
              style={{width: '100%', marginTop: '4px'}}
            />
          </div>

          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button 
              className="btn" 
              onClick={handleAttack}
              style={{background: 'rgba(255, 90, 122, 0.1)', borderColor: 'rgba(255, 90, 122, 0.3)'}}
            >
              Attack ({selectedPlayerIds.length} targets)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Heal Modal Component
  const HealModal = ({ type, source, onClose, onHeal }) => {
    const [selectedTargetIds, setSelectedTargetIds] = useState([]);
    const [healAmount, setHealAmount] = useState("");
    const isPlayerSource = type === 'player';

    const handleHeal = () => {
      if (selectedTargetIds.length === 0 || !healAmount) {
        setNotification("Select at least one target and enter heal amount");
        return;
      }
      const healValue = parseInt(healAmount);
      if (isNaN(healValue) || healValue <= 0) {
        setNotification("Enter valid heal amount");
        return;
      }
      onHeal(selectedTargetIds, healValue, source, isPlayerSource);
    };

    const toggleTarget = (targetId) => {
      setSelectedTargetIds(prev => 
        prev.includes(targetId) 
          ? prev.filter(id => id !== targetId)
          : [...prev, targetId]
      );
    };

    const sourceName = isPlayerSource 
      ? players.find(p => p.id === source)?.name 
      : monsters.find(m => m.id === source)?.name;

    const targets = isPlayerSource ? players : monsters;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0}}>{sourceName} - Heal</h3>
            <button className="btn" onClick={onClose} style={{padding: '4px 8px'}}>✕</button>
          </div>
          
          <div style={{marginBottom: '12px'}}>
            <div className="small-muted">Target {isPlayerSource ? 'Players' : 'Monsters'} (select multiple)</div>
            <div className="target-list">
              {targets.map(t => (
                <div key={t.id} className="target-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={selectedTargetIds.includes(t.id)}
                      onChange={() => toggleTarget(t.id)}
                    />
                    <span>{t.name} (HP: {t.hp}/{t.maxHp})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginBottom: '16px'}}>
            <div className="small-muted">Heal Amount</div>
            <input
              className="input"
              type="number"
              value={healAmount}
              onChange={e => setHealAmount(e.target.value)}
              placeholder="Enter heal amount"
              style={{width: '100%', marginTop: '4px'}}
            />
          </div>

          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button 
              className="btn" 
              onClick={handleHeal}
              style={{background: 'rgba(76, 217, 100, 0.1)', borderColor: 'rgba(76, 217, 100, 0.3)'}}
            >
              Heal ({selectedTargetIds.length} targets)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Image component with fallback
  const ClassImage = ({ className, size = 'normal' }) => {
    const [imgError, setImgError] = useState(false);
    
    const handleError = () => {
      setImgError(true);
    };

    if (imgError || !classImages[className]) {
      return <div>{classIcons[className] || "❓"}</div>;
    }

    return (
      <img 
        src={classImages[className]} 
        alt={className}
        onError={handleError}
        style={{ 
          width: size === 'large' ? '100%' : '100%',
          height: size === 'large' ? '100%' : '100%',
          objectFit: 'cover'
        }}
      />
    );
  };

  // Editable Field Component
  const EditableField = ({ type, id, field, value, onEdit }) => {
    const isEditing = editingField && editingField.type === type && editingField.id === id && editingField.field === field;
    
    if (isEditing) {
      return (
        <input
          className="editable-input"
          type={typeof value === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onEdit(e, type, id, field)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishEditing();
            if (e.key === 'Escape') finishEditing();
          }}
          autoFocus
        />
      );
    }
    
    return (
      <div 
        className="editable-field"
        onClick={() => startEditing(type, id, field)}
        title="Click to edit"
      >
        {value}
      </div>
    );
  };

  // Inspector rendering
  const Inspector = () => {
    if (!selected) {
      return <div className="center-card panel" style={{alignItems:"center",justifyContent:"center"}}><div className="small-muted">Select player (left) or monster (right)</div></div>;
    }
    if (selected.type === "player") {
      const p = players.find(x => x.id === selected.item.id) || selected.item;
      return (
        <div className="center-card panel">
          <div className="center-left">
            <div className="center-icon">
              <ClassImage className={p.className} size="large" />
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18}}>
                <EditableField type="player" id={p.id} field="name" value={p.name} onEdit={handleFieldEdit} />
                {p.hp<=0 && <span className="dead-tag"> DEAD</span>}
              </div>
              <div className="small-muted">
                <EditableField type="player" id={p.id} field="className" value={p.className} onEdit={handleFieldEdit} />
              </div>
            </div>
            <div style={{width:"100%"}}>
              <div className="small-muted">AC</div>
              <div style={{fontWeight:800}}>
                <EditableField type="player" id={p.id} field="ac" value={p.ac} onEdit={handleFieldEdit} />
              </div>
            </div>
            <div style={{width:"100%"}}>
              <div className="small-muted">HP</div>
              <div style={{fontWeight:900}}>
                <EditableField type="player" id={p.id} field="hp" value={p.hp} onEdit={handleFieldEdit} />
                {' / '}
                <EditableField type="player" id={p.id} field="maxHp" value={p.maxHp} onEdit={handleFieldEdit} />
              </div>
            </div>
            <div style={{width:"100%"}}>
              <div className="small-muted">Overall Damage</div>
              <div style={{fontWeight:900, color: '#ff7c5c'}}>{p.overallDmg || 0}</div>
            </div>
            <div style={{width:"100%"}}>
              <button className="delete-btn" onClick={()=>deletePlayer(p.id)}>Delete player</button>
            </div>
          </div>

          <div className="center-main">
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:900,fontSize:20}}>{p.name}</div>
                <div className="small-muted">
                  <EditableField type="player" id={p.id} field="lore" value={p.lore} onEdit={handleFieldEdit} />
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="small-muted">Initiative</div>
                <div style={{fontWeight:800}}>
                  <EditableField type="player" id={p.id} field="initiative" value={p.initiative} onEdit={handleFieldEdit} />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="small-muted">HP Controls</div>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button className="btn" onClick={()=>changePlayerHp(p.id,-1)}>-1</button>
                <button className="btn" onClick={()=>changePlayerHp(p.id,-5)}>-5</button>
                <button className="btn" onClick={()=>changePlayerHp(p.id,5)}>+5</button>
                <button className="btn" onClick={()=>{ const v = prompt("Set HP:", String(p.hp)); if (v !== null) setPlayerHp(p.id, Number(v)||0); }}>Set</button>
              </div>
            </div>

            <div className="section">
              <div className="small-muted">Quick actions</div>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button className="btn" onClick={() => setPlayerAttackModal({ open: true, player: p })}>Attack</button>
                <button className="btn" onClick={() => setHealModal({ open: true, type: 'player', source: p.id })}>Heal</button>
                <button className="btn" onClick={()=>{ const note = prompt("Log note:"); if (note) setEncounters(prev=>[{id:"e_"+Date.now(),date:new Date().toISOString(),summary:`${p.name}: ${note}`},...prev].slice(0,80)); }}>Log</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // monster
    const m = monsters.find(x => x.id === selected.item.id) || selected.item;
    return (
      <div className="center-card panel">
        <div className="center-left">
          <div className="center-icon">👾</div>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:900,fontSize:18}}>
              <EditableField type="monster" id={m.id} field="name" value={m.name} onEdit={handleFieldEdit} />
              {m.hp<=0 && <span className="dead-tag"> DEAD</span>}
            </div>
            <div className="small-muted">{m.fullData ? `${m.fullData.size} ${m.fullData.type}` : ""}</div>
          </div>
          <div style={{width:"100%"}}>
            <div className="small-muted">AC</div>
            <div style={{fontWeight:800}}>
              <EditableField type="monster" id={m.id} field="ac" value={m.ac} onEdit={handleFieldEdit} />
            </div>
          </div>
          <div style={{width:"100%"}}>
            <div className="small-muted">HP</div>
            <div style={{fontWeight:900}}>
              <EditableField type="monster" id={m.id} field="hp" value={m.hp} onEdit={handleFieldEdit} />
              {' / '}
              <EditableField type="monster" id={m.id} field="maxHp" value={m.maxHp} onEdit={handleFieldEdit} />
            </div>
          </div>
          <div style={{width:"100%"}}>
            <button className="delete-btn" onClick={()=>deleteMonster(m.id)}>Delete monster</button>
          </div>
        </div>

        <div className="center-main">
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:900,fontSize:20}}>{m.name}</div>
              <div className="small-muted">{m.description ? m.description.slice(0,300) : (m.fullData?.desc ? (Array.isArray(m.fullData.desc) ? m.fullData.desc.join("\n\n").slice(0,300) : m.fullData.desc.slice(0,300)) : "No description")}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="small-muted">Initiative</div>
              <div style={{fontWeight:800}}>
                <EditableField type="monster" id={m.id} field="initiative" value={m.initiative} onEdit={handleFieldEdit} />
              </div>
            </div>
          </div>

          <div className="section">
            <div style={{display:"flex",gap:12}}>
              <div><div className="small-muted">Speeds</div><div>{m.fullData ? formatSpeed(m.fullData.speed) : "—"}</div></div>
              <div><div className="small-muted">Senses</div><div>{m.fullData?.senses ? Object.entries(m.fullData.senses).map(([k,v])=>`${k} ${v}`).join(" • ") : "—"}</div></div>
              <div><div className="small-muted">Languages</div><div>{m.fullData?.languages ?? "—"}</div></div>
            </div>
          </div>

          <div className="section">
            <div className="small-muted">Actions / Abilities</div>
            <div style={{marginTop:8}}>
              {(m.fullData?.special_abilities || []).length ? m.fullData.special_abilities.map((sa,i)=>(
                <div key={i} style={{marginBottom:8}}><div style={{fontWeight:700}}>{sa.name}</div><div style={{fontSize:14}}>{sa.desc}</div></div>
              )) : <div className="small-muted">—</div>}
            </div>
          </div>

          <div className="section">
            <div className="small-muted">Quick Actions</div>
            <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <button className="btn" onClick={() => setMonsterAttackModal({ open: true, monster: m })}>Attack</button>
              <button className="btn" onClick={() => setHealModal({ open: true, type: 'monster', source: m.id })}>Heal</button>
            </div>
          </div>

          <div className="section">
            <div className="small-muted">DM Attack Controls</div>
            <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <label className="small-muted">Target</label>
              <select id="dm-target-select" className="input" style={{minWidth:220}}>
                {players.map(p => <option key={p.id} value={p.id}>{p.name} • AC {p.ac} • HP {p.hp}/{p.maxHp}</option>)}
              </select>
              <label className="small-muted">Attack bonus</label>
              <input id="dm-attack-bonus" className="input" defaultValue={(m.fullData?.actions?.find(a=>a.attack_bonus!==undefined)?.attack_bonus) ?? 3} style={{width:84}} />
              <label className="small-muted">Damage</label>
              <input id="dm-dmg-expr" className="input" defaultValue={"1d8+3"} style={{width:120}} />
              <div style={{display:"flex",gap:8}}>
                <button className="btn" onClick={()=>{ const targetId = document.getElementById("dm-target-select")?.value || players[0]?.id; const bonus = Number(document.getElementById("dm-attack-bonus")?.value||0); const dmg = document.getElementById("dm-dmg-expr")?.value || "1d8"; rollMonsterAttack({ monster: m, targetPlayerId: targetId, attackBonus: bonus, dmgExpr: dmg }); }}>Roll Attack</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // Left players list
  const LeftPlayers = () => (
    <div className="panel">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:800}}>Players</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={()=> { setPlayers(defaultPlayers); setNotification("Players reset"); }}>Reset</button>
          <button className="btn" onClick={()=> { const id = "p_" + Date.now(); setPlayers(p => [...p, { id, name: "New", className: "fighter", hp: 20, maxHp: 20, ac: 14, initiative: 10, lore: "", overallDmg: 0 }]); }}>+Player</button>
        </div>
      </div>

      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
        {players.sort((a,b)=> (b.initiative||0)-(a.initiative||0)).map(p=>{
          const hpColor = getHpColor(p.hp, p.maxHp);
          return (
            <div 
              key={p.id} 
              className="player-card" 
              draggable 
              onDragStart={(e)=>onDragStart(e,p.id,"players")} 
              onDragOver={onDragOver} 
              onDrop={(e)=>onDropItem(e,p.id,"players")} 
              onClick={()=>openPlayerInspector(p)} 
              title={`Open inspector ${p.name}`}
              style={{ background: hpColor }}
            >
              <div className="player-icon">
                <ClassImage className={p.className} />
              </div>
              <div className="player-meta">
                <div className="player-name">{p.name} {p.hp<=0 && <span className="dead-tag">DEAD</span>}</div>
                <div className="player-small">{p.className} • Init {p.initiative ?? "—"}</div>
                <div className="player-small">AC {p.ac} • HP {p.hp}/{p.maxHp}</div>
                <div className="player-small" style={{color: '#ff7c5c'}}>Overall DMG: {p.overallDmg || 0}</div>
              </div>
              <div className="hp-badge">{p.hp}/{p.maxHp}</div>

              <div className="hover-panel" onClick={(e)=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:800}}>{p.name} {p.hp<=0 && <span className="dead-tag">DEAD</span>}</div>
                  <div className="small-muted">AC {p.ac}</div>
                </div>

                <div className="hover-row" style={{marginTop:8}}>
                  <div>
                    <div className="small-muted">HP</div>
                    <div style={{fontWeight:800}}>{p.hp} / {p.maxHp}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn" onClick={()=>changePlayerHp(p.id,-1)}>-1</button>
                    <button className="btn" onClick={()=>changePlayerHp(p.id,-5)}>-5</button>
                    <button className="btn" onClick={()=>changePlayerHp(p.id,5)}>+5</button>
                  </div>
                </div>

                <div style={{marginTop:8}}>
                  <div className="small-muted">Overall Damage</div>
                  <div style={{fontWeight:800, color: '#ff7c5c'}}>{p.overallDmg || 0}</div>
                </div>

                <div style={{marginTop:8}}>
                  <div className="small-muted">Spells / Extras</div>
                  <div style={{marginTop:6}} className="small-muted">{p.spells ? p.spells.join(", ") : "—"}</div>
                </div>

                <div style={{marginTop:10,display:"flex",gap:8, flexWrap: 'wrap'}}>
                  <button className="btn" onClick={() => setPlayerAttackModal({ open: true, player: p })}>Attack</button>
                  <button className="btn" onClick={() => setHealModal({ open: true, type: 'player', source: p.id })}>Heal</button>
                  <button className="btn" onClick={()=>{ const note = prompt("Log note about player:"); if (note) setEncounters(prev=>[{id:"e_"+Date.now(),date:new Date().toISOString(),summary:`${p.name}: ${note}`},...prev].slice(0,80)); }}>Log</button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );

  // Right monsters list with suggestions UI
  const RightMonsters = () => (
    <div className="panel">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
        <div style={{fontWeight:800}}>Monsters</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative",minWidth:240}}>
            <input 
              ref={searchInputRef}
              className="input" 
              placeholder="Search monsters (type to see suggestions)" 
              value={monsterIndexInput} 
              onChange={(e)=>onSearchChange(e.target.value)}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setSuggestions([]), 200);
              }}
            />
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map(s => (
                  <div 
                    key={s.index} 
                    className="suggestion-item" 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addMonsterFromSuggestion(s);
                      if (searchInputRef.current) {
                        searchInputRef.current.focus();
                      }
                    }}
                  >
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>{s.name}</div>
                      <div className="small-muted" style={{fontSize:12}}>{s.index}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn" onClick={addMonsterByIndex} disabled={!!loadingIndex}>{loadingIndex ? "Loading..." : "Add"}</button>
        </div>
      </div>

      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
        {monsters.sort((a,b)=> (b.initiative ?? -1) - (a.initiative ?? -1)).map(m=>{
          const hpColor = getHpColor(m.hp, m.maxHp);
          return (
            <div 
              key={m.id} 
              className="monster-card" 
              draggable 
              onDragStart={(e)=>onDragStart(e,m.id,"monsters")} 
              onDragOver={onDragOver} 
              onDrop={(e)=>onDropItem(e,m.id,"monsters")} 
              onClick={()=>openMonsterInspector(m)} 
              title={`Open inspector ${m.name}`}
              style={{ background: hpColor }}
            >
              <div className="monster-icon">👾</div>
              <div style={{display:"flex",flexDirection:"column",minWidth:0, flex: 1}}>
                <div style={{fontWeight:700}}>{m.name} {m.hp<=0 && <span className="dead-tag">DEAD</span>}</div>
                <div className="small-muted">HP {m.hp}/{m.maxHp} • AC {m.ac}</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button className="btn" onClick={() => setMonsterAttackModal({ open: true, monster: m })}>Attack</button>
                <button className="btn" onClick={() => setHealModal({ open: true, type: 'monster', source: m.id })}>Heal</button>
                <button className="delete-btn" onClick={(e)=>{ e.stopPropagation(); deleteMonster(m.id); }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="app">
      <style>{css}</style>

      <div className="topbar">
        <div className="title">DM Dashboard — single file</div>
        <div className="controls">
          <div className="small-muted" style={{marginRight:8}}>Mode: <strong style={{color:"var(--accent)"}}>{mode}</strong></div>
          {["normal","combat","walk"].map(m => <button key={m} className="btn" onClick={()=>setMode(m)} style={{borderColor: mode===m ? "rgba(124,92,255,0.3)" : undefined}}>{m}</button>)}
          <button className="btn" onClick={exportState}>Export</button>
          <label className="btn" style={{cursor:"pointer"}}>Import<input type="file" accept="application/json" style={{display:"none"}} onChange={importState} /></label>
        </div>
      </div>

      <div className="layout">
        <LeftPlayers />
        <div className="inspector panel"><Inspector /></div>
        <RightMonsters />
      </div>

      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}} className="panel">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:800}}>Session log</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={()=>{ const s = prompt("Quick encounter summary:"); if (s) setEncounters(prev=>[{id:"e_"+Date.now(),date:new Date().toISOString(),summary:s},...prev].slice(0,80)); }}>Log encounter</button>
              <button className="btn" onClick={()=> setEncounters([])}>Clear log</button>
            </div>
          </div>

          <div style={{marginTop:8, maxHeight:160, overflow:"auto"}}>
            {encounters.length===0 ? <div className="small-muted">No logs yet</div> : encounters.map(e=>{
              const logStyle = getLogColor(e);
              return (
                <div 
                  key={e.id} 
                  style={{
                    padding:8,
                    borderBottom:"1px solid rgba(255,255,255,0.02)",
                    background: logStyle.background,
                    color: logStyle.color,
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}
                >
                  <div style={{fontSize:12,color:"var(--muted)"}}>{new Date(e.date).toLocaleString()}</div>
                  <div style={{marginTop:6}}>{e.summary}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{width:320}} className="panel">
          <div style={{fontWeight:800}}>Quick Tools</div>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn" onClick={()=> setPlayers(prev => prev.map(p => ({...p, initiative: (p.initiative || 0) + 1 })))}>+1 Init all</button>
            <button className="btn" onClick={()=> setPlayers(defaultPlayers)}>Reset players</button>
            <button className="btn" onClick={()=> { setMonsters([]); setNotification("Cleared monsters"); }}>Clear monsters</button>
          </div>
        </div>
      </div>

      {playerAttackModal.open && (
        <PlayerAttackModal
          player={playerAttackModal.player}
          onClose={() => setPlayerAttackModal({ open: false, player: null })}
          onAttack={playerAttackMonster}
        />
      )}

      {monsterAttackModal.open && (
        <MonsterAttackModal
          monster={monsterAttackModal.monster}
          onClose={() => setMonsterAttackModal({ open: false, monster: null })}
          onAttack={monsterAttackPlayer}
        />
      )}

      {healModal.open && (
        <HealModal
          type={healModal.type}
          source={healModal.source}
          onClose={() => setHealModal({ open: false, type: null, source: null })}
          onHeal={healTargets}
        />
      )}

      {notification && <div className="notification" onClick={()=>setNotification("")}>{notification}</div>}
    </div>
  );
}

export default App;