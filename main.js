var http = require('http');
var url = require('url');
var qs = require('querystring');
var path = require('path');
var template = require('./lib/template.js');
var mysql = require('mysql');
var crypto = require('crypto');
var cookie = require('cookie');
var sanitize = require('sanitize-html');

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
      var cookies={};
      if(request.headers.cookie){
        cookies = cookie.parse(request.headers.cookie);
      }
      var title = queryData.nick;
      var control='';
      db.query(`SELECT * FROM exercise WHERE nick=?`,[queryData.nick],function(error,table){
        if(!table.length){
          var list = '';
        }
        else{
          var list = template.exlist(table);
        }
        db.query(`SELECT * FROM idpw WHERE nick=?`,[queryData.nick],function(error2,table2){
          if(table2[0].password === cookies.code){
            control = `
            <form action="/excreate_process" method="post">
              <input type="hidden" name='nick' value=${queryData.nick}>
              <p><input type="text" name="title" placeholder="title"></p>
              <p>
                <textarea name="description" placeholder="description"></textarea>
              </p>
              <p>
                <input type="submit">
              </p>
            </form>
            `;
          }
          else{
            control='';
          }
          var html = template.HTML(title,list,'',control,logonUI(request, response));
          response.writeHead(200);
          response.end(html);
        });
      });
    }
  }
  else if(pathname === '/excreate_process'){
    var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
        var post = qs.parse(body);
        var title = sanitize(post.title);
        var description = sanitize(post.description);
        var nick = sanitize(post.nick);
        if (title.trim() === '') title = 'undefined';
        db.query(`INSERT INTO exercise (title, description,time,nick) VALUES(?,?,NOW(),?)`,[title,description,nick], function(error,result){
          if(error){
            throw error;
          }
          response.writeHead(302, {Location: `/?nick=${qs.escape(nick)}`});
          response.end();
        })
    });
  }
  else if(pathname === '/article'){
    var title = 'article';
    var cookies={};
    if(request.headers.cookie){
      cookies = cookie.parse(request.headers.cookie);
    }
    db.query(`SELECT * FROM idpw WHERE nick=?`,[queryData.nick],function(err1,table){
      if(table[0].password === cookies.code){
        db.query(`SELECT * FROM exercise WHERE id = ?`,[queryData.id],function(err2,table2){
          var control = `
          <form action="/delete_process" method="post">
            <input type="hidden" name="id" value="${queryData.id}">
            <input type="hidden" name='nick' value=${queryData.nick}>
            <input type="submit" value="delete">
          </form>
          <form action='/update_process' method='post'>
            <input type="hidden" name='id' value=${queryData.id}>
            <input type="hidden" name='nick' value=${queryData.nick}>
            <p><input type="text" name="title" value='${table2[0].title}'></p>
            <p>
              <textarea name="description">${table2[0].description}</textarea>
            </p>
            <p>
              <input type="submit">
            </p>
          </form>
          `;
          var html = template.HTML(title,'','',control,logonUI(request, response));
          response.writeHead(200);
          response.end(html);
        });
      }
      else{
        var html = template.HTML(title,'','','<h3>It is not your article</h3>',logonUI(request, response));
        response.writeHead(200);
        response.end(html);
      }
    });
  }
  else if(pathname === '/delete_process'){
    var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
        var post = qs.parse(body);
        var id = sanitize(post.id);
        var nick = sanitize(post.nick);
        db.query(`DELETE FROM exercise WHERE id=?`,[id],function(error,result){
          if(error){
            throw error;
          }
          response.writeHead(302, {Location: `/?nick=${qs.escape(nick)}`});
          response.end();
        })
    });
  }
  else if(pathname === '/update_process'){
    var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
        var post = qs.parse(body);
        var title = sanitize(post.title);
        var description = sanitize(post.description);
        var nick = sanitize(post.nick);
        var id = sanitize(post.id);
        if (title.trim() === '') title = 'undefined';
        db.query(`UPDATE exercise SET title=?, description =? WHERE id = ?`,[title,description,id], function(error,result){
          if(error){
            throw error;
          }
          response.writeHead(302, {Location: `/?nick=${qs.escape(nick)}`});
          response.end();
        })
    });
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
      var id = sanitize(post.ID);
      var pw = sanitize(post.PW);
      db.query(`SELECT * FROM idpw WHERE id=?`,[id],function(err,result){
        if(err) {
          response.writeHead(302, {Location: `/login_fail`});
          response.end();
        }
        else {

          var salt ='';
          salt = salt+result[0].salt;
          crypto.pbkdf2(pw, salt.toString('base64'), 100000, 64, 'sha512', async function(err, key){
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
      var pw = sanitize(post.PW);
      var id = sanitize(post.ID);
      var nick = sanitize(post.NICK);
      crypto.randomBytes(64, function(err, buf) {
        var ssalt = buf.toString('hex');
        crypto.pbkdf2(pw, ssalt.toString('base64'), 100000, 64, 'sha512', async function(err, key){
          var skey = key.toString('hex');
          db.query(`INSERT INTO idpw (nick,ID,password,salt) VALUES(?,?,?,?)`,[nick,id,skey,ssalt],function(err,result){
            if(err) {
              response.writeHead(302, {Location: `/register_fail`});
              response.end();
            }
            else {
              db.query(`INSERT INTO user (nick) VALUES (?)`,[nick],function(err,result){
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
app.listen(80);
