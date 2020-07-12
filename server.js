// server.js
// where your node app starts

// init project
var express = require("express");
var app = express();
var dotenv = require("dotenv");
var mongoose = require("mongoose");
var nanoid = require("nanoid").customAlphabet("1234567890abcdef", 7);
var bodyParser = require("body-parser");

dotenv.config();
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
var cors = require("cors");
app.use(cors({ optionSuccessStatus: 200 })); // some legacy browsers choke on 204

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

var userSchema = new mongoose.Schema({
  _id: { type: String, default: () => nanoid() },
  username: String
});
var User = mongoose.model("user", userSchema);

var exerciseSchema = new mongoose.Schema({
  _id: { type: String, default: () => nanoid() },
  userId: String,
  description: String,
  duration: Number,
  date: Date
});
var Exercise = mongoose.model("exercise", exerciseSchema);

app.post("/api/exercise/new-user", (req, res, next) => {
  var username = req.body.username;
  User.find({ username: username }, (userFindErr, userFindData) => {
    console.log(userFindErr);
    if (Object.keys(userFindData).length != 0) {
      return next({ status: 400, message: "Username already taken" });
    }

    var newUser = new User({ username: username });
    newUser.save((saveUserErr, saveUserData) => {
      if (!saveUserErr && saveUserData) {
        res.json({ _id: saveUserData._id, username: saveUserData.username });
      } else {
        next(saveUserErr);
      }
    });
  });
});

app.get("/api/exercise/users", (req, res, next) => {
  User.find()
    .select("_id username")
    .exec((err, data) => {
      if (!err && data) {
        res.json(data);
      } else {
        next(err);
      }
    });
});

app.post("/api/exercise/add", (req, res, next) => {
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = parseFloat(req.body.duration);
  var date;

  function getDate() {
    if (new Date(req.body.date).toDateString() !== "Invalid Date") {
      return new Date(req.body.date).toDateString();
    } else if (req.body.date === "") {
      let dte = new Date().toDateString();
      return dte;
    } else {
      res.send("Invalid Date");
      let dte = new Date().toDateString();
      return dte;
    }
  }

  var exercise = new Exercise({
    userId: userId,
    description: description,
    duration: duration,
    date: getDate()
  });

  exercise.save((saveExerciseErr, saveExerciseData) => {
    //console.log(saveExerciseErr, saveExerciseData);
    if (!saveExerciseErr && saveExerciseData) {
      User.findOne({ _id: userId }, (findUserErr, findUserData) => {
        //console.log(findUserErr, findUserData);
        if (!findUserErr && findUserData) {
          try {
            res.json({
              _id: findUserData._id,
              username: findUserData.username,
              description: description,
              duration: duration,
              date: new Date(saveExerciseData.date).toDateString()
            });
          } catch (err) {
            console.log(err);
          }
        } else {
          next(findUserErr);
        }
      });
    } else {
      next(saveExerciseErr);
    }
  });
});

app.get("/api/exercise/log", (req, res, next) => {
  var userId = req.query.userId;
  var from = req.query.from;
  var to = req.query.to;
  var limit = parseInt(req.query.limit || "");
  User.findOne({ _id: userId })
    .select("_id username")
    .exec((err, data) => {
      if (!err && data) {
        var query = Exercise.find({ userId: userId });
        if (from) {
          query.where("date").gte(from);
        }
        if (to) {
          query.where("date").lte(to);
        }
        if (limit > 0) {
          query.limit(limit);
        }

        query.exec((err2, data2) => {
          if (!err2 && data2) {
            res.json({
              _id: data._id,
              username: data.username,
              log: data2.map(item => ({
                description: item.description,
                duration: item.duration,
                date: new Date(item.date).toDateString()
              })),
              count: data2.length
            });
          }
        });
      } else {
        res.send("Error in finding user");
      }
    });
});

app.use((err, req, res, next) => {
  if (err) {
    console.log(err);
    res
      .status(err.status || 500)
      .type("txt")
      .send(err.message || "SERVER ERROR");
  }
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
