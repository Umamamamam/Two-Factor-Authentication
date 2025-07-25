const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { generateOTP } = require('./otpUtil');

dotenv.config();
console.log("Loaded EMAIL_USER:", process.env.EMAIL_USER);
console.log("Loaded EMAIL_PASS:", process.env.EMAIL_PASS);


const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory user store (replace with a database in production)
let users = [
  { username: 'uma932244@gmail.com', password: 'Umamahesh@2005', otp: '', otpExpiresAt: null }
];

const path = require('path');

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;

  // Send OTP via Email
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.username, // assuming email as username
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'OTP sent' });
  } catch (error) {
    console.error('❌ Failed to send email:', error);  // ADD THIS
    return res.status(500).json({ message: 'Failed to send OTP. Try again later.' });
  }
});

app.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;
  const user = users.find(u => u.username === username);

  if (!user || user.otp !== otp || new Date() > user.otpExpiresAt) {
    return res.status(401).json({ message: 'Invalid or expired OTP' });
  }

  res.json({ message: 'Login successful' });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
