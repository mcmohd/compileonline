// Check usage, if not correct then simply e out.
var http = require('http')
  , express = require('express');

//const HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const HOME = "/home/col/root";
const NEW_PROJECT_TITLE = "New Project";
const DATA_TRANSFER_QUOTA = 1024 * 1024 * 500;
const COL_INI_FILE = "/home/col/src/col.ini";
const COL_CONF_FILE = "/home/col/root/.col_conf";
const MAX_TIME_OUT = 0;
const STATUS_SUCCESS = 0;
const STATUS_SUCCESS_MSG = "Operation successful";
const INVALID_LANGUAGE = 101;
const INVALID_LANGUAGE_MSG = "Invalid Language ID";
const MISSING_SOURCE_FILE = 102;
const MISSING_SOURCE_FILE_MSG = "Source files are missing";
const FILE_WRITE_ERROR = 103;
const COMPILE_TIME_ERROR = 104;
const EXECUTE_TIME_ERROR = 105;

// Common redirect URL
const HOSTSITE = 'http://www.amrood.com';

var port = process.argv[2];
var languageid = process.argv[3];
var colsessid = process.argv[4];
var language = null;
var client_ip_address = null;

var passiveTime = Date.now();
var disconnect = false;
var fs = require('fs');
var path = require('path');
var str = require('string');
var exec = require("child_process").exec,
    child;

// Check disconnect after every minute.
setInterval( handleDisconnect, 1 * 1000 * 60 );

console.log( "Going to launch COL Server" );
console.log ("Going to cleanup user's workspace");
cleanDir( HOME );
process.title = '--COL--';

/**
 * Dump
 */
var stream;
if (process.argv[4] === '--dump') {
  stream = require('fs').createWriteStream(__dirname + '/dump.log');
}


function cleanDir(dir){
   var list = fs.readdirSync(dir);
   list.map(function(file) {
       var filepath = dir + "/" + file;
       var stat = fs.statSync(filepath);
       if ( file == "." || file == ".." ){
       }else if ( stat.isDirectory()){
           cleanDir( filepath );
       }else{
          fs.unlinkSync( filepath );
       }
   });
   if( dir !== HOME ){
       fs.rmdirSync(dir);
   }
}

function handleDisconnect(){
     var currentTime = Date.now();
     if( (currentTime - passiveTime ) / 1000 > 60 * 15 ) { // wait for 15 minutes
          console.log ("Going to exit because client is passive since long time");
         process.exit(0);
     }
}

function getLanguage( langid ){
    if( !langid ){
        console.log ("Invalid language id, returning without getting language detail");
        return null;
    }
    // Get language detail
    console.log ("Going to get language detail");
    var data = fs.readFileSync(COL_INI_FILE, 'utf8' );
    var languages = JSON.parse(data).languages;
    var language = null;
    languages.some( function( lang ) {
       if( langid === lang.id ){
           console.log ("Got language  detail for language id " + lang.id);
           language = lang;
           console.log (language);
           return true;
       }
       return false;
    });
    return language;
}

/**
 * App & Server
 */
var app = express()
  , server = http.createServer(app);
app.use(function(req, res, next) {
  var setHeader = res.setHeader;
  res.setHeader = function(name) {
    switch (name) {
      case 'Cache-Control':
      case 'Last-Modified':
      case 'ETag':
        return;
    }
    return setHeader.apply(res, arguments);
  };
  console.log( req );
/*
  var p = (req.headers.host).split(':')
  console.log( p );
  if( !p[1] ){
     console.log ("Got an invalid request");
     res.redirect("http://www.compileonline.com/session_error.php");
     return;
  }
  var sid;
  if( req.query && req.query.SESSIONID ){
     sid = req.query.SESSIONID + p[1];
  }else{
     sid = getCookieByName('SESSIONID', req) + p[1];
  }
  console.log( "sid " + sid );
  if( sid !== colsessid ){
    console.log ("Got an invalid request");
    res.redirect("http://www.compileonline.com/session_error.php");
    return;
  }
*/
  passiveTime = Date.now();
  next();
});

console.log ( "__dirname is : " + __dirname );
app.use(express.static(__dirname));
app.use(express.bodyParser());
app.use(express.cookieParser());

server.listen( port, function(){
   console.log('Express server is listening at  %s', port);
});


function setHome(){
   console.log('Old directory: ' + process.cwd());
   try{
       process.chdir( HOME );
       console.log('New directory: ' + process.cwd());
   }catch (error) {
       console.log('chdir: ' + error);
   }
};
app.post('/compile', function(req, res){
   response = {
       code  : STATUS_SUCCESS,
       message : STATUS_SUCCESS_MSG
   };
   setHome();
   
   var langid = req.body.langid;
   console.log( "Got language ID " + langid );
   var language = getLanguage( langid );
   if( !language ){
      response = {
          code  :INVALID_LANGUAGE,
          message : INVALID_LANGUAGE_MSG
      };
      console.log( response );
      res.end(JSON.stringify(response));
      return;
   }
   // override compile and execute options
   if( req.body.compile ){
      language.compile = req.body.compile;
   }
   if( req.body.execute ){
      language.execute = req.body.execute;
   }
   console.log( language );

   // Now let's  create all the given files.
   if( !req.body.srcfiles ){
      response = {
          code  : MISSING_SOURCE_FILE,
          message : MISSING_SOURCE_FILE_MSG
      };
      console.log( response );
      res.end(JSON.stringify(response));
      return;
   }else{
      var srcfiles = req.body.srcfiles;
      for( var file in srcfiles ){
          console.log( "Going to create source file " + file );
          fs.writeFile( HOME + "/" + file, srcfiles[file], function (error) {
             if( error ){
                response = {
                    code  : FILE_WRITE_ERROR,
                    message : {error:error, file:file}
                };
                console.log( response );
                res.end(JSON.stringify(response));
                return;
             }
          });
      }
   }
   if( req.body.supportfiles ){
      var supportfiles = req.body.supportfiles;
      for( var file in supportfiles ){
          console.log( "Going to create support file " + file );
          fs.writeFile( HOME + "/" + file, supportfiles[file], function (error) {
             if( error ){
                response = {
                    code  : FILE_WRITE_ERROR,
                    message : {error:error, file:file}
                };
                console.log( response );
                res.end(JSON.stringify(response));
                return;
             }
          });
      }
   }
   if( req.body.datafiles ){
      var datafiles = req.body.datafiles;
      for( var file in datafiles ){
          console.log( "Going to create data file " + file );
          fs.writeFile( HOME + "/" + file, datafiles[file], function (error) {
             if( error ){
                response = {
                    code  : FILE_WRITE_ERROR,
                    message : {error:error, file:file}
                };
                console.log( response );
                res.end(JSON.stringify(response));
                return;
             }
          });
      }
   }
   // Time to compile the programs.
   var cmd = language.compile;
   console.log( "Going to issue command : " + cmd );
   child = exec( cmd, {timeout: MAX_TIME_OUT, cwd:HOME}, function(error, stdout, stderr) {
        var c_out = stdout;
        var c_err = stderr;
        var e_out = "";
        var e_err = "";
        if (error) {
            response = {
                code  : COMPILE_TIME_ERROR,
                message : {c_out:c_out, c_err:c_err}
            };
            console.log( response );
            res.end(JSON.stringify(response));
            return;
        }
        if( fs.existsSync( HOME + "/" + language.execute )){
          if( req.body.commandline ){
             cmd = HOME + "/" + language.execute + " " + req.body.commandline;
          }else{
             cmd = HOME + "/" + language.execute;
          }
          console.log( "Going to issue command : " + cmd );
          child = exec( cmd, {cwd:HOME}, function(error, stdout, stderr){
              if( error.signal ){
                 response = {
                    code  : EXECUTE_TIME_ERROR,
                    message : {c_out:c_out, c_err:c_err, e_out : stdout, e_err : stderr, error: error}
                 };
                 console.log( response );
                 res.end(JSON.stringify(response));
                 return;
              }
          });
          var stdout = '';
          var stderr = '';
          var inputs = '';
          if( req.body.inputs ){
              inputs = req.body.inputs.split(";");
              inputs.forEach( function( input ){
                  console.log('stdin "%s"', input);
                  child.stdin.write( input + "\n" );
              });
          }
          child.stdout.on('data', function(buf) {
             console.log('stdout "%s"', String(buf));
             stdout += buf;
          });
          child.stderr.on('data', function(buf) {
             console.log('stderr "%s"', String(buf));
             stderr += buf;
          });
          child.on('close', function(code) {
              response = {
                 code  : STATUS_SUCCESS,
                 message : {c_out:c_out, c_err:c_err, e_out : stdout, e_err : stderr}
              };
              console.log( response );
              res.end(JSON.stringify(response));
              return;
          });
          // Time to give STDIN and take STDOUT
          console.log( "Child PID " + child.pid );
       }
   });
});
