import React from 'react';

const ProgressBar = ({ raised, goal }) => {
  const percentage = Math.min(Math.round((raised / goal) * 100), 100);

  return (
    <div className="progress-container">
      <h3>Fundraising Progress</h3>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="progress-text">
        <span>₹{raised.toLocaleString()} raised</span>
        <span>Goal: ₹{goal.toLocaleString()}</span>
      </div>
      <div className="progress-percentage">{percentage}%</div>
    </div>
  );
};

export default ProgressBar;
