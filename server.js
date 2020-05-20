require("dotenv").config();

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to Database.");
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

app.post("/api/exercise/add", async function(req, res) {
  try {
    // Check required fields.
    if (!req.body.userId || !req.body.description || !req.body.duration) {
      throw new Error("Missing required field(s).");
    }
    if (isNaN(req.body.duration)) {
      throw new Error("Duration should be a number.");
    }
    const user = await ExerciseUser.findById(req.body.userId);
    if (!user) {
      throw new Error("Unable to find user.");
    }
    const exercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: Number.parseFloat(req.body.duration),
      date: req.body.date ? new Date(req.body.date) : undefined
    });
    await exercise.save().then(x => {
      res.send({
        _id: user._id,
        username: user.username,
        description: x.description,
        duration: x.duration,
        date: x.date.toDateString()
      });
    });
  } catch (e) {
    res.send({
      error: e.message
    });
  }
});

app.get("/api/exercise/users", async function(req, res) {
  try {
    const users = await ExerciseUser.find();
    res.send(users);
  } catch (e) {
    res.send({
      error: e.message
    });
  }
});

app.get("/api/exercise/log", async function(req, res) {
  try {
    const { userId, from, to, limit } = req.query;
    // Check required fields.
    if (!userId) {
      throw new Error("Missing userId.");
    }
    if (from && isNaN(new Date(from)) || to && isNaN(new Date(to))) {
      throw new Error("Invalid Date Format");
    }
    if (limit && isNaN(limit)) {
      throw new Error("limit is not a number.");
    }

    const user = await ExerciseUser.findById(userId);
    if (!user) {
      throw new Error("Unable to find user.");
    }

    // Query exercises.
    let query = Exercise.find({ userId: user._id });
    if (from) {
      query = query.where("date").gt(new Date(from));
    }
    if (from) {
      query = query.where("date").lt(new Date(to));
    }
    if (limit) {
      query = query.limit(Number.parseInt(limit));
    }
    query = query.select({
      _id: 0,
      description: 1,
      duration: 1,
      date: 1
    });
    const log = await query.exec();
    res.send({
      _id: user._id,
      username: user.username,
      log,
      count: log.length
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
