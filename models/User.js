const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ["student", "mentor", "admin"], default: "student" },

  age: { type: Number, min: 13, max: 100 },
  country: { type: String },

  profileImage: { type: String },
  token: { type: String },

  interests: [{ type: String }],
  customInterest: { type: String },
  handsOnPractice: { type: Boolean, default: false },
  remoteLabAccess: { type: Boolean, default: false },

  followList: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }
  ],

  requestList: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      status: {
        type: String,
        enum: [ 'sent', 'pending' ],
        default: 'pending',
      }
    }
  ]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
