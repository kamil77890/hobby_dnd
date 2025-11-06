import React, { useState } from 'react';
import './PlayerInfo.css';

const PlayerInfo = () => {
  const [players, setPlayers] = useState([
    { id: 1, name: 'Aragorn', class: 'Fighter', level: 5, hp: 45, ac: 18, notes: 'Party leader' },
    { id: 2, name: 'Gandalf', class: 'Wizard', level: 5, hp: 32, ac: 12, notes: 'Has fireball prepared' },
  ]);
  
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    class: '',
    level: 1,
    hp: '',
    ac: '',
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlayer({
      ...newPlayer,
      [name]: value
    });
  };

  const addPlayer = () => {
    if (newPlayer.name && newPlayer.class) {
      setPlayers([...players, { ...newPlayer, id: Date.now() }]);
      setNewPlayer({
        name: '',
        class: '',
        level: 1,
        hp: '',
        ac: '',
        notes: ''
      });
    }
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(player => player.id !== id));
  };

  return (
    <div className="player-info dashboard-section">
      <h2>Player Information</h2>
      
      <div className="add-player-form">
        <h3>Add New Player</h3>
        <div className="form-grid">
          <input
            type="text"
            name="name"
            placeholder="Character Name"
            value={newPlayer.name}
            onChange={handleInputChange}
          />
          <input
            type="text"
            name="class"
            placeholder="Class"
            value={newPlayer.class}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="level"
            placeholder="Level"
            value={newPlayer.level}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="hp"
            placeholder="HP"
            value={newPlayer.hp}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="ac"
            placeholder="AC"
            value={newPlayer.ac}
            onChange={handleInputChange}
          />
          <input
            type="text"
            name="notes"
            placeholder="Notes"
            value={newPlayer.notes}
            onChange={handleInputChange}
          />
        </div>
        <button className="btn btn-primary" onClick={addPlayer}>
          Add Player
        </button>
      </div>
      
      <div className="players-grid">
        {players.map(player => (
          <div key={player.id} className="player-card">
            <div className="player-header">
              <h3>{player.name}</h3>
              <button 
                className="btn btn-danger" 
                onClick={() => removePlayer(player.id)}
              >
                Remove
              </button>
            </div>
            <div className="player-details">
              <div className="detail">
                <span className="label">Class:</span>
                <span className="value">{player.class}</span>
              </div>
              <div className="detail">
                <span className="label">Level:</span>
                <span className="value">{player.level}</span>
              </div>
              <div className="detail">
                <span className="label">HP:</span>
                <span className="value">{player.hp}</span>
              </div>
              <div className="detail">
                <span className="label">AC:</span>
                <span className="value">{player.ac}</span>
              </div>
              {player.notes && (
                <div className="detail">
                  <span className="label">Notes:</span>
                  <span className="value">{player.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerInfo;