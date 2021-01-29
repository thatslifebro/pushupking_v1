module.exports = {
  HTML:function(title, list, body,control,loginStatus='<a href="/login">login</a>'){
    return `
    <!doctype html>
    <html>
    <head>
      <title>WEB1 - ${title}</title>
      <meta charset="utf-8">
    </head>
    <body>
      ${loginStatus}
      <a href='/register'>register</a>
      <h1><a href="/">PUSH-UP KING</a></h1>
      ${list}
      ${body}
      ${control}
    </body>
    </html>
    `;
  },list:function(table){
    var list = '<ul>';
    var i = 0;
    while(i < table.length){
      list = list + `<li><a href="/?nick=${table[i].nick}">${table[i].nick}</a></li>`;
      i = i + 1;
    }
    list = list+'</ul>';
    return list;
  }, exlist:function(table){
    var i = 0;
    var list='';
    while(i < table.length){
      list = list + `<ul><li>${table[i].title}</li></ul><pre>     ${table[i].description}</pre>`;
      i = i + 1;
    }
    return list;
  }
}
