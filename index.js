const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI);

const profileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  exercises: {
    type: Array,
    default: []
  }
});

let Profile = mongoose.model('user', profileSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//create new profile
app.post('/api/users', async (req, res) => {
  try {
    let username = req.body.username;
    let id
    //find username in database
    let find_user = await Profile.collection.findOne({username: username});
    //if no user found
    if ( ! find_user ) {
      let res_obj = {username: username};
      let new_user = new Profile(res_obj);
      id = new_user.id;
      new_user.save();
    }
    //if user found
    else {
      id = find_user._id.toHexString();
    }
    res.json({
      "username": username,
      "_id": id
    });
  }
  catch (err) {
    console.log(err)
  };
});

//add exercise to profile in database
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    let { _id }= req.params;
    let data = await Profile.findById(_id);
    //if profile match found
    if ( data ) {
      let date = req.body.date ? new Date(req.body.date) : new Date();
      let date_string = date.toDateString();
      //add object of exercise appointment to array
      data.exercises.push({
        description: req.body.description,
        duration: Number(req.body.duration),
        date: date_string
      });
      await data.save();
      let res_obj = {
        _id: _id,
        username: data.username,
        date: date_string,
        duration: Number(req.body.duration),
        description: req.body.description
      }
      res.send(res_obj);
    }
  }
  catch (err) {
    console.log(err);
  };
})

//get list of all users
app.get('/api/users', async (req, res) => {
  try {
    all_profiles = await Profile
    .find({})
    .select({exercises: 0});
    res.send(all_profiles);
  }
  catch (err) {
    console.log(err);
  }
})

// a = () => Profile.collection.deleteMany({})
// a

//get exercise log from user
app.get('/api/users/:_id/logs/', async ( req, res ) => {
  try {
    let { _id } = req.params;
    let { from, to, limit } = req.query
    let profile = await Profile.findById({ _id: _id });

    let date_regex = /^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/
    let from_valid = date_regex.test(from);
    let to_valid = date_regex.test(to);
    let limit_invalid = isNaN(limit);

    let log = profile.exercises ? profile.exercises.sort(( a, b ) => new Date( a.date ) - new Date( b.date )) : [];
    let count = log.length;

    if (from_valid) {
      log = log.filter((obj) => {
        return new Date(new Date(from).toDateString()) <= new Date(obj.date)
      });
    };
    if (to_valid) {
      log = log.filter((obj) => {
        return new Date(new Date(to).toDateString()) >= new Date(obj.date)
      })
    }
    if (!limit_invalid) {
      log = log.slice(0, limit)
    };
  
    res.send({
      _id: profile._id,
      username: profile.username,
      count: count,
      log: log
    });
  }
  catch (err) {
    console.log(err);
  }
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
