var http = require('http');
var url = require('url');
var qs = require('querystring');
var path = require('path');
var template = require('./lib/template.js');
var mysql = require('mysql');
var crypto = require('crypto');
var cookie = require('cookie');

var db = mysql.createConnection({
  host:'localhost',
  user:'root',
  password:'164316',
  database:'pushupking'
});
db.connect();

function logon(request, response){
  var _logon = false;
  var cookies ={};
  if(request.headers.cookie){
    cookies = cookie.parse(request.headers.cookie);
    _logon = true;
  }
  return _logon
}

function logonUI(request, response){
  var ui = '<a href="/login">login</a>';
  if (logon(request, response)){
    ui = '<a href="/logout_process">logout</a>';
  }
  return ui;
}

var app = http.createServer(function(request,response){
  var _url = request.url;
  var queryData = url.parse(_url, true).query;
  var pathname = url.parse(_url, true).pathname;

  if(pathname === '/'){
    if(queryData.nick === undefined){
      db.query(`SELECT * FROM user`, function(error,user){
        var title = 'PUSH-UP kING';
        var list = template.list(user);
        var html = template.HTML(title,list,'','',logonUI(request, response));
        response.writeHead(200);
        response.end(html);
      });
    }
    else{
      db.query(`SELECT * FROM exercise AS ex JOIN user ON user.nick = ex.nick WHERE user.nick=?`,[queryData.nick],function(error,table){
        if(!table.length){
          var list = '';
        }
        else{
          var list = template.exlist(table);
        }
        var title = queryData.nick;
        var control = `
        <form action="/excreate_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
        `;
        var html = template.HTML(title,list,'',control,logonUI(request, response));
        response.writeHead(200);
        response.end(html);
      });
    }
  }
  else if(pathname === '/login'){
    var title = 'login';
    var control = `
    <form action='login_process' method='post'>
      <p><input type='text' name="ID" placeholder='ID'></p>
      <p><input type='password' name="PW" placeholder='password'></p>
      <p><input type='submit'></p>
    </form>
    `;
    var html = template.HTML('title','','',control,logonUI(request, response));
    response.writeHead(200);
    response.end(html);
  }
  else if(pathname === '/login_process'){
    var body = '';
    request.on('data',function(data){
      body = body+data;
    });
    request.on('end',function(){
      var post = qs.parse(body);
      db.query(`SELECT * FROM idpw WHERE id=?`,[post.ID],function(err,result){
        if(err) {
          response.writeHead(302, {Location: `/login_fail`});
          response.end();
        }
        else {

          var salt ='';
          salt = salt+result[0].salt;
          crypto.pbkdf2(post.PW, salt.toString('base64'), 100000, 64, 'sha512', async function(err, key){
            var skey = key.toString('hex');
            if(skey === result[0].password){
              response.writeHead(302, {'Set-Cookie':[`code=${skey}`],Location: `/`});
              response.end();
            }
            else{
              response.writeHead(302, {Location: `/login_fail`});
              response.end();
            }
          });
        }
      });
    });
  } else if(pathname === '/login_fail'){
    var html = template.HTML('FAIL','','<h3>Wrong ID or PW</h3>','',logonUI(request, response));
    response.writeHead(200);
    response.end(html);
  }
  else if(pathname === '/register'){
    var title = 'register';
    var control =`
    <form action='register_process' method='post'>
      <p><input type='text' name="ID" placeholder='ID'></p>
      <p><input type='password' name="PW" placeholder='password'></p>
      <p><input type='text' name="NICK" placeholder='nickname'></p>
      <p><input type='submit'></p>
    </form>
    `;
    var html = template.HTML('title','','',control,logonUI(request, response));
    response.writeHead(200);
    response.end(html);
  }
  else if(pathname === '/register_process'){
    var body = '';
    request.on('data',function(data){
      body=body+data;
    });
    request.on('end',function(){
      var post = qs.parse(body);

      crypto.randomBytes(64, function(err, buf) {
        var ssalt = buf.toString('hex');
        crypto.pbkdf2(post.PW, ssalt.toString('base64'), 100000, 64, 'sha512', async function(err, key){
          var skey = key.toString('hex');
          db.query(`INSERT INTO idpw (nick,ID,password,salt) VALUES(?,?,?,?)`,[post.NICK,post.ID,skey,ssalt],function(err,result){
            if(err) {
              response.writeHead(302, {Location: `/register_fail`});
              response.end();
            }
            else {
              db.query(`INSERT INTO user (nick) VALUES (?)`,[post.NICK],function(err,result){
                response.writeHead(302, {Location: `/`});
                response.end();
              });
            }
          });
        });
      });
    });
  } else if(pathname === '/register_fail'){
    var html = template.HTML('FAIL','','<h3>Duplicated ID or NICK</h3>','',logonUI(request, response));
    response.writeHead(200);
    response.end(html);
  }
  else if(pathname === '/logout_process'){
    response.writeHead(302,{
      'Set-Cookie':[
        `code = ; Max-Age=0`
      ],
      Location : `/`
    });
    response.end();
  }
  else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3456);
