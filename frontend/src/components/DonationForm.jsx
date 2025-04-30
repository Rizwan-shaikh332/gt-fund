import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DonationForm = ({ onDonationSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(500);
  const [loading, setLoading] = useState(false);

  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleDonation = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Load Razorpay script
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        return;
      }

      // Create order
      const orderResponse = await axios.post('http://localhost:5000/create-order', {
        amount: amount
      });

      const { id: order_id, amount: order_amount } = orderResponse.data;

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order_amount.toString(),
        currency: 'INR',
        name: 'GT Bike Fundraiser',
        description: 'Donation for GT Bike',
        order_id: order_id,
        handler: async function (response) {
          try {
            await axios.post('http://localhost:5000/save-donation', {
              name: name,
              email: email,
              amount: amount,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id
            });
            toast.success('Donation successful! Thank you!');
            onDonationSuccess();
          } catch (error) {
            toast.error('Payment successful but failed to save details.');
          }
        },
        prefill: {
          name: name,
          email: email,
        },
        theme: {
          color: '#3399cc',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error('Error processing donation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donation-form">
      <h2>Support My GT Bike Fund</h2>
      <form onSubmit={handleDonation}>
        <div className="form-group">
          <label>Name (Optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="form-group">
          <label>Email (Optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
          />
        </div>
        <div className="form-group">
          <label>Amount (₹)</label>
          <input
            type="number"
            min="10"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Donate Now'}
        </button>
      </form>
    </div>
  );
};

export default DonationForm;