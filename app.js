require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;


const app = express();
const port = 3000;


app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );
  
  app.use(passport.initialize());
  app.use(passport.session());

mongoose.connect( "mongodb://127.0.0.1:27017/userDB",{useNewUrlParser: true});

// const todoSchema = new mongoose.Schema({
//     task: [String],
// })


const userSchema= new mongoose.Schema({
    name: String,
    password: String,
    googleId: String,
    facebookId: String,
    todo: [String]
})

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

app.use('/public',express.static(__dirname +'/public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/home',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // console.log(profile);
        // Find or create user in your database
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          // Create new user in database
          const username =
            Array.isArray(profile.emails) && profile.emails.length > 0
              ? profile.emails[0].value.split('@')[0]
              : '';
          const newUser = new User({
            username: profile.displayName,
            googleId: profile.id,
          });
          user = await newUser.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRETS,
      callbackURL: 'http://localhost:3000/auth/facebook/home',
    },
    async function (accessToken, refreshToken, profile, done) {
        try {
         
          // Find or create user in your database
          let user = await User.findOne({ facebookId: profile.id });
          if (!user) {
            // Create new user in database
            const username =
              Array.isArray(profile.emails) && profile.emails.length > 0
                ? profile.emails[0].value.split('@')[0]
                : '';
            const newUser = new User({
              username: profile.displayName,
              facebookId: profile.id,
            });
            user = await newUser.save();
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
  )
);

app.get("/",(req,res)=>{
    res.render("login");
})

app.get(
    '/auth/facebook',
    passport.authenticate('facebook', { scope: ['public_profile'] })
  );
  
  app.get('/auth/facebook/home',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function (req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
    }
  );
  
  app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
  );
  
  app.get(
    '/auth/google/home',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
    }
  );

  app.get('/login',(req,res)=>{
    res.render("login");
  });

  app.get("/signin",(req,res)=>{
    res.render("sigin");
  })

app.get("/home",(req,res)=>{
    User.findById(req.user.id)
    console.log(req.user)
    .then(() => {
        res.render("home",{user:user.req.user.username});
    })
    .catch((err) => {
      console.log(err);
    });
})


app.post("/login",(req,res)=>{
    const user = new User({
        email: req.body.email,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate('local')(req, res, function () {
            res.redirect('/home');
          });
        }
      }); 
});

app.post("/signin",(req,res)=>{
    User.register(
        { username: req.body.email },
        req.body.password,
        function (err, user) {
          if (err) {
            console.log(err);
            res.redirect('/signin');
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/');
            });
          }
        }
      );
});

app.listen(port, () => {
    console.log(`listening on port${port}...`);
  });
  