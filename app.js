var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
// 引入 mongoose
var mongoose = require('mongoose');
var models = require('./models/models');
var User = models.User;
var Note = models.Note;
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var checkLogin = require('./checkLogin.js');
//引入 moment.js
var moment = require('moment');
var app = express();

// 设置视图文件存放目录
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 设置静态文件存放目录
app.use(express.static(path.join(__dirname, 'public')));
// 解析 urlencoded 请求体必备
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 建立 session 模型
app.use(
  session({
    key: 'session',
    secret: 'Keboard cat',
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    store: new MongoStore({
      db: 'notes',
      mongooseConnection: mongoose.connection,
    }),
    resave: false,
    saveUninitialized: true,
  })
);

app.get('/reg', checkLogin.login);
// get 请求
app.get('/reg', function (req, res) {
  res.render('register', {
    title: '注册',
    user: req.session.user,
    page: 'reg',
  });
});

// post 请求
app.post('/reg', function (req, res) {
  var username = req.body.username,
    password = req.body.password,
    passwordRepeat = req.body.passwordRepeat;

  //检查两次输入的密码是否一致
  if (password != passwordRepeat) {
    console.log('两次输入的密码不一致！');
    //重定向到 /reg
    return res.redirect('/reg');
  }

  //检查用户名是否已经存在
  User.findOne({ username: username }, function (err, user) {
    if (err) {
      console.log(err);
      return res.redirect('/reg');
    }

    if (user) {
      console.log('用户名已经存在');
      return res.redirect('/reg');
    }

    //对密码进行md5加密
    var md5 = crypto.createHash('md5'),
      md5password = md5.update(password).digest('hex');

    var newUser = new User({
      username: username,
      password: md5password,
    });

    newUser.save(function (err, doc) {
      if (err) {
        console.log(err);
        return res.redirect('/reg');
      }
      console.log('注册成功！');
      newUser.password = null;
      delete newUser.password;
      req.session.user = newUser;
      return res.redirect('/');
    });
  });
});
app.get('/login', checkLogin.login);
app.get('/login', function (req, res) {
  res.render('login', {
    title: '登录',
    user: req.session.user,
    page: 'login',
  });
});

app.post('/login', function (req, res) {
  var username = req.body.username,
    password = req.body.password;

  User.findOne({ username: username }, function (err, user) {
    if (err) {
      console.log(err);
      return next(err);
    }
    if (!user) {
      console.log('用户不存在！');
      return res.redirect('/login');
    }
    //对密码进行md5加密
    var md5 = crypto.createHash('md5'),
      md5password = md5.update(password).digest('hex');
    if (user.password !== md5password) {
      console.log('密码错误！');
      return res.redirect('/login');
    }
    console.log('登录成功！');
    user.password = null;
    delete user.password;
    req.session.user = user;
    return res.redirect('/');
  });
});

app.get('/post', checkLogin.noLogin);
app.get('/post', function (req, res) {
  res.render('post', {
    title: '发布',
    user: req.session.user,
  });
});

app.post('/post', function (req, res) {
  var note = new Note({
    title: req.body.title,
    author: req.session.user.username,
    tag: req.body.tag,
    content: req.body.content,
  });

  note.save(function (err, doc) {
    if (err) {
      console.log(err);
      return res.redirect('/post');
    }
    console.log('文章发表成功！');
    return res.redirect('/');
  });
});
app.get('/', checkLogin.noLogin);
app.get('/', function (req, res) {
  Note.find({ author: req.session.user.username }).exec(function (err, arts) {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }
    res.render('index', {
      title: '笔记列表',
      user: req.session.user,
      arts: arts,
      //需引入 moment 模块
      moment: moment(arts.createTime).format('MMMM Do YYYY, h:mm:ss a'),
    });
  });
});
app.get('/detail/:_id', checkLogin.noLogin);
// 笔记详情
app.get('/detail/:_id', function (req, res) {
  Note.findOne({ _id: req.params._id }).exec(function (err, art) {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }
    if (art) {
      res.render('detail', {
        title: '笔记详情',
        user: req.session.user,
        art: art,
        //需引入 moment 模块
        moment: moment(art.createTime).format('MMMM Do YYYY, h:mm:ss a'),
      });
    }
  });
});

// 使用 mongoose 连接服务
mongoose.connect('mongodb://localhost:27017/notes', {
  useMongoClient: true,
});
mongoose.connection.on('error', console.error.bind(console, '连接数据库失败'));

app.listen(8080, function (req, res) {
  console.log('app is running at port 8080');
});