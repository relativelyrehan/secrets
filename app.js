//jshint esversion:6


// to store secret keys and passwords and api
require("dotenv").config();
////////////////////////////////////////////


const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

//this order is to be maintained//
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//////////////////////////////////////////////


const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));


//this is to be placed top of the mongoose.conenct
app.use(session({
    secret: process.env.SECRET, // this secret is placed in the env file
    resave: false, // 
    saveUninitialized: false
}));

// to use passport we have to first intialize it
app.use(passport.initialize());
// Using passport to set up the session
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
//this line is to no longer have the deprecation warning///
mongoose.set('useCreateIndex', true);
//////////////////////////////////////////////////////////


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//plugins are like giving extra power to our mongoose schema//
// this is going to hash and salt the passport
// this will do all the heavy lifting
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

// this is the part where we create and delete the cookies 
// here we are using cookies so we can authenticate already loggedIn user
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res){
    if (req.isAuthenticated) { res.render("secrets");}
    else{res.redirect("/login");}
    
});

app.get("/logout", function(req, res){
    req.logOut();
    res.redirect("/");
});


app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

 });

app.post("/login", function(req, res){
   const user = new User({
       username: req.body.username,
       password: req.body.password
   });

   req.login(user, function(err){
       if(!err){
           passport.authenticate("local")(req, res, function(){
               res.redirect("/secrets");
           });
       } else{
           console.log(err);
       }
   });
}
    );

app.post("/", function (req, res) {
    res.send("Hello World!!");
});
app.listen(port, () => console.log(`Example app listening on port port!`));

