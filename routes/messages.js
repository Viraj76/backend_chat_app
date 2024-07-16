const express = require('express');
const router = express.Router();
const { User, ChatRoom } = require('./models');

// Create or find a chat room
router.post('/chatrooms', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    let chatRoom = await ChatRoom.findOne({ users: { $all: [userId1, userId2] } });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({ users: [userId1, userId2], messages: [] });
      console.log('New chat room created:', chatRoom._id);
    } else {
      console.log('Existing chat room found:', chatRoom._id);
    }

    res.status(200).json({ chatRoomId: chatRoom._id });
  } catch (err) {
    console.error('Error creating or finding chat room:', err);
    res.status(500).json({ error: 'Error creating or finding chat room' });
  }
});

// Send a message to a chat room
router.post('/chatrooms/:chatRoomId/messages', async (req, res) => {
  try {
    const { senderId, message } = req.body;
    const { chatRoomId } = req.params;

    const newMessage = await Message.create({ sender: senderId, message });
    const chatRoom = await ChatRoom.findByIdAndUpdate(
      chatRoomId,
      { $push: { messages: newMessage._id } },
      { new: true }
    ).populate('messages');

    res.status(201).json(chatRoom);
  } catch (err) {
    console.error('Error sending message to chat room:', err);
    res.status(500).json({ error: 'Error sending message to chat room' });
  }
});

// Fetch messages from a chat room
router.get('/chatrooms/:chatRoomId/messages', async (req, res) => {
  try {
    const { chatRoomId } = req.params;

    const chatRoom = await ChatRoom.findById(chatRoomId)
      .populate('messages')
      .populate('users', 'username');

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    res.status(200).json(chatRoom.messages);
  } catch (err) {
    console.error('Error fetching messages from chat room:', err);
    res.status(500).json({ error: 'Error fetching messages from chat room' });
  }
});

module.exports = router;
