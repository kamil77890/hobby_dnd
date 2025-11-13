'use client';

import { useState, useEffect } from 'react';
import AiCreateSummaryButton from '../chat/';

export default function HeroBook() {
  const [stories, setStories] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/db/stories');
      if (!res.ok) return;
      const data = await res.json();
      setStories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

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
      const res = await fetch('/api/db/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Story #${Date.now()}`,
          text: summary,
          style: 'book',
        }),
      });
      if (!res.ok) return;
      const newStory = await res.json();
      setStories(prev => [newStory, ...prev]);
      setCurrentPage(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentStory = stories[currentPage];

  return (
    <div className="book-container">
      <div className="book">
        <div className="page">
          {currentStory ? (
            <>
              <h2 className="story-title">{currentStory.title}</h2>
              <p className="story-text">{currentStory.text}</p>
              {currentStory.hero && <p className="story-hero">Hero: {currentStory.hero.name}</p>}
            </>
          ) : (
            <p className="story-text">No stories yet.</p>
          )}
        </div>
      </div>

      <div className="book-controls">
        <button onClick={handlePrev} disabled={currentPage === 0}>← Previous</button>
        <span>{currentPage + 1} / {stories.length}</span>
        <button onClick={handleNext} disabled={currentPage === stories.length - 1}>Next →</button>
      </div>

      <div className="summary-generator">
        <AiCreateSummaryButton LogData={{ stories }} onSummaryGenerated={handleAddStory} loading={loading}/>
      </div>
    </div>
  );
}
