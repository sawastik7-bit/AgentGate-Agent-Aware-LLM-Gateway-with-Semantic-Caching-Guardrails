import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const agentSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Indexed for fast lookups per user
    },
    title: {
      type: String,
      default: 'New Conversation'
    },
    messages: [messageSchema] // Embedded array tracking the conversation loop
  },
  {
    timestamps: true // Automatically manages createdAt and updatedAt
  }
);

export const AgentSession = mongoose.model('AgentSession', agentSessionSchema);