// DnD DM Dashboard — single-file React component with database integration
"use client"

import React, { useEffect, useRef, useState } from "react";
import './App.css';
import AiCreateSummaryButton from "./chat/ChatSumaryButton";

// Class images mapping
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

function App() {
  const BASE_API = "https://www.dnd5eapi.co/api";

  // Database API endpoints
  const API = {
    players: '/api/db/players',
    monsters: '/api/db/monsters',
    encounters: '/api/db/encounters',
    battles: '/api/db/dnd',
    stories: '/api/db/stories',
    dailyLogs: '/api/db/daily-logs'
  };

  const defaultPlayers = [
    { name: "Arin", class: "paladin", hpCurrent: 38, hpMax: 38, ac: 18, initiative: 12, lore: "Stalwart defender.", overallDmg: 0 },
    { name: "Lyra", class: "wizard", hpCurrent: 22, hpMax: 22, ac: 12, initiative: 16, lore: "Student of arcane arts.", overallDmg: 0 },
    { name: "Thog", class: "barbarian", hpCurrent: 45, hpMax: 45, ac: 15, initiative: 8, lore: "Mountain-born berserker.", overallDmg: 0 },
    { name: "Miri", class: "rogue", hpCurrent: 24, hpMax: 24, ac: 14, initiative: 14, lore: "Quick hands, quicker wit.", overallDmg: 0 },
  ];

  // state with database integration
  const [players, setPlayers] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [mode, setMode] = useState("normal");
  const [loading, setLoading] = useState(true);

  // Animation states
  const [damageAnimations, setDamageAnimations] = useState({});
  const [healAnimations, setHealAnimations] = useState({});
  const [deathAnimations, setDeathAnimations] = useState({});

  // UI states
  const [selected, setSelected] = useState(null);
  const [notification, setNotification] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [playerAttackModal, setPlayerAttackModal] = useState({ open: false, player: null });
  const [monsterAttackModal, setMonsterAttackModal] = useState({ open: false, monster: null });
  const [healModal, setHealModal] = useState({ open: false, type: null, source: null });
  const [editingField, setEditingField] = useState(null);
  const [quickAttackModal, setQuickAttackModal] = useState({ open: false, source: null, sourceType: null });
  const [quickHealModal, setQuickHealModal] = useState({ open: false, targetType: null });
  const [monsterSearchModal, setMonsterSearchModal] = useState(false);

  // search suggestions
  const [monsterIndexList, setMonsterIndexList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [monsterIndexInput, setMonsterIndexInput] = useState("");
  const suggestTimeout = useRef(null);
  const searchInputRef = useRef(null);
  const dragRef = useRef(null);

  // Class icons fallback
  const classIcons = {
    paladin: "⚔️",
    druid: "🌿",
    monk: "☯️",
    wizard: "🔮",
    barbarian: "🪓",
    rogue: "🗡️",
    cleric: "✝️",
    ranger: "🏹",
    fighter: "🛡️",
    sorcerer: "🌀",
    bard: "🎵",
    warlock: "🔗",
  };

  // Load mode from localStorage after component mounts
  useEffect(() => {
    const savedMode = localStorage.getItem("dm_mode");
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("dm_mode", mode);
    }
  }, [mode]);

  // Load data from database on component mount
  useEffect(() => {
    loadFromDatabase();
  }, []);

  // Automatically save unsynced players and monsters
  useEffect(() => {
    const saveUnsynchronized = async () => {
      // Save unsynced players
      const unsyncedPlayers = players.filter(p => !p.synced);
      for (const player of unsyncedPlayers) {
        const savedPlayer = await savePlayer(player);
        setPlayers(prev => prev.map(p => 
          p.id === player.id ? { ...savedPlayer, synced: true } : p
        ));
      }

      // Save unsynced monsters
      const unsyncedMonsters = monsters.filter(m => !m.synced);
      for (const monster of unsyncedMonsters) {
        const savedMonster = await saveMonster(monster);
        setMonsters(prev => prev.map(m => 
          m.id === monster.id ? { ...savedMonster, synced: true } : m
        ));
      }
    };

    if (players.some(p => !p.synced) || monsters.some(m => !m.synced)) {
      saveUnsynchronized();
    }
  }, [players, monsters]);

  // Database functions
  const loadFromDatabase = async () => {
    try {
      setLoading(true);
      
      const [playersRes, monstersRes, encountersRes, dailyLogsRes] = await Promise.all([
        fetch(API.players),
        fetch(API.monsters),
        fetch(API.encounters),
        fetch(API.dailyLogs)
      ]);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        const formattedPlayers = playersData.length ? playersData.map(p => ({
          id: p.id,
          name: p.name,
          className: p.class,
          hp: p.hpCurrent,
          maxHp: p.hpMax,
          ac: p.ac,
          initiative: p.initiative,
          lore: p.lore || "",
          overallDmg: p.overallDmg || 0,
          synced: true
        })) : defaultPlayers.map(p => ({ 
          ...p, 
          id: `p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          className: p.class,
          synced: false
        }));
        setPlayers(formattedPlayers);
      }

      if (monstersRes.ok) {
        const monstersData = await monstersRes.json();
        setMonsters(monstersData.map(m => ({ ...m, synced: true })));
      }

      if (encountersRes.ok) {
        const encountersData = await encountersRes.json();
        setEncounters(encountersData.map(e => ({
          id: e.id,
          date: e.occurredAt,
          summary: e.summary,
          type: e.type
        })));
      }

      if (dailyLogsRes.ok) {
        const dailyLogsData = await dailyLogsRes.json();
        setDailyLogs(dailyLogsData);
      }
    } catch (error) {
      console.error('Error loading from database:', error);
      setNotification('Error loading data');
      // Fallback to localStorage if database fails
      if (typeof window !== 'undefined') {
        const localPlayers = localStorage.getItem("dm_players");
        const localMonsters = localStorage.getItem("dm_monsters");
        const localEncounters = localStorage.getItem("dm_encounters");
        
        if (localPlayers) setPlayers(JSON.parse(localPlayers));
        else setPlayers(defaultPlayers.map(p => ({ 
          ...p, 
          id: `p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          className: p.class,
          synced: false
        })));
        
        if (localMonsters) setMonsters(localMonsters ? JSON.parse(localMonsters) : []);
        if (localEncounters) setEncounters(localEncounters ? JSON.parse(localEncounters) : []);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save player
  const savePlayer = async (player) => {
    try {
      const response = await fetch(API.players, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: player.name,
          class: player.className,
          hpCurrent: player.hp,
          hpMax: player.maxHp,
          ac: player.ac,
          initiative: player.initiative,
          lore: player.lore,
          overallDmg: player.overallDmg || 0
        })
      });

      if (response.ok) {
        const savedPlayer = await response.json();
        console.log('Player saved to DB:', savedPlayer);
        return { ...player, id: savedPlayer.id, synced: true };
      }
    } catch (error) {
      console.error('Error saving player:', error);
    }
    return { ...player, synced: false };
  };

  // Save monster
  const saveMonster = async (monster) => {
    try {
      const response = await fetch(API.monsters, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: monster.name,
          index: monster.index,
          hp: monster.hp,
          maxHp: monster.maxHp,
          ac: monster.ac,
          initiative: monster.initiative,
          fullData: monster.fullData,
          description: monster.description
        })
      });

      if (response.ok) {
        const savedMonster = await response.json();
        console.log('Monster saved to DB:', savedMonster);
        return { ...monster, id: savedMonster.id, synced: true };
      }
    } catch (error) {
      console.error('Error saving monster:', error);
    }
    return { ...monster, synced: false };
  };

  const saveEncounter = async (encounter) => {
    try {
      const response = await fetch(API.encounters, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: encounter.summary?.substring(0, 50),
          summary: encounter.summary,
          type: encounter.type,
          metadata: encounter,
          players: players.map(p => ({
            heroId: p.id,
            hp: p.hp,
            maxHp: p.maxHp,
            ac: p.ac,
            initiative: p.initiative
          })),
          monsters: monsters.map(m => ({
            monsterId: m.id,
            hp: m.hp,
            maxHp: m.maxHp,
            ac: m.ac,
            initiative: m.initiative
          }))
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error saving encounter:', error);
    }
    return encounter;
  };

  const saveDailyLog = async (content, type = 'note') => {
    try {
      const response = await fetch(API.dailyLogs, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type
        })
      });

      if (response.ok) {
        const newLog = await response.json();
        setDailyLogs(prev => [newLog, ...prev]);
        return newLog;
      }
    } catch (error) {
      console.error('Error saving daily log:', error);
    }
    return null;
  };

  const deletePlayerFromDB = async (playerId) => {
    try {
      await fetch(API.players, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId })
      });
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const deleteMonsterFromDB = async (monsterId) => {
    try {
      await fetch(API.monsters, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: monsterId })
      });
    } catch (error) {
      console.error('Error deleting monster:', error);
    }
  };

  // Quick log functions
  const quickLogSession = async () => {
    const note = prompt("Enter session log:");
    if (note) {
      await saveDailyLog(note, 'session');
      setNotification("Session logged");
    }
  };

  const quickDiceRoll = () => {
    const expr = prompt("Enter dice expression (e.g., 2d6+3):", "1d20");
    if (expr) {
      const result = rollDice(expr);
      setNotification(`${expr} = ${result.total} (${result.details})`);
    }
  };

  // Animation triggers
  const triggerDamageAnimation = (id, type) => {
    const key = `${type}_${id}`;
    setDamageAnimations(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setDamageAnimations(prev => ({ ...prev, [key]: false }));
    }, 600);
  };

  const triggerHealAnimation = (id, type) => {
    const key = `${type}_${id}`;
    setHealAnimations(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setHealAnimations(prev => ({ ...prev, [key]: false }));
    }, 600);
  };

  const triggerDeathAnimation = (id, type) => {
    const key = `${type}_${id}`;
    setDeathAnimations(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setDeathAnimations(prev => ({ ...prev, [key]: false }));
      // Automatically remove from database after animation
      if (type === 'monster') {
        deleteMonster(id);
      }
    }, 2000);
  };

  // select inspector
  const openPlayerInspector = (player) => { 
    setSelected({ type: "player", item: player }); 
  };

  const openMonsterInspector = async (monster) => {
    if (monster.fullData) { 
      setSelected({ type: "monster", item: monster }); 
      return; 
    }
    setNotification("Fetching monster details...");
    const data = await fetchMonster(monster.index || monster.name);
    setNotification("");
    if (!data) { 
      setSelected({ type: "monster", item: monster }); 
      return; 
    }
    const ac = Array.isArray(data.armor_class) ? (data.armor_class[0]?.value ?? data.armor_class[0]) : data.armor_class ?? 10;
    setMonsters(prev => prev.map(m => m.id === monster.id ? { 
      ...m, 
      fullData: data, 
      ac, 
      hp: data.hit_points ?? m.hp, 
      maxHp: data.hit_points ?? m.maxHp, 
      description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || m.description, 
      synced: false 
    } : m));
    const updated = { 
      ...monster, 
      fullData: data, 
      ac, 
      hp: data.hit_points ?? monster.hp, 
      maxHp: data.hit_points ?? monster.maxHp, 
      description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || monster.description 
    };
    setSelected({ type: "monster", item: updated });
  };

  // hp changes and deletes with animations
  const changePlayerHp = (playerId, delta) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { 
      ...p, 
      hp: Math.max(0, Math.min(p.maxHp ?? 9999, (p.hp||0) + delta)), 
      synced: false 
    } : p));
    
    if (delta < 0) {
      triggerDamageAnimation(playerId, 'player');
    } else if (delta > 0) {
      triggerHealAnimation(playerId, 'player');
    }
  };

  const setPlayerHp = (playerId, value) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    const oldHp = player.hp;
    const newHp = Math.max(0, Math.min(player.maxHp ?? value, value));
    const delta = newHp - oldHp;
    
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, hp: newHp, synced: false } : p));
    
    if (delta < 0) {
      triggerDamageAnimation(playerId, 'player');
    } else if (delta > 0) {
      triggerHealAnimation(playerId, 'player');
    }
  };

  const changeMonsterHp = (monsterId, delta) => {
    setMonsters(prev => prev.map(m => {
      if (m.id === monsterId) {
        const newHp = Math.max(0, Math.min(m.maxHp ?? 9999, (m.hp||0) + delta));
        const isDead = newHp <= 0 && m.hp > 0; // Check if just died
        
        if (isDead) {
          triggerDeathAnimation(monsterId, 'monster');
        }

        return { 
          ...m, 
          hp: newHp, 
          synced: false 
        };
      }
      return m;
    }));
    
    if (delta < 0) {
      triggerDamageAnimation(monsterId, 'monster');
    } else if (delta > 0) {
      triggerHealAnimation(monsterId, 'monster');
    }
  };

  const setMonsterHp = (monsterId, value) => {
    const monster = monsters.find(m => m.id === monsterId);
    if (!monster) return;
    
    const oldHp = monster.hp;
    const newHp = Math.max(0, Math.min(monster.maxHp ?? value, value));
    const delta = newHp - oldHp;
    
    setMonsters(prev => prev.map(m => m.id === monsterId ? { ...m, hp: newHp, synced: false } : m));
    
    if (delta < 0) {
      triggerDamageAnimation(monsterId, 'monster');
    } else if (delta > 0) {
      triggerHealAnimation(monsterId, 'monster');
    }
  };

  const deletePlayer = async (playerId) => { 
    setPlayers(prev => prev.filter(p => p.id !== playerId)); 
    await deletePlayerFromDB(playerId);
    setNotification("Player removed"); 
    if (selected?.type==='player' && selected.item.id===playerId) { 
      setSelected(null); 
    } 
  };

  const deleteMonster = async (monsterId) => { 
    setMonsters(prev => prev.filter(m => m.id !== monsterId)); 
    await deleteMonsterFromDB(monsterId);
    setNotification("Monster removed"); 
    if (selected?.type==='monster' && selected.item.id===monsterId) { 
      setSelected(null); 
    } 
  };

  // player attack on monster
  const playerAttackMonster = async (playerId, monsterIds, damage) => {
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
      p.id === playerId ? { ...p, overallDmg: (p.overallDmg || 0) + totalDamage, synced: false } : p
    ));

    const msg = `${player.name} -> ${monsterIds.length} target(s): ${damage} damage each (total: ${totalDamage})`;
    await saveEncounter({ summary: msg, type: 'player_attack' });
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg, type: 'player_attack' }, ...prev].slice(0,80));
    setNotification(msg);
    setPlayerAttackModal({ open: false, player: null });
    setQuickAttackModal({ open: false, source: null, sourceType: null });
  };

  // monster attack on players
  const monsterAttackPlayer = async (monsterId, playerIds, damage) => {
    const monster = monsters.find(m => m.id === monsterId);
    
    if (!monster) {
      setNotification("Invalid monster");
      return;
    }

    playerIds.forEach(playerId => {
      changePlayerHp(playerId, -damage);
    });

    const msg = `${monster.name} -> ${playerIds.length} player(s): ${damage} damage each`;
    await saveEncounter({ summary: msg, type: 'monster_attack' });
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg, type: 'monster_attack' }, ...prev].slice(0,80));
    setNotification(msg);
    setMonsterAttackModal({ open: false, monster: null });
    setQuickAttackModal({ open: false, source: null, sourceType: null });
  };

  // heal targets
  const healTargets = async (targetIds, healAmount, source, isPlayerSource) => {
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
    await saveEncounter({ summary: msg, type: 'heal' });
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg, type: 'heal' }, ...prev].slice(0,80));
    setNotification(msg);
    setHealModal({ open: false, type: null, source: null });
    setQuickHealModal({ open: false, targetType: null });
  };

  // quick heal function for the new modal
  const quickHealTargets = async (targetIds, healAmount, targetType) => {
    targetIds.forEach(targetId => {
      if (targetType === 'players') {
        changePlayerHp(targetId, healAmount);
      } else {
        changeMonsterHp(targetId, healAmount);
      }
    });

    const msg = `DM -> ${targetIds.length} ${targetType}(s): ${healAmount} heal each`;
    await saveEncounter({ summary: msg, type: 'dm_heal' });
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg, type: 'dm_heal' }, ...prev].slice(0,80));
    setNotification(msg);
    setQuickHealModal({ open: false, targetType: null });
  };

  // update player stats
  const updatePlayerStat = (playerId, field, value) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, [field]: value, synced: false } : p
    ));
  };

  // update monster stats
  const updateMonsterStat = (monsterId, field, value) => {
    setMonsters(prev => prev.map(m => 
      m.id === monsterId ? { ...m, [field]: value, synced: false } : m
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
  const onDragStart = (e, id, listType) => { 
    dragRef.current = { id, listType }; 
    e.dataTransfer.effectAllowed = "move"; 
  };

  const onDragOver = (e) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move"; 
  };

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
      const anchored = copy.map((pl, i) => ({ ...pl, initiative: (copy.length - i) * 5, synced: false }));
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
      let total = 0; 
      const details = [];
      // split by +
      const plusParts = cleaned.split("+");
      for (const part of plusParts) {
        if (!part) continue;
        if (part.includes("d")) {
          const [nStr, sStr] = part.split("d");
          const n = nStr === "" ? 1 : parseInt(nStr,10);
          const s = parseInt(sStr,10);
          let sum = 0; 
          const rolls = [];
          for (let i=0;i<n;i++){ 
            const r = Math.floor(Math.random()*s)+1; 
            rolls.push(r); 
            sum += r; 
          }
          total += sum; 
          details.push(`${part}=>[${rolls.join(",")}]`);
        } else {
          const v = parseInt(part,10); 
          if (!isNaN(v)) { 
            total += v; 
            details.push(String(v)); 
          }
        }
      }
      return { total, details: details.join(" ; ") };
    } catch (err) { 
      return { total: 0, details: "err" }; 
    }
  };

  // monster attack vs player
  const rollMonsterAttack = async ({ monster, targetPlayerId, attackBonus = 0, dmgExpr = "1d6" }) => {
    const target = players.find(p => p.id === targetPlayerId);
    if (!target) { 
      setNotification("Select a valid player target"); 
      return null; 
    }
    const d20 = Math.floor(Math.random()*20)+1;
    const attackTotal = d20 + Number(attackBonus || 0);
    const nat20 = d20 === 20; 
    const nat1 = d20 === 1;
    const hit = nat20 ? true : (attackTotal >= (target.ac || 10));
    let dmgRes = { total: 0, details: "" };
    if (hit) { 
      dmgRes = rollDice(dmgExpr); 
      if (nat20) { 
        const extra = rollDice(dmgExpr); 
        dmgRes.total += extra.total; 
        dmgRes.details += ` ; CRIT_EXTRA ${extra.details}`; 
      } 
      changePlayerHp(targetPlayerId, -dmgRes.total); 
    }
    const msg = `${monster.name} -> ${target.name}: d20=${d20}+${attackBonus}=${attackTotal} → ${hit ? `HIT ${dmgRes.total} (${dmgRes.details})` : "MISS"}${nat20 ? " (CRIT)" : nat1 ? " (NAT1)" : ""}`;
    await saveEncounter({ summary: msg, type: 'monster_attack_roll' });
    setEncounters(prev => [{ id: "e_" + Date.now(), date: new Date().toISOString(), summary: msg, type: 'monster_attack_roll' }, ...prev].slice(0,80));
    setNotification(msg);
    return { d20, attackTotal, hit, dmgRes };
  };

  // quick format speed
  const formatSpeed = speed => {
    if (!speed) return "—"; 
    if (typeof speed === "string") return speed;
    return Object.entries(speed).map(([k,v])=>`${k} ${v}`).join(" • ");
  };

  // export/import
  const exportState = () => {
    const payload = { players, monsters, encounters, mode };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = "dm_state.json"; 
    a.click(); 
    URL.revokeObjectURL(url);
  };
  
  const importState = (e) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { 
        const parsed = JSON.parse(reader.result); 
        if (parsed.players) setPlayers(parsed.players.map(p => ({ ...p, synced: false }))); 
        if (parsed.monsters) setMonsters(parsed.monsters.map(m => ({ ...m, synced: false }))); 
        if (parsed.encounters) setEncounters(parsed.encounters); 
        if (parsed.mode) setMode(parsed.mode); 
        setNotification("Imported"); 
      } catch { 
        setNotification("Invalid file"); 
      }
    };
    reader.readAsText(file);
  };

  // get HP color based on percentage
  const getHpColor = (hp, maxHp) => {
    if (maxHp <= 0) return '#0a0e11';
    const percentage = (hp / maxHp) * 100;
    if (percentage <= 30) return 'rgba(255, 0, 0, 0.3)';
    if (percentage <= 60) return 'rgba(255, 165, 0, 0.3)';
    return 'rgba(255, 255, 255, 0.01)';
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
          return { background: 'rgba(255, 0, 0, 0.2)', color: '#ff6b6b' };
        } else {
          return { background: 'rgba(255, 165, 0, 0.2)', color: '#ffa500' };
        }
      }
    }
    
    // Check for heal logs
    if (summary.includes('heal')) {
      return { background: 'rgba(0, 255, 0, 0.2)', color: '#90ee90' };
    }
    
    // Default
    return { background: 'transparent', color: 'inherit' };
  };

  // Add new player with database integration
  const addNewPlayer = async (playerData = {}) => {
    const newPlayer = {
      id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2,7),
      name: playerData.name || "New Hero",
      className: playerData.className || "fighter",
      hp: playerData.hp ?? 20,
      maxHp: playerData.maxHp ?? 20,
      ac: playerData.ac ?? 14,
      initiative: playerData.initiative ?? 10,
      lore: playerData.lore || "A new hero joins the adventure!",
      overallDmg: playerData.overallDmg || 0,
      synced: false
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    setNotification(`${newPlayer.name} added`);
    // Automatically save to database through useEffect
  };

  // Monster search functions
  const fetchMonster = async (index) => {
    try {
      const res = await fetch(`${BASE_API}/monsters/${index}`);
      if (res.ok) return await res.json();
      return null;
    } catch (error) {
      console.error('Error fetching monster:', error);
      return null;
    }
  };

  const onSearchChange = async (value) => {
    setMonsterIndexInput(value);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    
    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    suggestTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_API}/monsters`);
        if (res.ok) {
          const data = await res.json();
          setMonsterIndexList(data.results || []);
          const filtered = data.results.filter(m => 
            m.name.toLowerCase().includes(value.toLowerCase()) || 
            m.index.toLowerCase().includes(value.toLowerCase())
          );
          setSuggestions(filtered.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching monster list:', error);
      }
    }, 300);
  };

  const addMonsterFromSuggestion = async (suggestion) => {
    setLoadingIndex(suggestion.index);
    const data = await fetchMonster(suggestion.index);
    setLoadingIndex(null);
    
    if (!data) {
      setNotification(`Failed to fetch ${suggestion.name}`);
      return;
    }

    const ac = Array.isArray(data.armor_class) ? (data.armor_class[0]?.value ?? data.armor_class[0]) : data.armor_class ?? 10;
    const newMonster = {
      id: "m_" + Date.now() + "_" + Math.random().toString(36).slice(2,7),
      name: data.name,
      index: data.index,
      hp: data.hit_points || 30,
      maxHp: data.hit_points || 30,
      ac: ac,
      initiative: 10,
      fullData: data,
      description: Array.isArray(data.desc) ? data.desc.join("\n\n") : data.desc || "",
      synced: false
    };

    setMonsters(prev => [...prev, newMonster]);
    setMonsterSearchModal(false);
    setMonsterIndexInput("");
    setSuggestions([]);
    setNotification(`${newMonster.name} added`);
    // Automatically save to database through useEffect
  };

  // Image component with fallback
  const ClassImage = ({ className, size = 'normal' }) => {
    const [imgError, setImgError] = useState(false);
    
    const handleError = () => {
      setImgError(true);
    };

    if (imgError || !classImages[className]) {
      return <div style={{fontSize: size === 'large' ? '32px' : '24px'}}>{classIcons[className] || "❓"}</div>;
    }

    return (
      <img 
        src={classImages[className]} 
        alt={className}
        onError={handleError}
        style={{ 
          width: size === 'large' ? '64px' : '40px',
          height: size === 'large' ? '64px' : '40px',
          objectFit: 'contain',
          borderRadius: '8px'
        }}
      />
    );
  };

  // ---------- PLAYER CREATOR COMPONENT ----------
// ---------- PLAYER CREATOR COMPONENT ----------
const PlayerCreator = ({ onAdd }) => {
  const [modeLocal, setModeLocal] = useState("form");
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [rawInputData, setRawInputData] = useState(null);
  const [showRawInput, setShowRawInput] = useState(false);
  const dropRef = useRef(null);

  // drag & drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => { 
      e.preventDefault(); 
      el.classList.add('dragover'); 
    };
    const onDragLeave = (e) => { 
      e.preventDefault(); 
      el.classList.remove('dragover'); 
    };
    const onDrop = (e) => {
      e.preventDefault();
      el.classList.remove('dragover');
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  const handleFile = (f) => {
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setNotification("Please select an image file");
    }
  };

  const onFileInput = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    handleFile(f);
  };

  const clearForm = () => {
    setTextInput("");
    setFile(null);
    setFilePreview(null);
    setExtracted(null);
    setRawInputData(null);
    setShowRawInput(false);
    setModeLocal("form");
  };

  const callAiExtract = async ({ imageFile, text }) => {
    setLoadingExtract(true);
    setNotification("Extracting data from input...");
    
    // Store what we're sending to the AI
    const inputData = {
      text: text || "",
      hasImage: !!imageFile,
      imageFileName: imageFile?.name || null,
      timestamp: new Date().toISOString()
    };
    setRawInputData(inputData);
    
    try {
      const form = new FormData();
      if (imageFile) form.append('file', imageFile);
      form.append('text', text || "");
      
      const res = await fetch('/api/ai/player-extract', {
        method: 'POST',
        body: form
      });
      
      if (res.ok) {
        const data = await res.json();
        setExtracted(data);
        setModeLocal("preview");
        setNotification("Extraction complete");
        return data;
      } else {
        const errorText = await res.text();
        console.error("AI extract error:", errorText);
        setNotification("AI extraction failed");
      }
    } catch (err) {
      console.error("callAiExtract error:", err);
      setNotification("AI extraction error");
    } finally {
      setLoadingExtract(false);
    }
    return null;
  };

  const onSubmitText = async () => {
    if (!textInput.trim()) {
      setNotification("Please enter some text to analyze");
      return;
    }
    await callAiExtract({ text: textInput, imageFile: null });
  };

  const onSubmitFile = async () => {
    if (!file) { 
      setNotification("No file selected"); 
      return; 
    }
    await callAiExtract({ imageFile: file, text: textInput });
  };

  const onAddPlayer = () => {
    if (!extracted) return;
    const p = {
      name: extracted.name || "New Hero",
      className: extracted.className || "fighter",
      hp: extracted.hp ?? (extracted.maxHp ?? 20),
      maxHp: extracted.maxHp ?? (extracted.hp ?? 20),
      ac: extracted.ac ?? 10,
      initiative: extracted.initiative ?? 10,
      lore: extracted.lore || "",
      overallDmg: 0,
      strength: extracted.strength || 10,
      dexterity: extracted.dexterity || 10,
      constitution: extracted.constitution || 10,
      intelligence: extracted.intelligence || 10,
      wisdom: extracted.wisdom || 10,
      charisma: extracted.charisma || 10,
    };
    onAdd(p);
    setModeLocal("result");
  };

  const onDeletePreview = () => {
    setExtracted(null);
    setRawInputData(null);
    setShowRawInput(false);
    setModeLocal('form');
    setNotification("Preview cleared");
  };

  return (
    <div className="player-creator-container">
      <div className="player-creator-header">
        <h3>Player Creator</h3>
        <div className="creator-subtitle">AI extract from text or image</div>
      </div>

      {modeLocal === 'form' && (
        <div className="creator-form-container">
          <div className="creator-input-section">
            <div className="text-input-section">
              <div className="creator-subtitle">Paste / type character text (bio, stats, etc.)</div>
              <textarea 
                className="text-input-area" 
                value={textInput} 
                onChange={e => setTextInput(e.target.value)} 
                placeholder="e.g. Name: Mira&#10;Class: Ranger&#10;HP: 28/28&#10;AC: 14&#10;Initiative: 12&#10;Lore: A skilled tracker from the northern woods..."
              />
              <div className="creator-button-group">
                <button className="creator-btn primary" onClick={onSubmitText} disabled={loadingExtract}>
                  {loadingExtract ? (
                    <span className="creator-loading">
                      <div className="loading-spinner"></div>
                      Extracting...
                    </span>
                  ) : "Extract from text"}
                </button>
                <button className="creator-btn secondary" onClick={() => { 
                  setTextInput("Name: Valeria\nClass: Rogue\nHP: 24/24\nAC: 15\nInitiative: 14\nLore: A cunning rogue with a mysterious past."); 
                }}>
                  Fill example
                </button>
                <button className="creator-btn secondary" onClick={clearForm}>
                  Clear
                </button>
              </div>
            </div>

            <div className="image-input-section">
              <div className="creator-subtitle">Or drop / upload a character image</div>
              <div 
                ref={dropRef} 
                className={`image-upload-area ${filePreview ? 'has-image' : ''}`}
              >
                {filePreview ? (
                  <img src={filePreview} alt="preview" className="image-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-placeholder-icon">📷</div>
                    <div>Drag & Drop image here</div>
                    <div style={{fontSize: '12px', marginTop: '4px', opacity: 0.6}}>or click to browse</div>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="file-input-hidden" 
                  onChange={onFileInput} 
                />
              </div>

              <div className="creator-button-group">
                <button 
                  className="creator-btn primary" 
                  onClick={onSubmitFile} 
                  disabled={loadingExtract || !file}
                >
                  {loadingExtract ? (
                    <span className="creator-loading">
                      <div className="loading-spinner"></div>
                      Extracting...
                    </span>
                  ) : "Extract from image"}
                </button>
                <button 
                  className="creator-btn secondary" 
                  onClick={() => { setFile(null); setFilePreview(null); }}
                  disabled={!file}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modeLocal === 'preview' && extracted && (
        <div className="preview-section">
          <div className="preview-header">
            <h4>Preview — Extracted Player</h4>
            <div className="preview-controls">
              <button 
                className="creator-btn secondary" 
                onClick={() => setShowRawInput(!showRawInput)}
                style={{ marginRight: 'auto' }}
              >
                {showRawInput ? "Hide Raw Input" : "Show Raw Input"}
              </button>
              <div className="creator-button-group">
                <button className="creator-btn secondary" onClick={onDeletePreview}>
                  Cancel
                </button>
                <button className="creator-btn primary" onClick={onAddPlayer}>
                  Add to Players
                </button>
              </div>
            </div>
          </div>

          {showRawInput && rawInputData && (
            <div className="raw-input-panel">
              <h5>What AI Received:</h5>
              <div className="raw-input-content">
                {rawInputData.hasImage && (
                  <div className="raw-input-image">
                    <strong>Image:</strong> {rawInputData.imageFileName}
                    {filePreview && (
                      <img 
                        src={filePreview} 
                        alt="Submitted to AI" 
                        className="raw-image-preview"
                      />
                    )}
                  </div>
                )}
                {rawInputData.text && (
                  <div className="raw-input-text">
                    <strong>Text:</strong>
                    <textarea 
                      readOnly
                      value={rawInputData.text}
                      className="raw-text-display"
                    />
                  </div>
                )}
                <div className="raw-input-meta">
                  <small>Submitted: {new Date(rawInputData.timestamp).toLocaleString()}</small>
                </div>
              </div>
            </div>
          )}

          <div className="preview-content">
            <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px'}}>
              <div style={{fontSize: '48px'}}>
                <ClassImage className={extracted.className || 'fighter'} size="large" />
              </div>
              <div style={{flex: 1}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '8px'}}>
                  <input 
                    className="preview-input-large"
                    value={extracted.name || "Unnamed Hero"}
                    onChange={e => setExtracted(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Character name"
                  />
                </div>
                <div className="creator-subtitle" style={{fontSize: '16px'}}>
                  <select 
                    value={extracted.className || 'fighter'}
                    onChange={e => setExtracted(prev => ({ ...prev, className: e.target.value }))}
                    className="preview-select"
                  >
                    {Object.keys(classIcons).map(cls => (
                      <option key={cls} value={cls}>
                        {cls.charAt(0).toUpperCase() + cls.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="preview-grid">
              <div className="preview-field">
                <label className="preview-label">Current HP</label>
                <input 
                  className="preview-input"
                  type="number" 
                  value={extracted.hp ?? extracted.maxHp ?? 20} 
                  onChange={e => setExtracted(prev => ({ ...prev, hp: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div className="preview-field">
                <label className="preview-label">Max HP</label>
                <input 
                  className="preview-input"
                  type="number" 
                  value={extracted.maxHp ?? extracted.hp ?? 20} 
                  onChange={e => setExtracted(prev => ({ ...prev, maxHp: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div className="preview-field">
                <label className="preview-label">Armor Class</label>
                <input 
                  className="preview-input"
                  type="number" 
                  value={extracted.ac ?? 10} 
                  onChange={e => setExtracted(prev => ({ ...prev, ac: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div className="preview-field">
                <label className="preview-label">Initiative</label>
                <input 
                  className="preview-input"
                  type="number" 
                  value={extracted.initiative ?? 10} 
                  onChange={e => setExtracted(prev => ({ ...prev, initiative: parseInt(e.target.value) || 0 }))} 
                />
              </div>
            </div>

            <div style={{marginTop: '20px'}}>
              <label className="preview-label">Character Lore & Notes</label>
              <textarea 
                className="text-input-area"
                value={extracted.lore || ""} 
                onChange={e => setExtracted(prev => ({ ...prev, lore: e.target.value }))} 
                style={{minHeight: '120px', marginTop: '8px'}}
                placeholder="Character background, personality, and notes..."
              />
            </div>

            {/* Ability Scores */}
            <div style={{marginTop: '20px'}}>
              <label className="preview-label">Ability Scores</label>
              <div className="preview-grid" style={{marginTop: '8px'}}>
                <div className="preview-field">
                  <label className="preview-label-small">Strength</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.strength || 10} 
                    onChange={e => setExtracted(prev => ({ ...prev, strength: parseInt(e.target.value) || 10 }))} 
                    min="1"
                    max="30"
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Dexterity</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.dexterity || 10} 
                    onChange={e => setExtracted(prev => ({ ...prev, dexterity: parseInt(e.target.value) || 10 }))} 
                    min="1"
                    max="30"
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Constitution</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.constitution || 10} 
                    onChange={e => setExtracted(prev => ({ ...prev, constitution: parseInt(e.target.value) || 10 }))} 
                    min="1"
                    max="30"
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Intelligence</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.intelligence || 10} 
                    onChange={e => setExtracted(prev => ({ ...prev, intelligence: parseInt(e.target.value) || 10 }))} 
                    min="1"
                    max="30"
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Wisdom</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.wisdom || 10} 
                    onChange={e => setExtracted(prev => ({ ...prev, wisdom: parseInt(e.target.value) || 10 }))} 
                    min="1"
                    max="30"
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Charisma</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.charisma || 10} 
                    onChange={e => setExtracted(prev => ({ ...prev, charisma: parseInt(e.target.value) || 10 }))} 
                    min="1"
                    max="30"
                  />
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div style={{marginTop: '20px'}}>
              <label className="preview-label">Additional Information</label>
              <div className="preview-grid" style={{marginTop: '8px'}}>
                <div className="preview-field">
                  <label className="preview-label-small">Level</label>
                  <input 
                    className="preview-input"
                    type="number" 
                    value={extracted.level || 1} 
                    onChange={e => setExtracted(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))} 
                    min="1"
                    max="20"
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Race</label>
                  <input 
                    className="preview-input"
                    type="text" 
                    value={extracted.race || ""} 
                    onChange={e => setExtracted(prev => ({ ...prev, race: e.target.value }))} 
                    placeholder="Human, Elf, etc."
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Background</label>
                  <input 
                    className="preview-input"
                    type="text" 
                    value={extracted.background || ""} 
                    onChange={e => setExtracted(prev => ({ ...prev, background: e.target.value }))} 
                    placeholder="Noble, Soldier, etc."
                  />
                </div>
                <div className="preview-field">
                  <label className="preview-label-small">Alignment</label>
                  <select 
                    value={extracted.alignment || "neutral"}
                    onChange={e => setExtracted(prev => ({ ...prev, alignment: e.target.value }))}
                    className="preview-input"
                  >
                    <option value="lawful good">Lawful Good</option>
                    <option value="neutral good">Neutral Good</option>
                    <option value="chaotic good">Chaotic Good</option>
                    <option value="lawful neutral">Lawful Neutral</option>
                    <option value="neutral">Neutral</option>
                    <option value="chaotic neutral">Chaotic Neutral</option>
                    <option value="lawful evil">Lawful Evil</option>
                    <option value="neutral evil">Neutral Evil</option>
                    <option value="chaotic evil">Chaotic Evil</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modeLocal === 'result' && (
        <div className="success-state">
          <div className="success-icon">✅</div>
          <div className="success-message">
            Player successfully added to your campaign!
          </div>
          <div className="creator-button-group" style={{justifyContent: 'center'}}>
            <button className="creator-btn primary" onClick={clearForm}>
              Create Another Player
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
  // ---------- END PLAYER CREATOR ----------

  // Monster Search Modal Component
  const MonsterSearchModal = () => {
    return (
      <div className="modal-overlay" onClick={() => setMonsterSearchModal(false)}>
        <div className="monster-search-modal" onClick={e => e.stopPropagation()}>
          <div className="monster-search-header">
            <h2 style={{margin: 0}}>Search Monsters</h2>
            <button className="btn" onClick={() => setMonsterSearchModal(false)} style={{padding: '4px 8px'}}>✕</button>
          </div>
          
          <input
            ref={searchInputRef}
            className="input monster-search-input"
            placeholder="Type at least 3 characters to see suggestions..."
            value={monsterIndexInput}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
          />

          {monsterIndexInput.length > 0 && monsterIndexInput.length < 3 && (
            <div className="monster-search-info">
              Type at least 3 characters to see suggestions
            </div>
          )}

          {suggestions.length > 0 ? (
            <div className="monster-search-suggestions">
              {suggestions.map(s => (
                <div 
                  key={s.index} 
                  className="monster-search-suggestion"
                  onClick={() => addMonsterFromSuggestion(s)}
                >
                  <div>
                    <div style={{fontWeight: 600}}>{s.name}</div>
                    <div className="small-muted" style={{fontSize: 12}}>Index: {s.index}</div>
                  </div>
                  <div className="small-muted" style={{fontSize: 12}}>Click to add</div>
                </div>
              ))}
            </div>
          ) : monsterIndexInput.length >= 3 && (
            <div className="monster-search-info">
              No monsters found matching "{monsterIndexInput}"
            </div>
          )}

          <div style={{marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px'}}>
            <div className="small-muted" style={{textAlign: 'center'}}>
              Search from {monsterIndexList.length} available monsters
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              onChange={(e) => setDamage(e.target.value)}
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

  // Quick Attack Modal Component
  const QuickAttackModal = ({ source, sourceType, onClose, onAttack }) => {
    const [selectedTargetIds, setSelectedTargetIds] = useState([]);
    const [damage, setDamage] = useState("");

    const isPlayerSource = sourceType === 'player';
    const sourceName = isPlayerSource 
      ? players.find(p => p.id === source)?.name 
      : monsters.find(m => m.id === source)?.name;

    const targets = isPlayerSource ? monsters : players;

    const handleAttack = () => {
      if (selectedTargetIds.length === 0 || !damage) {
        setNotification("Select at least one target and enter damage");
        return;
      }
      const dmgValue = parseInt(damage);
      if (isNaN(dmgValue) || dmgValue <= 0) {
        setNotification("Enter valid damage amount");
        return;
      }
      
      if (isPlayerSource) {
        onAttack(source, selectedTargetIds, dmgValue);
      } else {
        onAttack(source, selectedTargetIds, dmgValue);
      }
    };

    const toggleTarget = (targetId) => {
      setSelectedTargetIds(prev => 
        prev.includes(targetId) 
          ? prev.filter(id => id !== targetId)
          : [...prev, targetId]
      );
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0}}>{sourceName} - Quick Attack</h3>
            <button className="btn" onClick={onClose} style={{padding: '4px 8px'}}>✕</button>
          </div>
          
          <div style={{marginBottom: '12px'}}>
            <div className="small-muted">Target {isPlayerSource ? 'Monsters' : 'Players'} (select multiple)</div>
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
                    <span>{t.name} (HP: {t.hp}/{t.maxHp}{!isPlayerSource && `, AC: ${t.ac}`})</span>
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
              style={{background: isPlayerSource ? 'rgba(124, 92, 255, 0.1)' : 'rgba(255, 90, 122, 0.1)', borderColor: isPlayerSource ? 'rgba(124, 92, 255, 0.3)' : 'rgba(255, 90, 122, 0.3)'}}
            >
              Attack ({selectedTargetIds.length} targets)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Quick Heal Modal Component
  const QuickHealModal = ({ targetType, onClose, onHeal }) => {
    const [selectedTargetIds, setSelectedTargetIds] = useState([]);
    const [healAmount, setHealAmount] = useState("");

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
      onHeal(selectedTargetIds, healValue, targetType);
    };

    const toggleTarget = (targetId) => {
      setSelectedTargetIds(prev => 
        prev.includes(targetId) 
          ? prev.filter(id => id !== targetId)
          : [...prev, targetId]
      );
    };

    const targets = targetType === 'players' ? players : monsters;
    const modalTitle = targetType === 'players' ? 'Heal Players' : 'Heal Monsters';

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0}}>{modalTitle}</h3>
            <button className="btn" onClick={onClose} style={{padding: '4px 8px'}}>✕</button>
          </div>
          
          <div style={{marginBottom: '12px'}}>
            <div className="small-muted">Target {targetType === 'players' ? 'Players' : 'Monsters'} (select multiple)</div>
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

  // Quick Attack Section Component
  const QuickAttackSection = () => (
    <div className="quick-attack-section">
      <div style={{fontWeight: 800, marginBottom: '8px'}}>Quick Actions</div>
      <div className="quick-attack-grid">
        {players.map(p => (
          <button 
            key={p.id} 
            className="quick-attack-btn"
            onClick={() => setQuickAttackModal({ open: true, source: p.id, sourceType: 'player' })}
            disabled={p.hp <= 0}
          >
            {p.name} → Monsters
          </button>
        ))}
        {monsters.map(m => (
          <button 
            key={m.id} 
            className="quick-attack-btn"
            onClick={() => setQuickAttackModal({ open: true, source: m.id, sourceType: 'monster' })}
            disabled={m.hp <= 0}
            style={{background: 'rgba(255, 90, 122, 0.1)', borderColor: 'rgba(255, 90, 122, 0.3)', color: '#ff5a7a'}}
          >
            {m.name} → Players
          </button>
        ))}
        <button 
          className="quick-heal-btn"
          onClick={() => setQuickHealModal({ open: true, targetType: 'players' })}
        >
          🩹 Heal Players
        </button>
        <button 
          className="quick-heal-btn"
          onClick={() => setQuickHealModal({ open: true, targetType: 'monsters' })}
        >
          🩹 Heal Monsters
        </button>
      </div>
    </div>
  );

  // Hero Book Component
  const HeroBook = () => {
    const [stories, setStories] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    // Fetch stories only once on component mount
    useEffect(() => {
      if (!hasFetched) {
        const fetchStories = async () => {
          try {
            const res = await fetch(API.stories);
            if (!res.ok) return;
            const data = await res.json();
            setStories(data);
            setHasFetched(true);
          } catch (err) {
            console.error(err);
          }
        };
        fetchStories();
      }
    }, [hasFetched]);

    const handleNext = () => {
      if (currentPage < stories.length - 1) setCurrentPage(currentPage + 1);
    };

    const handlePrev = () => {
      if (currentPage > 0) setCurrentPage(currentPage - 1);
    };

    const handleAddStory = async (summary) => {
      if (!summary) return;
      try {
        setLoading(true);
        const res = await fetch(API.stories, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Story #${stories.length + 1}`,
            text: summary,
            style: 'book',
          }),
        });
        if (!res.ok) return;
        const newStory = await res.json();
        setStories(prev => [newStory, ...prev]);
        setCurrentPage(0);
        // Also save as daily log
        await saveDailyLog(`New story: ${summary}`, 'story');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const currentStory = stories[currentPage];

    return (
      <div className="book-layout">
        <div className="book-container">
          <div className="book">
            <div className="page">
              {currentStory ? (
                <>
                  <h2 className="story-title">{currentStory.title}</h2>
                  <div className="story-content">
                    <p className="story-text">{currentStory.text}</p>
                    {currentStory.hero && (
                      <div className="story-hero">
                        <strong>Hero:</strong> {currentStory.hero.name}
                      </div>
                    )}
                  </div>
                  <div className="story-meta">
                    {currentStory.createdAt && (
                      <div className="story-date">
                        {new Date(currentStory.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-book">
                  <h2>Welcome to the Hero's Journal</h2>
                  <p>No stories recorded yet. Your adventures await!</p>
                  <p>Use the AI Summary button below to generate your first story from recent events.</p>
                </div>
              )}
            </div>
          </div>

          <div className="book-controls">
            <button 
              className="book-nav-btn" 
              onClick={handlePrev} 
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            <span className="page-counter">
              {currentPage + 1} / {Math.max(stories.length, 1)}
            </span>
            <button 
              className="book-nav-btn" 
              onClick={handleNext} 
              disabled={currentPage === stories.length - 1 || stories.length === 0}
            >
              Next →
            </button>
          </div>

          <div className="summary-generator">
            <AiCreateSummaryButton 
              LogData={{ stories, dailyLogs, players }} 
              onSummaryGenerated={handleAddStory} 
              loading={loading}
            />
          </div>
        </div>

        {/* Daily Logs Sidebar */}
        <div className="daily-logs-sidebar">
          <div className="logs-header">
            <h3>Daily Logs</h3>
            <div className="log-actions">
              <button className="log-btn" onClick={quickLogSession}>📝 Log Session</button>
              <button className="log-btn" onClick={quickDiceRoll}>🎲 Quick Roll</button>
            </div>
          </div>
          
          <div className="logs-list">
            {dailyLogs.length === 0 ? (
              <div className="no-logs">No logs yet. Start your adventure!</div>
            ) : (
              dailyLogs.map(log => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <div className="log-date">{new Date(log.createdAt).toLocaleDateString()}</div>
                  <div className="log-content">{log.content}</div>
                  <div className="log-type">{log.type}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main Layout Components
  const LeftPlayers = () => (
    <div className="panel">
      <div style={{display:"flex",justifyContent:"space-between",alignItems: 'center', marginBottom: '10px'}}>
        <div style={{fontWeight:800}}>Players</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={()=> { setPlayers(defaultPlayers.map(p => ({ ...p, id: `p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, className: p.class, synced: false }))); setNotification("Players reset"); }}>Reset</button>
          <button className="btn" onClick={() => addNewPlayer()}>+Player</button>
          <button 
            className="quick-heal-btn"
            onClick={() => setQuickHealModal({ open: true, targetType: 'players' })}
            style={{padding: '6px 10px'}}
          >
            🩹 Heal All
          </button>
        </div>
      </div>

      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
        {players.sort((a,b)=> (b.initiative||0)-(a.initiative||0)).map(p=>{
          const hpColor = getHpColor(p.hp, p.maxHp);
          const isDamageAnim = damageAnimations[`player_${p.id}`];
          const isHealAnim = healAnimations[`player_${p.id}`];
          
          return (
            <div 
              key={p.id} 
              className={`player-card ${isDamageAnim ? 'damage-animation' : ''} ${isHealAnim ? 'heal-animation' : ''}`}
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
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'}}>
                <button 
                  className="quick-attack-btn"
                  onClick={(e) => { e.stopPropagation(); setQuickAttackModal({ open: true, source: p.id, sourceType: 'player' }); }}
                  disabled={p.hp <= 0}
                >
                  ⚔️
                </button>
                <div className="hp-badge">{p.hp}/{p.maxHp}</div>
              </div>

              {/* Floating damage/heal text */}
              {(isDamageAnim || isHealAnim) && (
                <div className={`floating-damage ${isDamageAnim ? 'damage' : 'heal'}`}>
                  {isDamageAnim ? '💥' : '✨'}
                </div>
              )}

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
                  <button className="btn" onClick={() => setQuickAttackModal({ open: true, source: p.id, sourceType: 'player' })}>Attack</button>
                  <button className="btn" onClick={() => setHealModal({ open: true, type: 'player', source: p.id })}>Heal</button>
                  <button className="btn" onClick={async ()=>{ const note = prompt("Log note about player:"); if (note) { 
                    const msg = `${p.name}: ${note}`;
                    await saveEncounter({ summary: msg, type: 'note' });
                    setEncounters(prev=>[{id:"e_"+Date.now(),date:new Date().toISOString(),summary:msg, type: 'note'},...prev].slice(0,80)); 
                  }}}>Log</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const RightMonsters = () => (
    <div className="panel">
      <div style={{display:"flex",justifyContent:"space-between",alignItems: 'center', marginBottom: '10px', position:"relative"}}>
        <div style={{fontWeight:800}}>Monsters</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button 
            className="btn" 
            onClick={() => setMonsterSearchModal(true)}
            style={{background: 'rgba(124, 92, 255, 0.1)', borderColor: 'rgba(124, 92, 255, 0.3)'}}
          >
            🔍 Search Monsters
          </button>
          <button 
            className="quick-heal-btn"
            onClick={() => setQuickHealModal({ open: true, targetType: 'monsters' })}
            style={{padding: '6px 10px'}}
          >
            🩹 Heal All
          </button>
        </div>
      </div>

      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
        {monsters.sort((a,b)=> (b.initiative ?? -1) - (a.initiative ?? -1)).map(m=>{
          const hpColor = getHpColor(m.hp, m.maxHp);
          const isDamageAnim = damageAnimations[`monster_${m.id}`];
          const isHealAnim = healAnimations[`monster_${m.id}`];
          const isDeathAnim = deathAnimations[`monster_${m.id}`];
          
          return (
            <div 
              key={m.id} 
              className={`monster-card ${isDamageAnim ? 'damage-animation' : ''} ${isHealAnim ? 'heal-animation' : ''} ${isDeathAnim ? 'death-animation' : ''}`}
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
              
              {/* Floating damage/heal text */}
              {(isDamageAnim || isHealAnim) && (
                <div className={`floating-damage ${isDamageAnim ? 'damage' : 'heal'}`}>
                  {isDamageAnim ? '💥' : '✨'}
                </div>
              )}

              {/* Floating death text */}
              {isDeathAnim && (
                <div className="floating-death">💀</div>
              )}

              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button 
                  className="quick-attack-btn"
                  onClick={(e) => { e.stopPropagation(); setQuickAttackModal({ open: true, source: m.id, sourceType: 'monster' }); }}
                  disabled={m.hp <= 0}
                  style={{background: 'rgba(255, 90, 122, 0.1)', borderColor: 'rgba(255, 90, 122, 0.3)', color: '#ff5a7a'}}
                >
                  ⚔️
                </button>
                <button className="btn" onClick={() => setHealModal({ open: true, type: 'monster', source: m.id })}>Heal</button>
                <button className="delete-btn" onClick={(e)=>{ e.stopPropagation(); deleteMonster(m.id); }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const Inspector = () => {
    if (!selected) {
      return (
        <div className="center-card panel">
          <div className="center-left">
            <div className="center-icon">📖</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18}}>DM Dashboard</div>
              <div className="small-muted">Select a player or monster to inspect</div>
            </div>
          </div>
          <div className="center-main">
            <div style={{fontWeight:900,fontSize:20}}>Welcome to your Campaign</div>
            <div className="small-muted" style={{marginTop:8}}>
              {mode === "normal" 
                ? "You are in Story Mode. Focus on narrative and world-building."
                : "You are in Combat Mode. Manage battles and encounters."}
            </div>
            
            <div className="section" style={{marginTop:16}}>
              <div className="small-muted">Quick Stats</div>
              <div style={{display:"flex",gap:12,marginTop:8}}>
                <div><div className="small-muted">Players</div><div style={{fontWeight:800}}>{players.length}</div></div>
                <div><div className="small-muted">Monsters</div><div style={{fontWeight:800}}>{monsters.length}</div></div>
                <div><div className="small-muted">Encounters</div><div style={{fontWeight:800}}>{encounters.length}</div></div>
              </div>
            </div>

            {mode === "combat" && <QuickAttackSection />}
          </div>
        </div>
      );
    }

    if (selected.type === "player") {
      const p = players.find(x => x.id === selected.item.id) || selected.item;
      const isDamageAnim = damageAnimations[`player_${p.id}`];
      const isHealAnim = healAnimations[`player_${p.id}`];
      
      return (
        <div className={`center-card panel ${isDamageAnim ? 'damage-animation' : ''} ${isHealAnim ? 'heal-animation' : ''}`}>
          <div className="center-left">
            <div className="center-icon">
              <ClassImage className={p.className} size="large" />
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18}}>
                <EditableField type="player" id={p.id} field="name" value={p.name} onEdit={handleFieldEdit} />
                {p.hp<=0 && <span className="dead-tag"> DEAD</span>}
              </div>
              <div className="small-muted">{p.className}</div>
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
              <div style={{fontWeight:800, color: '#ff7c5c'}}>{p.overallDmg || 0}</div>
            </div>
            <div style={{width:"100%"}}>
              <button className="delete-btn" onClick={()=>deletePlayer(p.id)}>Delete player</button>
            </div>
          </div>

          <div className="center-main">
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:900,fontSize:20}}>{p.name}</div>
                <div className="small-muted">{p.lore || "No background story."}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="small-muted">Initiative</div>
                <div style={{fontWeight:800}}>
                  <EditableField type="player" id={p.id} field="initiative" value={p.initiative} onEdit={handleFieldEdit} />
                </div>
              </div>
            </div>

            <div className="section">
              <div style={{display:"flex",gap:12}}>
                <div><div className="small-muted">Class</div><div>{p.className}</div></div>
                <div><div className="small-muted">Status</div><div>{p.hp<=0 ? "DEAD" : p.hp<=p.maxHp*0.3 ? "CRITICAL" : "HEALTHY"}</div></div>
              </div>
            </div>

            <div className="section">
              <div className="small-muted">Background / Lore</div>
              <div style={{marginTop:8}}>
                <EditableField type="player" id={p.id} field="lore" value={p.lore} onEdit={handleFieldEdit} />
              </div>
            </div>

            {mode === "combat" && (
              <>
                <div className="section">
                  <div className="small-muted">Quick Actions</div>
                  <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <button className="btn" onClick={() => setQuickAttackModal({ open: true, source: p.id, sourceType: 'player' })}>Attack Monsters</button>
                    <button className="btn" onClick={() => setHealModal({ open: true, type: 'player', source: p.id })}>Heal</button>
                    <button className="btn" onClick={async ()=>{ const note = prompt("Log note about player:"); if (note) { 
                      const msg = `${p.name}: ${note}`;
                      await saveEncounter({ summary: msg, type: 'note' });
                      setEncounters(prev=>[{id:"e_"+Date.now(),date:new Date().toISOString(),summary:msg, type: 'note'},...prev].slice(0,80)); 
                    }}}>Log Note</button>
                  </div>
                </div>

                <QuickAttackSection />
              </>
            )}

            {/* Floating damage/heal text */}
            {(isDamageAnim || isHealAnim) && (
              <div className={`floating-damage ${isDamageAnim ? 'damage' : 'heal'}`} style={{top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
                {isDamageAnim ? '💥' : '✨'}
              </div>
            )}
          </div>
        </div>
      );
    }

    // monster inspector
    const m = monsters.find(x => x.id === selected.item.id) || selected.item;
    const isDamageAnim = damageAnimations[`monster_${m.id}`];
    const isHealAnim = healAnimations[`monster_${m.id}`];
    const isDeathAnim = deathAnimations[`monster_${m.id}`];
    
    return (
      <div className={`center-card panel ${isDamageAnim ? 'damage-animation' : ''} ${isHealAnim ? 'heal-animation' : ''} ${isDeathAnim ? 'death-animation' : ''}`}>
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

          {mode === "combat" && (
            <>
              <div className="section">
                <div className="small-muted">Quick Actions</div>
                <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <button className="btn" onClick={() => setQuickAttackModal({ open: true, source: m.id, sourceType: 'monster' })}>Attack Players</button>
                  <button className="btn" onClick={() => setHealModal({ open: true, type: 'monster', source: m.id })}>Heal</button>
                </div>
              </div>

              <QuickAttackSection />

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
            </>
          )}

          {/* Floating damage/heal text */}
          {(isDamageAnim || isHealAnim) && (
            <div className={`floating-damage ${isDamageAnim ? 'damage' : 'heal'}`} style={{top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
              {isDamageAnim ? '💥' : '✨'}
            </div>
          )}

          {/* Floating death text */}
          {isDeathAnim && (
            <div className="floating-death">💀</div>
          )}
        </div>
      </div>
    );
  };

  // Combat Layout Component
  const CombatLayout = () => (
    <>
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
              <button className="btn" onClick={async ()=>{ 
                const s = prompt("Quick encounter summary:");
                if (s) { 
                  await saveEncounter({ summary: s, type: 'encounter' });
                  setEncounters(prev=>[{id:"e_"+Date.now(),date:new Date().toISOString(),summary:s, type: 'encounter'},...prev].slice(0,80)); 
                }
              }}>Log encounter</button>
              <button className="btn" onClick={()=> setEncounters([])}>Clear log</button>
            </div>
          </div>

          <div className="session-log-container" style={{marginTop:8, overflow:"auto"}}>
            {encounters.length===0 ? 
              <div className="small-muted" style={{padding: '20px', textAlign: 'center'}}>No logs yet. Start your adventure!</div> : 
              encounters.map(e=>{
                const logStyle = getLogColor(e);
                return (
                  <div 
                    key={e.id} 
                    style={{
                      padding:12,
                      borderBottom:"1px solid rgba(255,255,255,0.05)",
                      background: logStyle.background,
                      color: logStyle.color,
                      borderRadius: '6px',
                      marginBottom: '6px',
                      borderLeft: `4px solid ${logStyle.color}`
                    }}
                  >
                    <div style={{fontSize:12,color:"var(--muted)", display: 'flex', justifyContent: 'space-between'}}>
                      <span>{new Date(e.date).toLocaleString()}</span>
                      <span style={{textTransform: 'capitalize'}}>{e.type}</span>
                    </div>
                    <div style={{marginTop:6, fontWeight: 500}}>{e.summary}</div>
                  </div>
                );
              })
            }
          </div>
        </div>

        <div style={{width:320}} className="panel">
          <div style={{fontWeight:800}}>Quick Tools</div>
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn" onClick={()=> setPlayers(prev => prev.map(p => ({...p, initiative: (p.initiative || 0) + 1, synced: false })))}>+1 Init all</button>
            <button className="btn" onClick={()=> { setPlayers(defaultPlayers.map(p => ({ ...p, id: `p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, className: p.class, synced: false }))); setNotification("Players reset"); }}>Reset players</button>
            <button className="btn" onClick={()=> { setMonsters([]); setNotification("Cleared monsters"); }}>Clear monsters</button>
            <button 
              className="quick-heal-btn"
              onClick={() => setQuickHealModal({ open: true, targetType: 'players' })}
              style={{width: '100%', padding: '10px'}}
            >
              🩹 Heal Players
            </button>
            <button 
              className="quick-heal-btn"
              onClick={() => setQuickHealModal({ open: true, targetType: 'monsters' })}
              style={{width: '100%', padding: '10px'}}
            >
              🩹 Heal Monsters
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Player Creator Layout Component
  const PlayerCreatorLayout = () => (
    <div className="layout">
      <div className="panel" style={{flex: 1}}>
        <PlayerCreator onAdd={addNewPlayer} />
      </div>
      <div className="panel" style={{width: 400}}>
        <div style={{fontWeight:800, marginBottom: 12}}>Recent Players</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {players.slice(0, 5).map(p => (
            <div key={p.id} className="player-card" onClick={() => openPlayerInspector(p)}>
              <div className="player-icon">
                <ClassImage className={p.className} />
              </div>
              <div className="player-meta">
                <div className="player-name">{p.name}</div>
                <div className="player-small">{p.className} • HP {p.hp}/{p.maxHp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="app">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
      
      <div className="topbar">
        <div className="title">DM Dashboard — {mode === "normal" ? "Story Mode" : mode === "combat" ? "Combat Mode" : "Player Creator"}</div>
        <div className="controls">
          <div className="small-muted" style={{marginRight:8}}>Mode: <strong style={{color:"var(--accent)"}}>{mode}</strong></div>
          <div className="mode-switcher">
            {["normal","combat","creator"].map(m => 
              <button 
                key={m} 
                className={`mode-btn ${mode===m ? 'active' : ''}`}
                onClick={()=>setMode(m)}
              >
                {m}
              </button>
            )}
          </div>
          <button className="btn" onClick={exportState}>Export</button>
          <label className="btn" style={{cursor:"pointer"}}>
            Import
            <input type="file" accept="application/json" style={{display:"none"}} onChange={importState} />
          </label>
          <button className="btn" onClick={loadFromDatabase}>Refresh DB</button>
        </div>
      </div>

      {mode === "normal" ? <HeroBook /> : 
       mode === "combat" ? <CombatLayout /> : 
       <PlayerCreatorLayout />}

      {monsterSearchModal && <MonsterSearchModal />}

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

      {quickAttackModal.open && (
        <QuickAttackModal
          source={quickAttackModal.source}
          sourceType={quickAttackModal.sourceType}
          onClose={() => setQuickAttackModal({ open: false, source: null, sourceType: null })}
          onAttack={quickAttackModal.sourceType === 'player' ? playerAttackMonster : monsterAttackPlayer}
        />
      )}

      {quickHealModal.open && (
        <QuickHealModal
          targetType={quickHealModal.targetType}
          onClose={() => setQuickHealModal({ open: false, targetType: null })}
          onHeal={quickHealTargets}
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