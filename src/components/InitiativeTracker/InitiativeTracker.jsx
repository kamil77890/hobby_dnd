import React, { useState } from 'react';
import './InitiativeTracker.css';

const InitiativeTracker = () => {
  const [combatants, setCombatants] = useState([]);
  const [name, setName] = useState('');
  const [initiative, setInitiative] = useState('');
  const [hp, setHp] = useState('');
  const [type, setType] = useState('player');
  const [currentTurn, setCurrentTurn] = useState(0);

  const addCombatant = () => {
    if (name && initiative) {
      const newCombatant = {
        id: Date.now(),
        name,
        initiative: parseInt(initiative),
        hp: hp ? parseInt(hp) : null,
        type
      };
      
      const updatedCombatants = [...combatants, newCombatant]
        .sort((a, b) => b.initiative - a.initiative);
      
      setCombatants(updatedCombatants);
      setName('');
      setInitiative('');
      setHp('');
      setType('player');
    }
  };

  const removeCombatant = (id) => {
    setCombatants(combatants.filter(c => c.id !== id));
    if (currentTurn >= combatants.length - 1) {
      setCurrentTurn(0);
    }
  };

  const nextTurn = () => {
    setCurrentTurn((prev) => (prev + 1) % combatants.length);
  };

  const resetInitiative = () => {
    setCombatants([]);
    setCurrentTurn(0);
  };

  return (
    <div className="initiative-tracker dashboard-section">
      <h2>Initiative Tracker</h2>
      
      <div className="initiative-controls">
        <div className="combatant-form">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Initiative"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
          />
          <input
            type="number"
            placeholder="HP (optional)"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="player">Player</option>
            <option value="enemy">Enemy</option>
            <option value="npc">NPC</option>
          </select>
          <button className="btn btn-primary" onClick={addCombatant}>
            Add Combatant
          </button>
        </div>
        
        <div className="tracker-controls">
          <button className="btn btn-secondary" onClick={nextTurn}>
            Next Turn
          </button>
          <button className="btn btn-danger" onClick={resetInitiative}>
            Reset
          </button>
        </div>
      </div>
      
      <div className="initiative-list">
        {combatants.length === 0 ? (
          <p>No combatants added yet.</p>
        ) : (
          <ul>
            {combatants.map((combatant, index) => (
              <li 
                key={combatant.id} 
                className={`combatant ${combatant.type} ${index === currentTurn ? 'current-turn' : ''}`}
              >
                <div className="combatant-info">
                  <span className="initiative-value">{combatant.initiative}</span>
                  <span className="combatant-name">{combatant.name}</span>
                  {combatant.hp && <span className="combatant-hp">HP: {combatant.hp}</span>}
                  <span className="combatant-type">{combatant.type}</span>
                </div>
                <button 
                  className="btn btn-danger" 
                  onClick={() => removeCombatant(combatant.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InitiativeTracker;