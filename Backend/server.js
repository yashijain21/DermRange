const path = require('path');  // Add this at the top (you already have express and others)
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
require('dotenv').config();
console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID);
console.log('Razorpay Secret:', process.env.RAZORPAY_SECRET);


const app = express();
app.use(cors());
app.use(express.json());  // This line is necessary to parse JSON in the request body
app.use(express.static(path.join(__dirname, 'frontend')));
// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Utility: Generate your own unique order ID
function generateOwnOrderId() {
  return `SUNPROD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// POST: Create order & validate input
app.post('/api/create-order', async (req, res) => {
  const { name, email, phone, address, city, pincode, amount } = req.body;

  // Validation
  if (!name || !email || !phone || !address || !city || !pincode || !amount) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const isValidPincode = /^[1-9][0-9]{5}$/.test(pincode);
  if (!isValidPincode) {
    return res.status(400).json({ error: 'Invalid Indian pincode.' });
  }

  try {
    const yourOrderId = generateOwnOrderId(); // Generate your own orderId

    const razorpayOrder = await razorpay.orders.create({
      amount: amount, // Razorpay needs amount in paisa
      currency: 'INR',
      receipt: yourOrderId, // Use your custom order ID as receipt for tracking
      notes: {
        name,
        email,
        phone,
        address,
        city,
        pincode,
      },
    });
    console.log('Razorpay order created successfully:', razorpayOrder);
    res.json({
      razorpayOrderId: razorpayOrder.id,
      yourOrderId: yourOrderId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } 
  catch (err) {
    console.error('Error creating Razorpay order:', err);  // Log full error
    if (err.response) {
      console.error('Razorpay Error Response:', err.response);  // Log Razorpay specific error response
    }
    res.status(500).json({
      error: 'Something went wrong while creating the Razorpay order.',
      details: err.response || err.message || err
    });
  }
  
});

// GET: Delivery check endpoint
app.get('/api/delivery/:pincode', (req, res) => {
  const { pincode } = req.params;

  const isValidPincode = /^[1-9][0-9]{5}$/.test(pincode);
  if (!isValidPincode) {
    return res.status(400).json({ error: 'Invalid pincode format.' });
  }

  const deliverablePincodes = ['110001', '400001', '560001', '123456', '987654','226004'];

  if (deliverablePincodes.includes(pincode)) {
    return res.json({ available: true, message: 'Delivery available in this area.' });
  } else {
    return res.json({ available: false, message: 'Delivery not available in this area.' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
