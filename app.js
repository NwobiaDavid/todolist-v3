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
const port = process.env.PORT || 3000;

app.use('/public',express.static(__dirname +'/public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


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

const userSchema= new mongoose.Schema({
    name: String,
    password: String,
    googleId: String,
    facebookId: String,
    todo: [String]
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);


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
      res.redirect('/home');
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
      res.redirect('/home');
    }
  );

  app.get('/login',(req,res)=>{
    res.render("login");
  });

  app.get("/signup",(req,res)=>{
    res.render("signup");
  })

app.get("/home" ,(req,res)=>{
  // console.log(req.user);
    User.findById(req.user.id)
    .then((foundUser) => {
      // console.log("found user ="+foundUser);
      res.render("home",{user:req.user.username,notes:foundUser.todo});
    })
    .catch((err) => {
      console.log(err);
    });
})


app.get("/compose",(req,res)=>{
  if(req.isAuthenticated()){
     res.render("compose");
  }else{
    res.redirect("/login");
  }
});



app.post("/compose",(req,res)=>{
  
  // console.log(req.body.textarea);

  // console.log(req.body.title);

  if(req.body.title === " " || req.body.textarea === " "){
    res.redirect('/home');
  }else{

    const newNote = {
    title : req.body.title,
    content : req.body.textarea
  };

  let obj = JSON.stringify(newNote);
  // console.log(newNote);



    User.findById(req.user.id)
    .then(foundUser=>{
      foundUser.todo.push(obj);
      console.log("successfully added "+ newNote);
      foundUser.save()
      .then(()=>{
        res.redirect("/home");
      })
      .catch(err=>{console.log(err);})
    })
    .catch(err=>{console.log(err);})
  }



})

app.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});


app.post("/signup",(req,res)=>{
  User.register( 
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect('/signup');
        } else {
          passport.authenticate('local')(req, res, function () {
            res.redirect('/home');
          });
        }
      }
    );
});



// function isLoggedIn(req, res, next){
//   if(req.isAuthenticated()){
//       return next();
//   }
//   res.redirect("/login");
// }

app.post("/login",(req,res)=>{
  const user = new User({
      email: req.body.username,
      password: req.body.password,
  })

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


app.listen(port, () => {
    console.log(`listening on port: ${port}...`);
  });
