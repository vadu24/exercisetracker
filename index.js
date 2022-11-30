const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

let exerciseSessionSchema = new mongoose.Schema({
  description:{type: String, required: true},
  duration:{type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

let exerciseSession = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)

app.post('/api/users', bodyParser.urlencoded({extended: false}), (request, response)=>{
  let newUser = new User({username: request.body.username})
  newUser.save((error, savedUser)=>{
    if(!error){
      let responseObject = {}
      responseObject ['username'] = savedUser.username
      responseObject ['_id'] = savedUser.id
      response.json(responseObject)
    }
  })
})

app.get('/api/users', (request, response)=>{
  User.find({}, (error, arrayOfUsers)=>{
    if(!error){
      response.json(arrayOfUsers)
    }
  })
})

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({extended: false}), (request, response)=>{

let newSession = new exerciseSession({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  })

  if(newSession.date == '' || newSession.date == undefined){
    newSession.date = new Date().toDateString()
  }

  User.findByIdAndUpdate(
    request.params._id,
    {$push: {log: newSession}},
    {new: true},
    (error, updatedUser)=>{
      if(!error){
      let responseObject = {}
      responseObject['_id'] = updatedUser.id
      responseObject['username'] = updatedUser.username
      responseObject['description'] = newSession.description
      responseObject['duration'] = newSession.duration
      responseObject['date'] = new Date(newSession.date).toDateString()
      response.json(responseObject)
      }
    }
  )
})

app.get('/api/users/:_id/logs', (request, response)=>{
  User.findById(request.params._id, (error, result)=>{
    if(!error){
      let responseObject = result
      
      if(request.query.from || request.query.to){
        let fromDate = new Date(0)
        let toDate = new Date()
        
        if(request.query.from){
          fromDate = new Date(request.query.from)
        }
        if(request.query.to){
          toDate = new Date(request.query.to)
        }
        fromDate = fromDate.getTime()
        toDate = toDate.getTime()
        responseObject.log = responseObject.log.filter((session)=>{
          let sessionDate = new Date(session.date).getTime()
          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }
      if(request.query.limit){
        responseObject.log = responseObject.log.slice(0, request.query.limit)
      }
      responseObject = responseObject.toJSON()
      responseObject['count'] = result.log.length
      response.json(responseObject)
    }

  }
  )
})