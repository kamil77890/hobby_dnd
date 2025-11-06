import React, { useState } from 'react';
import './RollingTables.css';

const RollingTables = () => {
  const [selectedTable, setSelectedTable] = useState('loot');
  const [rollResult, setRollResult] = useState(null);
  const [customDice, setCustomDice] = useState('d20');

  const tables = {
    loot: [
      { min: 1, max: 10, result: "10 gold pieces" },
      { min: 11, max: 20, result: "Potion of Healing" },
      { min: 21, max: 30, result: "Magic weapon +1" },
      { min: 31, max: 40, result: "50 gold pieces" },
      { min: 41, max: 50, result: "Scroll of Fireball" },
      { min: 51, max: 60, result: "Gem worth 100 gold" },
      { min: 61, max: 70, result: "Cloak of Protection" },
      { min: 71, max: 80, result: "Bag of Holding" },
      { min: 81, max: 90, result: "Wand of Magic Missiles" },
      { min: 91, max: 100, result: "Legendary Artifact" }
    ],
    encounters: [
      { min: 1, max: 15, result: "Goblin ambush (3-5 goblins)" },
      { min: 16, max: 30, result: "Bandits on the road (2-4 bandits)" },
      { min: 31, max: 45, result: "Wolf pack (4-6 wolves)" },
      { min: 46, max: 60, result: "Orc raiding party (2-4 orcs)" },
      { min: 61, max: 75, result: "Troll blocking the path" },
      { min: 76, max: 90, result: "Dragon flying overhead" },
      { min: 91, max: 100, result: "Ancient dragon lair" }
    ],
    npc: [
      { min: 1, max: 20, result: "Friendly merchant" },
      { min: 21, max: 40, result: "Suspicious guard" },
      { min: 41, max: 60, result: "Mysterious wizard" },
      { min: 61, max: 80, result: "Noble with a quest" },
      { min: 81, max: 100, result: "Secretly a dragon in human form" }
    ]
  };

  const rollOnTable = () => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const table = tables[selectedTable];
    const result = table.find(item => roll >= item.min && roll <= item.max);
    
    setRollResult({
      table: selectedTable,
      roll,
      result: result.result
    });
  };

  const rollCustomDice = () => {
    const diceRegex = /^d(\d+)$/i;
    const match = customDice.match(diceRegex);
    
    if (match) {
      const sides = parseInt(match[1]);
      const roll = Math.floor(Math.random() * sides) + 1;
      setRollResult({
        table: 'custom',
        roll,
        result: `You rolled ${roll} on a ${customDice}`
      });
    } else {
      setRollResult({
        table: 'custom',
        roll: null,
        result: 'Invalid dice format. Use "d20", "d6", etc.'
      });
    }
  };

  return (
    <div className="rolling-tables dashboard-section">
      <h2>Rolling Tables</h2>
      
      <div className="tables-container">
        <div className="table-selection">
          <h3>Select Table</h3>
          <div className="table-buttons">
            <button 
              className={selectedTable === 'loot' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setSelectedTable('loot')}
            >
              Treasure/Loot
            </button>
            <button 
              className={selectedTable === 'encounters' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setSelectedTable('encounters')}
            >
              Random Encounters
            </button>
            <button 
              className={selectedTable === 'npc' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setSelectedTable('npc')}
            >
              NPC Personalities
            </button>
          </div>
          
          <button className="btn btn-primary roll-btn" onClick={rollOnTable}>
            Roll on {selectedTable} table
          </button>
        </div>
        
        <div className="custom-dice">
          <h3>Custom Dice Roller</h3>
          <div className="dice-controls">
            <input
              type="text"
              placeholder="d20"
              value={customDice}
              onChange={(e) => setCustomDice(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={rollCustomDice}>
              Roll
            </button>
          </div>
        </div>
        
        {rollResult && (
          <div className="roll-result">
            <h3>Roll Result</h3>
            <div className="result-card">
              <p><strong>Table:</strong> {rollResult.table}</p>
              <p><strong>Roll:</strong> {rollResult.roll}</p>
              <p><strong>Result:</strong> {rollResult.result}</p>
            </div>
          </div>
        )}
        
        <div className="table-preview">
          <h3>Table: {selectedTable}</h3>
          <div className="table-list">
            {tables[selectedTable].map((item, index) => (
              <div key={index} className="table-item">
                <span className="table-range">{item.min}-{item.max}</span>
                <span className="table-result">{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RollingTables;