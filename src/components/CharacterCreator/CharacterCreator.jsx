import React, { useState } from 'react';
import './CharacterCreator.css';

const CharacterCreator = () => {
  const [character, setCharacter] = useState({
    name: '',
    race: '',
    class: '',
    level: 1,
    background: '',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    equipment: '',
    backstory: ''
  });

  const [savedCharacters, setSavedCharacters] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCharacter({
      ...character,
      [name]: value
    });
  };

  const handleStatChange = (stat, value) => {
    setCharacter({
      ...character,
      [stat]: parseInt(value) || 0
    });
  };

  const calculateModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const saveCharacter = () => {
    if (character.name && character.race && character.class) {
      setSavedCharacters([...savedCharacters, { ...character, id: Date.now() }]);
      // Reset form
      setCharacter({
        name: '',
        race: '',
        class: '',
        level: 1,
        background: '',
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        equipment: '',
        backstory: ''
      });
    }
  };

  const deleteCharacter = (id) => {
    setSavedCharacters(savedCharacters.filter(char => char.id !== id));
  };

  return (
    <div className="character-creator dashboard-section">
      <h2>Character Creator</h2>
      
      <div className="creator-container">
        <div className="character-form">
          <h3>Create New Character</h3>
          
          <div className="form-section">
            <h4>Basic Information</h4>
            <div className="form-grid">
              <input
                type="text"
                name="name"
                placeholder="Character Name"
                value={character.name}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="race"
                placeholder="Race"
                value={character.race}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="class"
                placeholder="Class"
                value={character.class}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="level"
                placeholder="Level"
                value={character.level}
                onChange={handleInputChange}
                min="1"
                max="20"
              />
              <input
                type="text"
                name="background"
                placeholder="Background"
                value={character.background}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="form-section">
            <h4>Ability Scores</h4>
            <div className="stats-grid">
              {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(stat => (
                <div key={stat} className="stat-input">
                  <label htmlFor={stat}>{stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
                  <input
                    type="number"
                    id={stat}
                    value={character[stat]}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    min="1"
                    max="20"
                  />
                  <span className="modifier">
                    {calculateModifier(character[stat]) >= 0 ? '+' : ''}{calculateModifier(character[stat])}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-section">
            <h4>Additional Information</h4>
            <textarea
              name="equipment"
              placeholder="Equipment"
              value={character.equipment}
              onChange={handleInputChange}
              rows="3"
            />
            <textarea
              name="backstory"
              placeholder="Backstory"
              value={character.backstory}
              onChange={handleInputChange}
              rows="5"
            />
          </div>
          
          <button className="btn btn-primary" onClick={saveCharacter}>
            Save Character
          </button>
        </div>
        
        <div className="saved-characters">
          <h3>Saved Characters</h3>
          {savedCharacters.length === 0 ? (
            <p>No characters saved yet.</p>
          ) : (
            <div className="characters-list">
              {savedCharacters.map(char => (
                <div key={char.id} className="character-card">
                  <div className="character-header">
                    <h4>{char.name}</h4>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => deleteCharacter(char.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="character-details">
                    <p><strong>Race:</strong> {char.race}</p>
                    <p><strong>Class:</strong> {char.class} (Level {char.level})</p>
                    {char.background && <p><strong>Background:</strong> {char.background}</p>}
                    
                    <div className="character-stats">
                      <h5>Ability Scores</h5>
                      <div className="stats-display">
                        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(stat => (
                          <div key={stat} className="stat-display">
                            <span className="stat-name">{stat.slice(0, 3).toUpperCase()}</span>
                            <span className="stat-value">{char[stat]}</span>
                            <span className="stat-modifier">
                              {calculateModifier(char[stat]) >= 0 ? '+' : ''}{calculateModifier(char[stat])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {char.equipment && (
                      <div className="character-equipment">
                        <h5>Equipment</h5>
                        <p>{char.equipment}</p>
                      </div>
                    )}
                    
                    {char.backstory && (
                      <div className="character-backstory">
                        <h5>Backstory</h5>
                        <p>{char.backstory}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;