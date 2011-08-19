
/**
 * Module dependencies.
 */

var express = require('express');

// Formidable multiple file uploads
// @link https://github.com/felixge/node-formidable/
var formidable = require('formidable'),
    http = require('http'),
    sys = require('sys'),
    fs = require('fs');

// UglifyJS
// @link https://github.com/mishoo/UglifyJS/
var ujs_jsp = require("uglify-js").parser;
var ujs_pro = require("uglify-js").uglify;

// Express
var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'JSCompress.com',
    js_in: '',
    js_out: '',
    err: false
  });
});

app.post('/', function(req, res) {
  console.log('Receiving POST...');

  // Variables
  var err = false,
      js_in = '',
      js_out = '',
      finished = false;

  // Finish request
  var finish = function(_js_in) {
    // Can't run more than once
    if(finished) {
      return;
    }
    //console.log('---------------------------\n', 'Finished');

    finished = true;

    // Compress JS
    if(_js_in) {
      try {
        var ast = ujs_jsp.parse(_js_in); // parse code and get the initial AST
        ast = ujs_pro.ast_mangle(ast); // get a new AST with mangled names
        //ast = ujs_pro.ast_squeeze(ast); // get an AST with compression optimizations
        js_out = ujs_pro.gen_code(ast); // compressed code here
      } catch(e) {
        err = e.message;
      }
    } else {
      err = "No javascript input was found";
    }

    // Template
    res.render('index', {
      js_in: js_in,
      js_out: js_out,
      err: err
    });
  };

  // JS input only
  try {
    if("undefined" != typeof(req.body.js_in)) {
      finish(req.body.js_in);
    }
  } catch (e) {}

  // Multiple file upload
  var form = new formidable.IncomingForm(),
      files = [],
      fields = [];
  form.parse(req, function(err, fields, files) {
    if(err) {
      return finish();
    }

    // Direct JS string
    if(fields.js_in) {
      js_in += fields.js_in;
    }

    // If we have uploaded files
    var i = 0;
    var len = Object.keys(files).length;
    if(files && len > 0) {
      console.log('= GOT FILES (' + len + ')');
      for(key in files) {
        var file = files[key];
        // Synchronous file reads to ensure they stay in the order they were uploaded
        js_in += "// --- file[" + file.name + "] ---\n\n" + fs.readFileSync(file.path) + "\n\n";
      }
      finish(js_in);
    } else {
      // No files, only fields
      finish(js_in);
    }
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});
