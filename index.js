const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');



app.use(express.json());


// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatApp');

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  lastMessage : {type : String},
  lastTime : {type : String}
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatRoomSchema = new mongoose.Schema({
  chatRoomId: { type: String, required: true, unique: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});


const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);


// API endpoint to create or update a user
app.post('/users', async (req, res) => {
  try {
    const { username, lastMessage, lastTime } = req.body;
    console.log(`user : ${username}`);
    console.log(`user : ${lastTime}`);
    console.log(`user : ${lastMessage}`);
    let user = await User.findOne({ username });

    if (!user) {
      user = await User.create({ username, lastMessage, lastTime });
      console.log(`New user created: ${username}`);
      res.status(201).json(user);
    } else {
      console.log(`User already exists: ${username}`);
      // Update the existing user's lastMessage and lastTime fields
      user.lastMessage = lastMessage;
      user.lastTime = lastTime;
      await user.save();
      res.status(409).json(user);
    }
  } catch (err) {
    console.error('Error creating or updating user:', err);
    res.status(500).json({ error: 'Error creating or updating user' });
  }
});
// Route to get all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);

  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});
// // Send a message to a chat room
// app.post('/chatrooms/:chatRoomId/messages', async (req, res) => {
//   try {
//     const { senderId, message } = req.body;
//     const { chatRoomId } = req.params;

//     const newMessage = await Message.create({ sender: senderId, message });
//     const chatRoom = await ChatRoom.findByIdAndUpdate(
//       chatRoomId,
//       { $push: { messages: newMessage._id } },
//       { new: true }
//     ).populate('messages');

//     res.status(201).json(chatRoom);
//   } catch (err) {
//     console.error('Error sending message to chat room:', err);
//     res.status(500).json({ error: 'Error sending message to chat room' });
//   }
// });

// Fetch messages from a chat room
app.get('/messages/:chatRoomId', async (req, res) => {
  try {
    const { chatRoomId } = req.params;

    // Find the chat room by chatRoomId
    const chatRoom = await ChatRoom.findOne({ chatRoomId }).populate('messages');

    if (!chatRoom) {
      console.error('room not found');
      return res.status(404).json({ error: 'Chat room not found' });
    }

    res.status(200).json({ messages: chatRoom.messages });
  } catch (err) {
    console.error('Error fetching messages from chat room:', err);
    res.status(500).json({ error: 'Error fetching messages from chat room' });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', (chatRoomId) => {
    socket.join(chatRoomId);
    console.log(`User joined room: ${chatRoomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  
});

// Send Messages
app.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;

    const sortedIds = [senderId, receiverId].sort();
    const chatRoomId = `${sortedIds[0]}${sortedIds[1]}`;

    let chatRoom = await ChatRoom.findOne({ chatRoomId });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({ chatRoomId, users: [senderId, receiverId], messages: [] });
      console.log('New chat room created:', chatRoom.chatRoomId);
    } else {
      console.log('Existing chat room found:', chatRoom.chatRoomId);
    }

    const newMessage = await Message.create({ sender: senderId, message });
    chatRoom.messages.push(newMessage._id);
    await chatRoom.save();


     // Extract and format the timestamp
     const formattedTime = formatTimestampToHHMM(newMessage.timestamp);
    //  console.log('timestamp' , newMessage.)
    // Update the lastMessage and lastTime fields for the user
    const user = await User.findByIdAndUpdate(
      receiverId,
      {
        lastMessage: message,
        lastTime: formattedTime
      },
      { new: true }
    );


    io.to(chatRoomId).emit('newMessage', { message: newMessage });
    // Emit updated users list
    const users = await User.find();
    io.emit('usersUpdated', users);


    res.status(201).json({ chatRoomId: chatRoom.chatRoomId, message: newMessage });
  } catch (err) {
    console.error('Error sending message to chat room:', err);
    res.status(500).json({ error: 'Error sending message to chat room' });
  }
});


// io.on('connection', async client => {
//   console.log('Connection received');
//   const user = await findOrCreateUser(username);
// });



app.get('/', (req, res) => {
  res.send('Chat server is running Viraj Gupta');
});

server.listen(5000, () => {
  console.log('Server running at port 5000...');
});

function formatTimestampToHHMM(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

