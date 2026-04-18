import mongoose from 'mongoose';


const doctorScheme = new mongoose.Schema(
  {
    'role': {
      "type": String,
      "required": true
    },
    'firstName': {
      "type": String,
      "required": true
    },
    'lastName': {
      "type": String,
      "required": true
    },
    'specialization': {
      "type": String,
      "required": true,
      default: "General Physician"
    },
    'qualifications': {
      "type": String,
      "required": true,
      default: "M.B.B.S"
    },
    'languages': {
      "type": [String],
      "required": true,
      default: ["English", "Hindi"]
    },
    'tags': {
      "type": [String],
      "default": ["Fever", "Cough", "Cold"]
    },
    'document': {
      "type": String,
      "required": true
    },
    'about': {
      "type": String,
      "required": true
    },
    'email': {
      type: String,
      require: true,
      unique: true
    },
    'password': {
      "type": String,
      "required": true
    },
    "experience": {
      "type": Number,
      "required": true
    },
    "rating": {
      "type": Number,
      "required": true,
      default: 0
    },
    "consultateFee": {
      "type": Number,
      "required": true,
      default: 199
    },
    "availableSlots": {
      "type": [String],
      "default": ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"]
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }


  }
)
const doctormondel = new mongoose.model('doctorsData', doctorScheme);
export default doctormondel;