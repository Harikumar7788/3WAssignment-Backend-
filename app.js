const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const upload = require('./multerConfig');
const cloudinary = require('./cloudinary');
const User = require('./models/User');
const Admin = require('./models/Admin');
const WebSocket = require('ws');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error: ", err));

// Initialize WebSocket server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};


app.post('/api/submit', upload.array('images', 10), async (req, res) => {
  try {
    const { name, socialMediaHandle } = req.body;

  
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const images = [];

    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' }, 
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              reject(error);
            } else {
              images.push({ url: result.secure_url });
              resolve();
            }
          }
        );

        if (file.buffer) {
          stream.end(file.buffer);
        } else {
          reject(new Error('File buffer is undefined.'));
        }
      });
    });

    await Promise.all(uploadPromises);

    const user = new User({ name, socialMediaHandle, images });
    await user.save();

    broadcast(user);
    res.status(201).json(user);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/register-admin', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const existingUser = await Admin.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new Admin({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'Admin registered successfully', user: newUser });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
