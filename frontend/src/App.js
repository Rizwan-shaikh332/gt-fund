import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import bikeImage from './bike.jpg'; // 👈 import the image

function App() {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRaised, setTotalRaised] = useState(0);
  const [error, setError] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [topDonors, setTopDonors] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [showBikeImage, setShowBikeImage] = useState(false);
  const goal = 450000;
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Function to load the Razorpay script
  const loadScript = (src) => {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load script:', src);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Function to handle payment
  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    setIsAnimating(true);

    if (amount === '' || parseInt(amount) < 1) {
      setError('Please enter an amount of at least ₹1');
      setLoading(false);
      setIsAnimating(false);
      return;
    }

    try {
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
        setError('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const orderResponse = await axios.post(`${API_URL}/create-order`, {
        amount: parseInt(amount)
      });

      const { id: order_id, amount: order_amount } = orderResponse.data;

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order_amount.toString(),
        currency: 'INR',
        name: 'GT Bike Fundraiser',
        description: 'Donation for GT650 Bike',
        order_id: order_id,
        handler: async function (response) {
          try {
            await axios.post(`${API_URL}/save-donation`, {
              name: name || 'Anonymous',
              amount: parseInt(amount),
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id
            });
            setIsAnimating(false);
            triggerConfetti();
            fetchDonations();
            setAmount('');
            setName('');
          } catch (error) {
            console.error('Error saving donation:', error);
          }
        },
        theme: {
          color: '#3F51B5', // Updated to match new primary color
        },
        modal: {
          ondismiss: function () {
            setIsAnimating(false);
            setLoading(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.error || 'Error processing payment. Please try again.');
      setIsAnimating(false);
    } finally {
      setLoading(false);
    }
  };

  // Function to trigger confetti animation on successful donation
  const triggerConfetti = () => {
    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
      confetti.style.backgroundColor = getRandomColor();
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 3000);
    }
  };

  // Helper function to get random colors for confetti
  const getRandomColor = () => {
    const colors = ['#3F51B5', '#757de8', '#FF5722', '#ff8a50', '#4CAF50'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Function to fetch donations data from the API
  const fetchDonations = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-donations`);
      setTotalRaised(response.data.total_raised || 0);
      setTopDonors(response.data.top_donors || []);
      setRecentDonations(response.data.recent_donations || []);

      // Show bike image after data is loaded
      setTimeout(() => {
        setShowBikeImage(true);
      }, 500);
    } catch (error) {
      console.error('Error fetching donations:', error);
      setError('Failed to fetch donation data');
    }
  };

  // Fetch donations data when component mounts
  useEffect(() => {
    fetchDonations();

    // Fetching additional data from an API endpoint
    fetch(`${process.env.REACT_APP_API_URL}/api/some-endpoint`)
      .then(response => response.json())
      .then(data => {
        console.log(data);  // Log or use the data as needed
        // Optionally update state with the fetched data
        // setSomeState(data);
      })
      .catch(error => console.error('Error:', error));
  }, []); // Empty dependency array means it runs only once when the component mounts

  return (
    <div className={`app ${isAnimating ? 'pulse-effect' : ''}`}>
      <div className="bike-background"
        style={{
          backgroundImage: `url(${bikeImage})`, // 👈 use imported image
        }}></div>
      <div className="gradient-overlay"></div>

      <header className="header">
        <h1>Help Me Ride My Dream <span className="gt-text">GT650 Bike</span></h1>
        <p className="tagline">Every rupee brings me closer to the open road. Your support means everything!</p>
      </header>

      <main className="main-content">
        {/* GT650 Bike Image Section */}
        <div className="fundraiser-card">
          <div className="progress-container">
            <h3>Fundraising Progress</h3>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(Math.round((totalRaised / goal) * 100), 100)}%` }}
              ></div>
            </div>
            <div className="progress-info">
              <span className="raised-amount">₹{totalRaised.toLocaleString()} raised</span>
              <span className="goal-amount">Goal: ₹{goal.toLocaleString()}</span>
            </div>
            <div className="progress-percent">{Math.round((totalRaised / goal) * 100)}% Complete</div>
          </div>

          <div className="donation-form">
            <h2>Fuel My Adventure</h2>
            <div className="form-group">
              <label htmlFor="name">Your Name (Optional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="amount">Your Contribution (₹)</label>
              <input
                id="amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (min ₹1)"
              />
            </div>

            <span className="donation-message">100% of your donation goes to the bike fund</span>

            {error && <div className="error-message">{error}</div>}

            <button
              onClick={handlePayment}
              disabled={loading || amount === '' || parseInt(amount) < 1}
              className={`donate-button ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Processing...' : 'Donate Now'}
            </button>
          </div>
        </div>

        <div className="donors-grid">
          <div className="donors-card">
            <h3>🏆 Top Donors</h3>
            {topDonors.length > 0 ? (
              <ol className="donors-list">
                {topDonors.map((donor, index) => (
                  <li key={index}>
                    <span className="donor-name">{donor.name || 'Anonymous'}</span>
                    <span className="donor-amount">₹{donor.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="no-donations">No donors yet. Be the first!</p>
            )}
          </div>

          <div className="donors-card">
            <h3>🆕 Recent Donations</h3>
            {recentDonations.length > 0 ? (
              <ul className="donors-list">
                {recentDonations.map((donation, index) => (
                  <li key={index}>
                    <span className="donor-name">{donation.name || 'Anonymous'}</span>
                    <span className="donor-amount">₹{donation.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-donations">No recent donations</p>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Every ₹1 you shared brought me one step closer to my dream GT 650. ❤️ <br />
          Once the full amount is raised, I’ll post the final ride reel on Instagram!
        </p>
        <p>
          Follow my journey: 
          <a href="https://www.instagram.com/gt650.missi0n/" target="_blank" rel="noopener noreferrer">
             @gt650.missi0n
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
