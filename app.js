var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var index = require('./routes/index');
var users = require('./routes/users');
var ueditor=require('ueditor');
var http=require('http');
var sio=require('socket.io');
var app = express();
var server=http.createServer(app);
app.use(session({
    secret:'blog',
    cookie:{maxAge:1000*60*60*24*30},
    resave: false,
    saveUninitialized: true
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//ueditor
app.use("/libs/ueditor/ue", ueditor(path.join(__dirname, 'public'), function (req, res, next) {
    // ueditor 客户发起上传图片请求
    if (req.query.action === 'uploadimage') {
        var foo = req.ueditor;
        var date = new Date();
        var imgname = req.ueditor.filename;
        var img_url = '/images';
        res.ue_up(img_url); //你只要输入要保存的地址 。保存操作交给ueditor来做
    }
    //  客户端发起图片列表请求
    else if (req.query.action === 'listimage') {
        var dir_url = '/images';
        res.ue_list(dir_url);  // 客户端会列出 dir_url 目录下的所有图片
    }
    // 客户端发起其它请求
    else {
        res.setHeader('Content-Type', 'application/json');
        res.redirect('/libs/ueditor/nodejs/config.json')
    }
}));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
   res.render("404");
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
server.listen(3000,function(){
    console.log('listening port 3000');
});
var io=sio.listen(server);
var chatnames=[];
var enternames=[];
var playnames=[];
io.sockets.on('connection',function(socket){
    console.log('connects');
    socket.on('login',function(name){
        for(var i=0;i<chatnames.length;i++){
            if(name==chatnames[i]){
                return;
            }
        }
        chatnames.push(name);
        io.sockets.emit('login',name);
        io.sockets.emit('sendClients',chatnames);
        console.log(name);
    });
    socket.on('enter',function(name){
        for(var i=0;i<enternames.length;i++){
            if(name==enternames[i]){
                return;
            }
        }
        console.log(name)
        enternames.push(name);
        console.log(enternames)
        io.sockets.emit('enter',enternames);  
    });
    socket.on('begin',function(name){
        for(var i=0;i<playnames.length;i++){
            if(name==playnames[i]){
                return;
            }
        }
        console.log(name)
        playnames.push(name);
        console.log(playnames)
        io.sockets.emit('begin',playnames); 
    })
    socket.on('play',function(data){
        io.sockets.emit('play',data);
    })
    socket.on('over',function(data){
        playnames.slice(0,playnames.length);
        var sendData;
        if(data.thing=='win'){
            sendData={'thing':'win','name':data.name};
          io.sockets.emit('over',sendData);
        }
        else{
            sendData={'thing':'ping'};
            io.sockets.emit('over',sendData);
        }
    });
    socket.on('exitgame',function(name){
        enternames.pop(name);
        console.log(enternames);
        io.sockets.emit('exitname',name);
    })
    socket.on('chat',function(data){
        io.sockets.emit('chat',data);
    })
    socket.on('exit',function(name){
        for(var i=0;i<chatnames.length;i++){
            if(chatnames[i]==name){
                chatnames.splice(i,1);//删除当前的name元素
                break;
            }
        }
        socket.broadcast.emit('exit',name);
        io.sockets.emit('sendClients',chatnames)
    })
})
module.exports = app;
