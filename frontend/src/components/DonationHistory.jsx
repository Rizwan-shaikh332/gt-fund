import React from 'react';

const DonationHistory = ({ donations }) => {
  return (
    <div className="donation-history">
      <h3>Recent Donations</h3>
      {donations.length === 0 ? (
        <p>No donations yet. Be the first!</p>
      ) : (
        <ul>
          {donations.map((donation, index) => (
            <li key={index}>
              <span className="donor-name">{donation.name || 'Anonymous'}</span>
              <span className="donation-amount">₹{donation.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DonationHistory;