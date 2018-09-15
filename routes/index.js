var express = require('express');
var router = express.Router();
const mysql = require('./../database');
var fs=require("fs");
var multer=require("multer");
var nodemailer=require("nodemailer");
var path=require("path");
var os=require('os');
var network=os.networkInterfaces()['无线网络连接'];
//解决数据库操作回调地狱
var optMysql=function(sql){
    return new Promise(function(resolve,reject){
        mysql.query(sql,function(err,data){
            if(err){
                reject(err);
            }
            else{
                resolve(data)
            }
        })
    })
}
/* 首页*/
router.get('/', function(req, res, next) {   
       //分页管理实现
       var page=req.query.page || 1;
       var start=(page-1)*4;
       var end=page*4;
       var queryCount="select count(*) as articleNum from article";
       var query='select *from article order by articleID desc limit '+start+','+end;//按id从大到小排序,使得新发布的文章排在前面
        optMysql(query).then(function(data){
             var articles=data;
                //处理时间样式,使其美观
                articles.forEach(function(ele){
                    var year=ele.articleTime.getFullYear();
                    var month=ele.articleTime.getMonth()+1>10?ele.articleTime.getMonth()+1:'0'+(ele.articleTime.getMonth()+1);
                    var day=ele.articleTime.getDate()>10?ele.articleTime.getDate():'0'+(ele.articleTime.getDate());
                    var hour=ele.articleTime.getHours()>10?ele.articleTime.getHours():'0'+(ele.articleTime.getHours());
                    var min=ele.articleTime.getMinutes()>10?ele.articleTime.getMinutes():'0'+(ele.articleTime.getMinutes())
                    ele.articleTime=year+'-'+month+'-'+day+' '+hour+':'+min;
                })
                optMysql(queryCount).then(function(data){
                    var articleNum=data[0].articleNum;
                    var pageNum=Math.ceil(articleNum/4);
                    res.render('index',{articles:articles,user:req.session.user,pageNum:pageNum,page:page})
                }).catch(function(err){console.log(err)});
        }).catch(function(err){console.log(err)});
    });
//上传头像
var uploadSingle=multer({
    dest:'/upload'
})
function unique(arr){
        // 遍历arr，把元素分别放入tmp数组(不存在才放)
        var tmp = new Array();
        for(var i in arr){
            //该元素在tmp内部不存在才允许追加
            if(tmp.indexOf(arr[i])==-1){
                tmp.push(arr[i]);
            }
        }
        return tmp;
    }
router.post('/',uploadSingle.single('file'),function(req,res,next){
    var authorID=req.session.user.authorID;
    fs.rename(req.file.path,"public/img/userImg/"+req.file.originalname,function(err){
        if(err){
            console.log(err);
            return;
        }
        console.log("上传成功");
        var imgPath="img/userImg/"+req.file.originalname;
        var sql="update author set touxiang="+mysql.escape(imgPath)+"where authorID="+mysql.escape(authorID);
        optMysql(sql).then(function(){}).catch(function(err){console.log(err)});
        req.session.user.touxiang=imgPath;
        res.redirect('/');   
    })
})
router.post('/change',uploadSingle.single('file'),function(req,res,next){
     var authorID=req.session.user.authorID;
    var authorName=req.session.user.authorName;
    fs.rename(req.file.path,"public/img/userImg/"+req.file.originalname,function(err){
        if(err){
            console.log(err);
            return;
        }
        console.log("上传成功");
        var imgPath="img/userImg/"+req.file.originalname;
        var sql="update author set touxiang="+mysql.escape(imgPath)+"where authorID="+mysql.escape(authorID);
        optMysql(sql).then(function(){}).catch(function(err){console.log(err)});
        
        var sql2="update article set authorTouxiang="+mysql.escape(imgPath)+"where articleAuthor="+mysql.escape(authorName);
        optMysql(sql2).then(function(){}).catch(function(err){console.log(err)});
        
        var sql3="update chatname set touxiang="+mysql.escape(imgPath)+"where name="+mysql.escape(authorName);
        optMysql(sql3).then(function(){}).catch(function(err){console.log(err)});
        
        var sql4="update chatmsg set touxiang="+mysql.escape(imgPath)+"where chatName="+mysql.escape(authorName);
        optMysql(sql4).then(function(){}).catch(function(err){console.log(err)});
        
        var sql5="update comment set commentTouxiang="+mysql.escape(imgPath)+"where commentName="+mysql.escape(authorName);
        optMysql(sql5).then(function(){}).catch(function(err){console.log(err)});
         req.session.user.touxiang=imgPath;
        res.redirect('/'); 
    })
})
//登录页面
router.get('/login',function(req,res,next){
    res.render("login",{message:"",name:'',pwd:''})
})
//登录信息验证,信息存在session中
router.post('/login',function(req,res,next){
    var name=req.body.name;
    var password=req.body.password;
    if(name==""){
        res.render("login",{msg:"账号不能为空"});
        return;
    }
    else if(password==""){
        res.render("login",{msg:"密码不能为空"});
        return;
    }
    var sql="select *from author where authorName="+mysql.escape(name)+"and authorPassword="+mysql.escape(password);//mysql.escape防止sql注入攻击
    optMysql(sql).then(function(data){
           var user=data[0];
           if(!user){
              res.render('login',{message:"账号或密码错误",name:'',pwd:''});
               return;
           }
           //验证用户有无激活
             if(!user.ifactive){
                 res.render('login',{message:"账户未激活,已发送验证链接到你注册的邮箱中",name:name,pwd:password});
                 //邮箱验证
            var transport=nodemailer.createTransport({
                service:'qq',
                port:3000,
                auth:{
                   user:'249041573@qq.com',
                   pass:'omfbswhwkbbccacf'
                }
            });
            var mailOptions={
                from:'249041573@qq.com',//发送者
                to:user.authorMail,//收件人,可多个,以逗号隔开
                subject:'个人博客邮箱验证',//标题
                text:'',//文本
                html:`<h2>尊敬的用户<span style="color:red">${user.authorName}</span>你好,点击下面链接完成邮箱验证<h2><br>
                      <a href="http://${network[3].address}:3000/yanzheng/?name=${user.authorName}&code=${user.randomChar}">http://${network[3].address}:3000/yanzheng</a>`
             }
            transport.sendMail(mailOptions,function(err,info){
                if(err){
                    console.log(err);
                    return;
                }
            })
             
             }
            else{
            req.session.user=user;
             req.session.user.ip=network[3].address;  
                 console.log(req.session.user.ip)
            res.redirect('/');//重定向跳转
            }
        }).catch(function(err){console.log(err)});
});
function randomString(len){
    var chars="ABCDEFGHIJKLMNOPQRSTUVWXWZabcdefghijklmnopqrstuvwxyz1234567890";
    var maxlen=chars.length;
    var str="";
    for(i=0;i<len;i++){
        str+=chars.charAt(Math.floor(Math.random()*maxlen));
    }
    return str;
}
//验证邮箱
router.get('/yanzheng',function(req,res,next){
    var name=req.query.name;
    var code=req.query.code;
    var sql="select*from author where authorName="+mysql.escape(name);
    optMysql(sql).then(function(data){
        if(code!=data[0].randomChar){
            res.render('login',{message:"邮箱验证错误,账户不能激活",name:'',pwd:''});
            res.redirect('/zhuce');
            return;
        }
        var pwd=data[0].authorPassword;
        var sql2="update author set ifactive=1";
        optMysql(sql2).then(function(){}).catch(function(err){console.log(err)});
        res.render('login',{message:"账户已激活",name:name,pwd:pwd});
    }).catch(function(err){console.log(err)});
})
//注册页面
router.get('/register',function(req,res,next){
    res.render('register',{msg:""});
})
router.post('/register',function(req,res,next){
    var name=req.body.name;
    var password=req.body.password;
    var mail=req.body.mail;
    var reg1=/[0-9]{6,10}/;
    var reg2=/[0-9]{1,19}@(qq|163).com/;
    if(name==""){
        res.render("zhuce",{msg:"账号不能为空"});
        return;
    }
    else if(password==""){
        res.render("zhuce",{msg:"密码不能为空"});
        return;
    }
    else if(mail==""){
        res.render("zhuce",{msg:"邮箱不能为空"});
        return;
    }
    else if(!password.match(reg1)){
        res.render("zhuce",{msg:"密码格式错误"});
        return;
    }
    else if(!mail.match(reg2)){
            res.render("zhuce",{msg:"邮箱格式错误"});
            return;
            }
    else{
    var sql="select*from author where authorName="+mysql.escape(name);
    optMysql(sql).then(function(data){
        if(data.length>0){
            res.render("zhuce",{msg:"账号已被注册,请重新注册"});
            return;
        }
        var randomStr=randomString(Math.floor(Math.random()*40));
        var query="insert into author set authorName="+mysql.escape(name)+",authorPassword="+mysql.escape(password)+",touxiang='kong',authorMail="+mysql.escape(mail)+",randomChar="+mysql.escape(randomStr)+",ifactive=0";
        optMysql(query).then(function(data){}).catch(function(err){console.log(err)});  
        res.redirect('/login');
    })
    }
})
//文章内容页
router.get('/articles/:articleID',function(req,res,next){
           //显示对应的文章
    var user=req.session.user;
    if(!user){
        res.redirect('/login');
        return;
    }
    var articleID=req.params.articleID;
    //更新浏览次数
    var query="update article set articleClick=articleClick+1 where articleID="+mysql.escape(articleID);
    optMysql(query).then(function(){}).catch(function(err){console.log(err)}); 
    
    var sql="select *from article where articleID="+mysql.escape(articleID);
    optMysql(sql).then(function(results){
            var article=results[0];
            //时间格式化
            var year=article.articleTime.getFullYear();
            var month=article.articleTime.getMonth()+1>10?article.articleTime.getMonth()+1:'0'+(article.articleTime.getMonth()+1);
            var day=article.articleTime.getDate()>10?article.articleTime.getDate():'0'+article.articleTime.getDate();
            var hour=article.articleTime.getHours()>=10?article.articleTime.getHours():'0'+article.articleTime.getHours();
            var min=article.articleTime.getMinutes()>=10?article.articleTime.getMinutes():'0'+article.articleTime.getMinutes();
            article.articleTime=year+'-'+month+'-'+day+' '+hour+':'+min;
                //分页管理实现
            var page=req.query.page || 1;
            var start=(page-1)*5;
            var end=page*5;
            var sql2="select *from comment where articleID="+mysql.escape(articleID)+" order by commentID limit "+start+","+end;
            optMysql(sql2).then(function(results){
                    var comments=results;
                //处理时间样式,使其美观
                   comments.forEach(function(ele){
                    var year=ele.commentTime.getFullYear();
                    var month=ele.commentTime.getMonth()+1>=10?ele.commentTime.getMonth()+1:'0'+(ele.commentTime.getMonth()+1);
                    var day=ele.commentTime.getDate()>=10?ele.commentTime.getDate():'0'+(ele.commentTime.getDate());
                    var hour=ele.commentTime.getHours()>=10?ele.commentTime.getHours():'0'+(ele.commentTime.getHours());
                    var min=ele.commentTime.getMinutes()>=10?ele.commentTime.getMinutes():'0'+(ele.commentTime.getMinutes());
                    ele.commentTime=year+'-'+month+'-'+day+' '+hour+':'+min;
                })
                    var count=article.commentNum;
                    var pageNum=Math.ceil(count/5);
                    res.render('article',{article:article,user:req.session.user,comments:comments,pageNum:pageNum,page:page,articleID:articleID});
            }).catch(function(err){console.log(err)});
    }).catch(function(err){console.log(err)});
})
//文章编辑页
router.get('/edit',function(req,res,next){
    var user=req.session.user;
    if(!user){
        res.redirect('/login');
        return;
    }
    res.render('edit',{user:req.session.user});
})
router.post('/edit',function(req,res,next){
    var title=req.body.title;
    var content=req.body.info;
    var author=req.session.user.authorName;
    var touxiang=req.session.user.touxiang
    var sql="insert into article set articleTitle="+mysql.escape(title)+",articleContent="+mysql.escape(content)+",articleAuthor="+mysql.escape(author)+",articleTime=NOW(),articleClick=0,commentNum=0,authorTouxiang="+mysql.escape(touxiang);
    optMysql(sql).then(function(){}).catch(function(err){console.log(err)});
    res.redirect('/');
})
//友情链接页
router.get('/friendsLink',function(req,res,next){
    res.render('friendsLink',{user:req.session.user});
})
//关于博客
router.get('/aboutBlog',function(req,res,next){
    res.render('aboutBlog',{user:req.session.user});
})
//登出
router.get('/logout',function(req,res,next){
    var user=req.session.user;
    var sql2="delete from chatname where name="+mysql.escape(user.authorName);
   optMysql(sql2).then(function(){}).catch(function(err){console.log(err)});
       req.session.user=null;
       res.redirect('/');
})
//修改文章
router.get('/modify/:articleID',function(req,res,next){
    var articleID=req.params.articleID;
    var user=req.session.user;
    var sql="select*from article where articleID="+mysql.escape(articleID);
    if(!user){
        res.redirect('/login');
        return;
    }
    optMysql(sql).then(function(results){
        var article=results[0];
        var title=article.articleTitle;
        var content=article.articleContent;
        res.render("modify",{user:user,title:title,content:content});
    }).catch(function(err){console.log(err)});
})
router.post('/modify/:articleID',function(req,res,next){
    var articleID=req.params.articleID;
    var user=req.session.user;
    var title=req.body.title;
    var content=req.body.info;
    var author=req.session.user.authorName;
    var sql="update article set articleTitle="+mysql.escape(title)+",articleContent="+mysql.escape(content)+"where articleID="+mysql.escape(articleID);
    optMysql(sql).then(function(){}).catch(function(err){console.log(err)});
    res.redirect('/');
})
//删除文章
router.get('/delete/:articleID',function(req,res,next){
    var articleID=req.params.articleID;
    var user=req.session.user;
    var sql="delete from article where articleID="+mysql.escape(articleID);
    if(!user){
        res.redirect('/login');
        return;
    }
    optMysql(sql).then(function(){}).catch(function(err){console.log(err)});
    
        //删除文章对应的评论
    var sql2="delete from comment where articleID="+mysql.escape(articleID);
    optMysql(sql2).then(function(){}).catch(function(err){console.log(err)});
    
    var sql3="delete from hitlike where articleID="+mysql.escape(articleID);
    optMysql(sql3).then(function(){}).catch(function(err){console.log(err)});       
    res.redirect('/');
})
//回复文章
router.post('/respond/:articleID',function(req,res,next){
    var articleID=req.params.articleID;
    var commentContent=req.body.text;
    var user=req.session.user;
    var commentName=user.authorName;
    var commentTouxiang=user.touxiang;
    var sql="insert into comment set articleID="+mysql.escape(articleID)+",commentName="+mysql.escape(commentName)+",commentContent="+mysql.escape(commentContent)+",commentTime=NOW(),commentTouxiang="+mysql.escape(commentTouxiang);
    optMysql(sql).then(function(){}).catch(function(err){console.log(err)});
    
    var sql2="update article set commentNum=commentNum+1 where articleID="+mysql.escape(articleID);
    optMysql(sql2).then(function(){}).catch(function(err){console.log(err)}); 
    res.redirect('/articles/'+articleID);
})
//回复评论
router.get('/respondComment/:articleID',function(req,res,next){
    var articleID=req.params.articleID;
    var user=req.session.user;
    req.session.respondName=req.query.respondName;
    req.session.respondContent=req.query.respondContent;
    req.session.respondLoushu=req.query.respondLoushu;
    var sql="select *from article where articleID="+mysql.escape(articleID);
    if(!user){
        res.redirect('/login');
        return;
    }
   optMysql(sql).then(function(results){
        var article=results[0];
        var title=article.articleTitle;
        res.render('respondComment',{respondName:req.session.respondName,respondContent:req.session.respondContent,respondLoushu:req.session.respondLoushu,title:title,user:user});
    }).catch(function(err){console.log(err)});
})
router.post('/respondComment/:articleID',function(req,res,next){
    var respondName=req.query.respondName;
    var respondContent=req.query.respondContent;
    var respondLoushu=req.query.respondLoushu;
    var articleID=req.params.articleID;
    var user=req.session.user;
    var commentContent=req.body.text;
    var commentName=user.authorName;
    var commentTouxiang=user.touxiang;
    var sql="insert into comment set articleID="+mysql.escape(articleID)+",commentName="+mysql.escape(commentName)+",commentContent="+mysql.escape(commentContent)+",commentTime=NOW(),commentTouxiang="+mysql.escape(commentTouxiang)+",respondName="+mysql.escape(respondName)+",respondContent="+mysql.escape(respondContent)+",respondLoushu="+mysql.escape(respondLoushu);
    optMysql(sql).then(function(results){}).catch(function(err){console.log(err)});
    
    var sql2="update article set commentNum=commentNum+1 where articleID="+mysql.escape(articleID);
    optMysql(sql2).then(function(){}).catch(function(err){console.log(err)});
    res.redirect('/articles/'+articleID);
})
//删除评论
router.get('/deleteComment/:articleID',function(req,res,next){
    var commentID=req.query.commentID;
    var articleID=req.params.articleID;
    var sql="delete from comment where commentID="+mysql.escape(commentID);
    optMysql(sql).then(function(results){}).catch(function(err){console.log(err)});
    var sql2="update article set commentNum=commentNum-1 where articleID="+mysql.escape(articleID);
    optMysql(sql2).then(function(results){}).catch(function(err){console.log(err)});
    res.redirect('/articles/'+articleID)
})
//评论点赞
router.get('/hitlike/:articleID',function(req,res,next){
    var articleID=req.params.articleID;
    var commentName=req.query.commentName;
    var commentID=req.query.commentID;
    var user=req.session.user;
    var activity=req.query.activity;
    var articleID=req.params.articleID;
    console.log(activity)
    if(!user){
        res.redirect('/login');
        return;
    }
    if(user.authorName!=commentName){
        if(activity=='like'){
            var sql1="select*from hitlike where commentID="+mysql.escape(commentID)+"and hitlikeName="+mysql.escape(user.authorName);
            optMysql(sql1).then(function(results){
                if(results.length>0){
                    var query="update hitlike set hitlikeNum=hitlikeNum+1 where commentID="+mysql.escape(commentID)+"and hitlikeName="+mysql.escape(user.authorName);
                   optMysql(query).then(function(data){}).catch(function(err){console.log(err)}); 

                   var sql2="select*from hitlike where commentID="+mysql.escape(commentID)+"and hitlikeName="+mysql.escape(user.authorName);
                   optMysql(sql2).then(function(results){
                           var hitlike=results[0];
                           var hitlikeNum=hitlike.hitlikeNum;
                           if(hitlikeNum>1){
                               res.redirect('/articles/'+articleID)
                           }
                           else{
                            var sql3="update comment set hitlikeNum=hitlikeNum+1 where commentID="+mysql.escape(commentID);
                            optMysql(sql3).then(function(){}).catch(function(err){console.log(err)});
                            res.redirect('/articles/'+articleID);
                           }
                    }).catch(function(err){console.log(err)});
                }
                else{
                    var query2="insert into hitlike set commentID="+mysql.escape(commentID)+",hitlikeName="+mysql.escape(user.authorName)+",hitlikeNum=1,articleID="+mysql.escape(articleID);
                   optMysql(query2).then(function(){}).catch(function(err){console.log(err)});

                    var sql4="update comment set hitlikeNum=hitlikeNum+1 where commentID="+mysql.escape(commentID);
                    optMysql(sql4).then(function(){}).catch(function(err){console.log(err)});        
                    res.redirect('/articles/'+articleID);  
                }
           }).catch(function(err){console.log(err)});
     }
    else if(activity=='hate'){
        var sql1="select*from hitlike where commentID="+mysql.escape(commentID)+"and hitlikeName="+mysql.escape(user.authorName);
            optMysql(sql1).then(function(results){
                if(results.length>0){
                    var query="update hitlike set hitlikeNum=hitlikeNum+1 where commentID="+mysql.escape(commentID)+"and hitlikeName="+mysql.escape(user.authorName);
                   optMysql(query).then(function(data){}).catch(function(err){console.log(err)}); 

                   var sql2="select*from hitlike where commentID="+mysql.escape(commentID)+"and hitlikeName="+mysql.escape(user.authorName);
                   optMysql(sql2).then(function(results){
                           var hitlike=results[0];
                           var hitlikeNum=hitlike.hitlikeNum;
                           if(hitlikeNum>1){
                               res.redirect('/articles/'+articleID)
                           }
                           else{
                            var sql3="update comment set hitlikeNum=hitlikeNum+1 where commentID="+mysql.escape(commentID);
                            optMysql(sql3).then(function(){}).catch(function(err){console.log(err)});
                            res.redirect('/articles/'+articleID);
                           }
                    }).catch(function(err){console.log(err)});
                }
                else{
                    var query2="insert into hitlike set commentID="+mysql.escape(commentID)+",hitlikeName="+mysql.escape(user.authorName)+",hitlikeNum=1,articleID="+mysql.escape(articleID);
                   optMysql(query2).then(function(){}).catch(function(err){console.log(err)});

                    var sql4="update comment set hitlikeNum=hitlikeNum-1 where commentID="+mysql.escape(commentID);
                    optMysql(sql4).then(function(){}).catch(function(err){console.log(err)});        
                    res.redirect('/articles/'+articleID);  
                }
           }).catch(function(err){console.log(err)});
    }
        else{
            res.redirect('/articles/'+articleID);
        }
    }
})
//聊天室
router.get('/chat',function(req,res,next){
    var user=req.session.user;
    if(!user){
        res.redirect('/login');
        return;
    }
    var sql="select*from chatmsg";
    optMysql(sql).then(function(results){
        var messages=results;
        messages.forEach(function(ele){
            var year=ele.chatTime.getFullYear();
            var month=ele.chatTime.getMonth()+1>10?ele.chatTime.getMonth()+1:'0'+(ele.chatTime.getMonth()+1);
            var day=ele.chatTime.getDate()>=10?ele.chatTime.getDate():'0'+(ele.chatTime.getDate());
            var hour=ele.chatTime.getHours()>=10?ele.chatTime.getHours():'0'+(ele.chatTime.getHours());
            var min=ele.chatTime.getMinutes()>=10?ele.chatTime.getMinutes():'0'+(ele.chatTime.getMinutes());
            ele.chatTime=year+'-'+month+'-'+day+' '+hour+':'+min;
        })
        var sql2="select*from chatname";
        optMysql(sql2).then(function(results){
            var names=results;
            names=unique(names);
            messages=unique(messages);
            res.render('chat',{user:user,messages:messages,names:names});
        }).catch(function(err){console.log(err)});
    }).catch(function(err){console.log(err)});   
})
router.get('/chatmsg',function(req,res,next){
    var user=req.session.user;
    if(req.query.message){
       var message=req.query.message;
       var name=req.query.name;
       var time=req.query.time;
       var sql1="select*from chatmsg where message="+mysql.escape(message)+"and chatName="+mysql.escape(name);
       optMysql(sql1).then(function(results){
            if(results.length>0){
                for(var i=0;i<results.length;i++){
                    var chatTime=new Date(results[i].chatTime);
                    var time1=chatTime.getTime();
                    console.log(time)
                    console.log(time1);
                    if(time-time1<5000){
                        return;
                    }
                }
            }
            var sql5="select*from author where authorName="+mysql.escape(name);
            optMysql(sql5).then(function(results){
                var touxiang=results[0].touxiang
                var sql2='insert into chatmsg set chatName='+mysql.escape(name)+',message='+mysql.escape(message)+',chatTime=NOW(),touxiang='+mysql.escape(touxiang);
                optMysql(sql2,function(){}).catch(function(err){console.log(err)});
            }).catch(function(err){console.log(err)});
       }).catch(function(err){console.log(err)});
    }
    if(req.query.exitname){
           var sql3="delete from chatname where name="+mysql.escape(req.query.exitname);
           optMysql(sql3,function(){}).catch(function(err){console.log(err)});
       }
    if(req.query.entername){
        var name=req.query.entername;
        var sql4="select*from chatname where name="+mysql.escape(name);
        optMysql(sql4).then(function(results){
            if(results.length>0){
                return;
            }
            var sql5="select*from author where authorName="+mysql.escape(name);
            optMysql(sql5).then(function(results){
               var touxiang=results[0].touxiang
               var sql6="insert into chatname set name="+mysql.escape(name)+",touxiang="+mysql.escape(touxiang);
               optMysql(sql6,function(){}).catch(function(err){console.log(err)});
            }).catch(function(err){console.log(err)});
        }).catch(function(err){console.log(err)});
    }
    res.redirect('/chat');
})
//五子棋联机对战
router.get('/chess',function(req,res,next){
    var user=req.session.user;
    if(!user){
        res.redirect('/login');
        return;
    }
    var sql="select*from playname";
    optMysql(sql).then(function(results){
        var names=results;
        res.render("chess",{user:user,names:names});
    }).catch(function(err){console.log(err)});
})
router.get('/playname',function(req,res,next){
    var name=req.query.name;
    var sql='select*from playname where name='+mysql.escape(name);
    optMysql(sql).then(function(results){
        if(results.length>0){
            return;
        }
        var sql2="insert into playname set name="+mysql.escape(name)+",useqizi='kong'";
        optMysql(sql2,function(){}).catch(function(err){console.log(err)});
        res.redirect('/chess')
    }).catch(function(err){console.log(err)});
})
router.get('/dropname',function(req,res,next){
    var name=req.query.name;
    var sql="delete from playname where name="+mysql.escape(name);
    optMysql(sql,function(){}).catch(function(err){console.log(err)});
        res.redirect('/chess');
})
module.exports = router;
