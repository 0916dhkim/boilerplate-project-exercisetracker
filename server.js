require("dotenv").config();

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define schema.
const exerciseUserSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const ExerciseUser = mongoose.model("ExerciseUser", exerciseUserSchema);
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now }
});
const Exercise = mongoose.model("Exercise", exerciseSchema);


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", async function(req, res) {
  try {
    if (!req.body.username) {
      throw new Error("Username not provided.");
    }
    const user = new ExerciseUser({ username: req.body.username });
    await user.save().then(u => {
      res.send({
        username: u.username,
        _id: u._id
      });
    });
  } catch (e) {
    res.send({
      error: e.message
    });
  }
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
