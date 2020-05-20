//jshint esversion:6


// to store secret keys and passwords and api
// require("dotenv").config();
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


////findOrCreate//////
const findOrCreate = require("mongoose-findorcreate");
//////////////////////////////


//GOOGLE AUTHENTICATION///////
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//////////////////////////////////



const app = express();
// const port = ;

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
    password: String,
    googleId: String,
    secret: String
});

//plugins are like giving extra power to our mongoose schema//
// this is going to hash and salt the passport
// this will do all the heavy lifting
userSchema.plugin(passportLocalMongoose);

// to enable findorcreate functionality
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// this is the part where we create and delete the cookies 
// here we are using cookies so we can authenticate already loggedIn user
passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});
////////////////////////////////////////////////////////////////////////////////

//////////////////////passport strategy for the google authentication///////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));
//////////////////////////////////////////////////////////////////////////////

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", {scope: ["profile"] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundSecrets){
    if(foundSecrets){
        res.render("secrets", {foundSecrets: foundSecrets});
        }
    });
    
});




app.get("/submit", function(req, res){
    if(req.isAuthenticated){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.get("/logout", function(req, res){
    req.logOut();
    res.redirect("/");
});


app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if(!err){
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save();
                res.redirect("/secrets");
            }
        }
    });
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
app.listen(process.env.PORT, () => console.log(`Example app listening on port port!`));

