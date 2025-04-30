import React from 'react';

const TopDonors = ({ donors }) => {
  return (
    <div className="top-donors">
      <h3>Top Donors</h3>
      {donors.length === 0 ? (
        <p>No donors yet.</p>
      ) : (
        <ol>
          {donors.map((donor, index) => (
            <li key={index}>
              <span className="donor-name">{donor.name || 'Anonymous'}</span>
              <span className="donation-amount">₹{donor.amount.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default TopDonors;
