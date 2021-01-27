const http = require('http');
const url = require('url');
const qs = require('querystring');


var app = http.createServer(function(request,response){
  var _url = request.url;
  var queryData = url.parse(_url, true).query;
  var pathname = url.parse(_url, true).pathname;
  console.log();
  if(pathname === '/'){
    
  }
});

app.listen(3000);
