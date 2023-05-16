//jshint esversion:6
const https = require("https") // https module to create a ssl enabled server
const path = require("path") // path module 
const fs = require("fs")

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const twilio = require("twilio");
const { log } = require("console");
require('dotenv').config()

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//todo                                       || Twilio Auth Token ||
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const client = require("twilio")(accountSid, authToken);

//todo                                       || MongoDB Connection ||
mongoose.connect(process.env.MONGO_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
});

//todo                                       || Mongoose Schema & Model ||
const userSchema = {
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNum: {
    type: String,
    required: true,
  },
};

const User = mongoose.model("User", userSchema);

//todo                                       || OTP Generator ||
var otp = (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);

//todo                                       || Check Variables ||
var userName = "";
var userPass = "";
var userNumber = "";
var otpAlert = "";
var alertText = "";
var userExist = "";
// const mapsURL = 'https://www.google.com/maps/place/18°27\'55.9"N'+'+'+'73°50\'10.9"E'
const mapsURL = 'https://www.google.com/maps/place/18.455294,%2073.835316'

//todo                                       || Login Page Routes ||
app.get("/", (req, res) => {
  res.render("login", { error: alertText });
});

app.post("/login", (req, res) => {
  userName = req.body.Username;
  userPass = req.body.Userpassword;

  User.find({ username: userName }, function (err, users) {
    users.forEach((user) => {
      const pass = user.password;
      const name = user.username;
      if (name === userName && pass === userPass) {
        displayUser = name;
        res.redirect("/home");
      } else {
        alertText = "Incorrect Username and Password";
        res.redirect("/");
      }
    });
  });
});

//todo                                       || SignUp Page Routes ||
app.get("/signup", (req, res) => {
  res.render("signup", { exist: userExist });
});

app.post("/signup", (req, res) => {
  userName = req.body.Username;
  userPass = req.body.Userpassword;
  userNumber = req.body.userNumber;


  client.messages
    .create({
      body: `OTP form Emergency SOS App - ${otp}`,
      from: process.env.MAIN_NUMBER,
      to: `+91${userNumber}`
    })
    .then(message => console.log(message.sid));

  res.redirect("/verify")


});

//todo                                       || OTP Page Routes ||
app.get("/verify", (req, res) => {
  const currentNum = userNumber;
  res.render("otp-verify", { userPhoneNum: currentNum, error: otpAlert });
})

app.post("/verify", (req, res) => {
  const userEnterOTP = req.body.userOtp
  
  if (userEnterOTP === otp) {
    User.findOne({ username: userName }, function (err, user) {
      if (user) {
        userExist = "Username already exist";
        res.redirect("/signup");
      } else {
        const user = new User({
          username: userName,
          password: userPass,
          phoneNum: userNumber,
        });
        user.save();
        res.redirect("/home");
      }
    });
  }
  else {
    otpAlert = "Incorrect OTP"
    res.redirect("/verify")
  }




})


//todo                                       || Home Page Routes ||
app.get("/home", (req, res) => {
  let dataGlobal;

  const getData = async () => {
    const response = await fetch("http://ip-api.com/json/?fields=61439");
    const data = await response.json();
    dataGlobal = data;
  };

  (async () => {
    await getData();
    const userAd =
      dataGlobal.city +
      " " +
      dataGlobal.regionName +
      " " +
      dataGlobal.countryCode;
    const userLat = dataGlobal.lat;
    const userLon = dataGlobal.lon;
    res.render("homepage", {
      userName: userName,
      address: "Pune Maharashtra IN",
      lat: "18.455294",
      lon: "73.835316",
    });
  })();
});

app.post("/home", (req, res) => {
  const url = 'https://www.google.com/maps/place/' + req.body.userLat + "," + req.body.userLong;
  const numbers = [process.env.NUMBER1, process.env.NUMBER2];
  const messageBody = `There's been an Emergency at - [ ${url} ]`

  numbers.forEach(async (number) => {
    await client.messages
      .create({
        body: messageBody,
        to: number,
        from: process.env.MAIN_NUMBER,
      })
      .then((message) => console.log(message.sid));
  });

  res.redirect("/home");
});

//todo                                       || Server ||
// app.listen(process.env.PORT || 3030, () => {
//   console.log("Server started on port 5000");
// });

const port = 3030

const sslserver = https.createServer(app)
sslserver.listen(port,()=>{console.log(`Secure Server is listening on port ${port}`)});
