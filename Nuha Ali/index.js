// Check usage, if not correct then simply come out.
if( process.argv.length < 3 ){
    console.log( "Usage: node index.js port language sessionid");
    return;
}

var http = require('http')
  , express = require('express')
  , io = require('socket.io')
  , pty = require('pty.js')
  , terminal = require('term.js');
//const HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const HOME = "/home/col/root";
const NEW_PROJECT_TITLE = "New Project";
const DATA_TRANSFER_QUOTA = 1024 * 1024 * 500;
const COL_INI_FILE = "/home/col/src/col.ini";
const COL_CONF_FILE = "/home/col/root/.col_conf";

// Dropbox Keys and secrets
const DROPBOX_APP_KEY = '2bw2layqykrv8zh';
const DROPBOX_APP_SECRET = 'fjyu20nv5a1vnae';
const DROPBOX_ACCESS_TOKEN = '3wyGJhGMw1YAAAAAAAACWzWIAfvTxGaVaO6tkv2k55lREk9ppegVEeQ5uBbF4n3c';

// OneDrive Keys and Secrets
const ONEDRIVE_CLIENT_ID = '000000004C12B45D';
const ONEDRIVE_CLIENT_SECRET = 'UGn2KcY8siRXVjjXjnegOdiZgpk6tQM8';
const ONEDRIVE_SCOPES = 'wl.signin wl.skydrive wl.skydrive_update';

// GoogleDrive Keys and Secrets
const GOOGLE_CLIENT_ID = '73416366431-l3b0hkha9k5htqq7oaepnmdhu5c2ss7i.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'j7AtlPlMezrUXvYvD_OulhKT';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive';

// Githut Keys and Secrets
const GITHUB_CLIENT_ID = '7bed887a45c66927bade';
const GITHUB_CLIENT_SECRET = 'a216a65075a549d5abe442351d2d24d809acbe19';
const GITHUB_SCOPES = 'repo,public_repo,repo_deployment,delete_repouser';

// Common redirect URL
const REDIRECT_URL = 'https://www.amrood.com/dropbox.php';
const WEBSITE = 'http://www.amrood.com';

//  Google account for project sharing
const GOOGLE_WEBCLIENT_ID = '442886527895-5n3mtqpllmttudcjvuh1isovj8bub5on.apps.googleusercontent.com';
const GOOGLE_WEBCLIENT_SECRET = 'TTULwRR54phV-I1D9U_tfr4u';
var GoogleTokenProvider = require("refresh-token").GoogleTokenProvider;
// Created from https://developers.google.com/oauthplayground/
const GOOGLE_REFRESH_TOKEN = '1/FL2VfN6K_vMNbFQulZZ6JAgpRKkDdgV0MtzPy0TtAm8';

const COMPILEONLINE = "compileonline";
var port = process.argv[2];
var languageid = process.argv[3];
var colsessid = process.argv[4];
var uploadsize = 0;
var projecttitle = NEW_PROJECT_TITLE;
var workspace = "compileonline";
var language = null;
var mainfile = null;
var login = null;
var password = null;
var salt = null;
var emailid = null;
var remember = null;
var client_ip_address = null;

var passiveTime = Date.now();
var disconnect = false;
// Check disconnect after every minute.
setInterval( handleDisconnect, 1 * 1000 * 60 );

console.log( "Going to launch COL IDE for " + languageid );
/**
 * term.js
 */
process.title = '--COMPILEONLINE--';

/**
 * Dump
 */
var stream;
if (process.argv[4] === '--dump') {
  stream = require('fs').createWriteStream(__dirname + '/dump.log');
}

/**
 * Open Terminal
 */

var buff = []
  , socket
  , term;

term = pty.fork(process.env.SHELL || 'sh', [], {
  name: require('fs').existsSync('/usr/share/terminfo/x/xterm-256color')
    ? 'xterm-256color'
    : 'xterm',
  cols: 80,
  rows: 24,
  cwd: HOME
});

term.on('data', function(data) {
  if (stream) stream.write('OUT: ' + data + '\n-\n');
  return !socket
    ? buff.push(data)
    : socket.emit('data', data);
});

console.log('' + 'Created shell with pty master/slave' + ' pair (master: %d, pid: %d)', term.fd, term.pid);

function handleDisconnect(){
     var currentTime = Date.now();
     if( disconnect ){
         if( (currentTime - passiveTime ) / 1000 > 60 * 15 ) { // wait for 15 minutes
             console.log ("Going to exit because client already disconnected for lomg time");
             process.exit(0);
         }
     }
}
var fs = require('fs');
var path = require('path');
function setLanguage( langid, copyFile ){
    if( !langid ){
        console.log ("Returning without setting any language");
        return;
    }
    // Get language detail
    console.log ("Going to get language detail");
    var data = fs.readFileSync(COL_INI_FILE, 'utf8' );
    var languages = JSON.parse(data).languages;
    languages.every( function( lang ) {
       if( langid === lang.id ){
           console.log ("Got language " + lang.id);
           language = lang;
           console.log (language);
           // Copy required code file in user's workspace
           var filename = path.basename( language.file );
           mainfile = filename;
           if( copyFile ){ 
               console.log ("Going to copy language source code from " + language.file);
               if( fs.existsSync( language.file  ) ){
                 fs.createReadStream( language.file ).pipe(fs.createWriteStream( HOME + "/" + filename));
               }
               // Create Configuration file to keep language detail.
               fs.writeFileSync( COL_CONF_FILE, JSON.stringify(language) );
           }
           return false;
       }
       return true;
    });
}

// Cleanup userspace
console.log ("Going to cleanup user's workspace");
cleanDir( HOME );
setLanguage( languageid, true );
console.log( language );
// Check if its shared project.
if( process.argv[5] ){
   // Import project from google drive.
   getSharedProject( process.argv[5] );
}

var STRING = require('string');
function checkValidity(type){
        var filetype = "binary";
        if( STRING(type).contains( 'rtf' ) ){
            type = 'T';
            filetype = "google";
        }else if( STRING(type).contains( 'tiff' ) ){
            type = 'T';
            filetype = "google";
        }else if( STRING(type).contains( 'text' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'inode' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'open' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'json' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'script' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'xml' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'x-tex' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'plain' ) ){
            type = 'T';
            filetype = "text";
        }else if ( STRING(type).contains( 'binary' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'zip' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'excel' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'chemical' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'word' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'world' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'koan' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'powerpoint' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'octet-stream' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'project' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'fractals' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'class' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'tar' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'book' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'binhex' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'model' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'pdf' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'hlp' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'help' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'compressed' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'visio' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'movie' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'flash' ) ){
            type = 'T';
            filetype = "image";
        }else if ( STRING(type).contains( 'music' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'media' ) ){
            type = 'F';
        }else if ( STRING(type).contains( 'image' ) ){
            type = 'T';
            filetype = "image";
        }else if ( STRING(type).contains( 'audio' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'video' ) ){
            type = 'T';
            filetype = "google";
        }else if ( STRING(type).contains( 'vnd.' ) ){
            type = 'F';
        }else{
            type = 'F';
        }
        response = { loadable: type, filetype:filetype };
        return JSON.stringify( response );;
}

var icon = "icon-text";
function getIconType(type){
        icon = "icon-text";
        if( STRING(type).contains( 'rtf' ) ){
           icon = "icon-text";
        }else if( STRING(type).contains( 'tiff' ) ){
           icon = "icon-text";
        }else if( STRING(type).contains( 'text' ) ){
           icon = "icon-text";
        }else if ( STRING(type).contains( 'inode' ) ){
           icon = "icon-text";
        }else if ( STRING(type).contains( 'json' ) ){
           icon = "icon-javascript";
        }else if ( STRING(type).contains( 'script' ) ){
           icon = "icon-javascript";
        }else if ( STRING(type).contains( 'x-tex' ) ){
           icon = "icon-text";
        }else if ( STRING(type).contains( 'plain' ) ){
           icon = "icon-text";
        }else if ( STRING(type).contains( 'binary' ) ){
           icon = "icon-binary";
        }else if ( STRING(type).contains( 'zip' ) ){
           icon = "icon-zip";
        }else if ( STRING(type).contains( 'excel' ) ){
           icon = "icon-excel";
        }else if ( STRING(type).contains( 'word' ) ){
           icon = "icon-word";
        }else if ( STRING(type).contains( 'presentation' ) ){
           icon = "icon-powerpoint";
        }else if ( STRING(type).contains( 'tar' ) ){
           icon = "icon-zip";
        }else if ( STRING(type).contains( 'pdf' ) ){
           icon = "icon-pdf";
        }else if ( STRING(type).contains( 'compressed' ) ){
           icon = "icon-zip";
        }else if ( STRING(type).contains( 'xml' ) ){
           icon = "icon-xml";
        }else if ( STRING(type).contains( 'visio' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'movie' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'flash' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'music' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'media' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'image' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'audio' ) ){
           icon = "icon-image";
        }else if ( STRING(type).contains( 'video' ) ){
           icon = "icon-image";
        }
        return icon;
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
  next();
});

//var exec = require("child_process").exec;
//app.post('/load_tree.php', function(req, res){exec("php load_tree.php", function (error, stdout, stderr) {res.send(stdout);});});
app.use(express.bodyParser());

/* Handle all the requests for user home directory */
app.get( /^\/home\/col\/root\/(.*)$/, function( req, res){
    console.log( "----" + req.params[0]  + "---" );
    res.sendfile( HOME + "/" + req.params[0] );
});

app.get('/load_tree', function(req, res){
   var cwd = HOME;
   if( typeof req.query.id !== 'undefined' && req.query.id){
       cwd = req.query.id;
   }
   console.log(cwd);
   console.log(req.query.id);
   
   var tree = buildTree(cwd );
   if( cwd === HOME ){
         res.write( "[" + JSON.stringify(tree) + "]");
   }else{
         res.write( "[]");
   }
   res.end();
});
app.get('/load_tree_wb', function(req, res){
   var cwd = HOME;
   if( typeof req.query.id !== 'undefined' && req.query.id){
       cwd = req.query.id;
   }
   console.log(cwd);
   console.log(req.query.id);

   var tree = buildTreeWB(cwd );
   console.log( tree );
   if( cwd === HOME ){
         res.write( "[" + JSON.stringify(tree) + "]");
   }else{
         res.write( "[]");
   }
   res.end();
});
app.get('/get_project_title', function(req, res){
    response = {
       status:0,
       message:'Giving project title',
       projecttitle:projecttitle
     };
     console.log(response);
     res.end(JSON.stringify(response));
});

app.get('/shut_down', function(req, res){
    response = {
       status:0,
       message:'Your system has been gracefully shut down.'
     };
     console.log(response);
     res.end(JSON.stringify(response));
     process.exit(0)
});

var mime = require('mime');
var glob = require('glob');
function buildTree(dir){
        var filename = path.basename( dir ) ;
        var stats = fs.lstatSync(dir),
        info = {
             id: dir,
             text: filename
        };
        if (stats.isDirectory()) {
           if( HOME === dir ){
              info.state = "open";
           }else{
              info.state = "closed";
           }
           info.type = "D";
/*
           info.children = fs.readdirSync(dir).map(function(child) {
               return buildTree(dir + '/' + child);
           });
*/
           info.children = glob.sync("*", {'cwd':dir}).map(function(child) {
               return buildTree(dir + '/' + child);
           });
       } else {
           info.type = "F";
           info.state = "open";
           var type = mime.lookup(dir);
           info.iconCls = getIconType( type );
      }
     return info;
}

var isBinaryFile = require("isbinaryfile");
function buildTreeWB(dir){
        var filename = path.basename( dir ) ;
        var stats = fs.lstatSync(dir),
        info = {
             id: dir,
             text: filename
        };
        if (stats.isDirectory()) {
           if( HOME === dir ){
              info.state = "open";
           }else{
              info.state = "closed";
           }
           info.type = "D";
           info.children = glob.sync("*", {'cwd':dir}).map(function(child) {
               result = isBinaryFile( dir + '/' + child  );
               if( result ){
                  console.log( dir + '/' + child + " is binary");
                  return null;
               }else{
                  console.log( dir + '/' + child + " is not binary");
                  return buildTreeWB(dir + '/' + child);
               }
           });
       } else {
           info.type = "F";
           info.state = "open";
           var type = mime.lookup(dir);
           info.iconCls = getIconType( type );
      }
     return info;
}
function getFileMode( filename ){
   console.log( "Got file name " + filename );
   var parts = path.extname(filename||'').split('.');
   var ext = parts[parts.length - 1];
   var mode;
   console.log( "Got file extension " + ext );
    if( ext === "cs" ){
       mode = "csharp";
    }else if( ext === "c" || ext === "cpp" || ext === "c++"){
       mode = "c_cpp";
    }else if( ext === "java"){
       mode = "java";
    }else if( ext === "javascript" || ext === "js"){
       mode = "javascript";
    }else if( ext === "ada"){
       mode = "ada";
    }else if( ext === "css"){
       mode = "css";
    }else if( ext === "html" || ext === "htm"){
       mode = "html";
    }else if( ext === "d"){
       mode = "d";
    }else if( ext === "json"){
       mode = "json";
    }else if( ext === "php"){
       mode = "php";
    }else if( ext === "lisp"){
       mode = "lisp";
    }else if( ext === "lua"){
       mode = "lua";
    }else if( ext === "py"){
       mode = "python";
    }else if( ext === "rb"){
       mode = "ruby";
    }else if( ext === "scala"){
       mode = "scala";
    }else if( ext === "sh"){
       mode = "sh";
    }else if( ext === "sql"){
       mode = "sql";
    }else if( ext === "tcl"){
       mode = "tcl";
    }else if( ext === "xml"){
       mode = "xml";
    }else{
       mode = "text";
    }
    return mode;
}

app.get('/load_file', function(req, res){
   var content;
   var filename;
   if( typeof req.query.id !== 'undefined' && req.query.id){
       filename = req.query.id;
   }else{
       res.write( '' );
       res.end();
       return;
   }
   fs.readFile( filename, function (err, data) {
        if( err ){
             data = {
                 status  : 1,
                 message : err
             };
        }
        res.write( STRING(data).escapeHTML().s );
        res.end();
   });
});

app.post('/upload_file', function(req, res){
   console.log(req.files.file.name);
   console.log(req.files.file.path);
   console.log(req.files.file.type);

   var file = req.body.cwd + "/" + req.files.file.name;
   fs.readFile( req.files.file.path, function (err, data) {
        fs.writeFile(file, data, function (err) {
         if( err ){
                response = {
                    status:1,
                    message:err
                };
         }else{
               fs.unlink( req.files.file.path );
               response = {
                   status:0,
                   message:'File uploaded successfully',
                   filename:req.files.file.name
              };
          }
          console.log( response );
          res.end( JSON.stringify( response ) );
        });
   });
});

function getFileList(dir) {
    var files = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
            files = files.concat(getFileList(file));
        } else {
            files.push(file);
        }
    })
    return files
}
var mmm = require('mmmagic'),
    Magic = mmm.Magic;
var magic = new Magic(mmm.MAGIC_MIME_TYPE);
app.post('/get_mime_type', function(req, res){
   console.log(req.body.cwd);
   console.log(req.body.file);

   var filepath = req.body.cwd + "/" + req.body.file;
   var mode = getFileMode( filepath );
   magic.detectFile(filepath, function(err, type) {
         if( err ){
                response = {
                    status  : 1,
                    loadable: 'F',
                    message : err
                };
         }else{
               var flag = JSON.parse(checkValidity( type ));
               var icon = getIconType( type );
               response = {
                   status  : 0,
                   loadable: flag.loadable,
                   filetype: flag.filetype,
                   mime:type,
                   icon:icon,
                   mode:mode,
                   message : 'File uploaded successfully',
              };
          }
          console.log( response );
          res.end( JSON.stringify(response) );
   });
});

app.get('/download_file', function(req, res){
   console.log(req.query.cwd);
   console.log(req.query.file);
   var filepath = req.query.cwd + "/" + req.query.file;
   console.log( "File to be downloaded " + filepath );

   fs.stat( filepath, function( err, stats ){
         if (err){
            response = 'Error in downloading file ' + filepath;
            console.log( response );
            return res.end( response );
          }
          if( uploadsize + stats.size > DATA_TRANSFER_QUOTA ){
              response = 'Sorry, you do not have sufficient quota for data transfer';
              console.log( response );
              return res.end( response );
          }
          res.download(filepath, function(err){
             if( err ){
                  console.log( err );
                  return res.end( err );
              }
              console.log( "Last time consumed data upload size  was " + uploadsize );
              uploadsize += stats.size;
               console.log( "Now consumed data upload size is " + uploadsize );
               response = {
                    status  : 0,
                    message : "Successfully sent file " + filepath
                };
               console.log( response );
               return res.end( "This is test..." );
          });
    });
});

var targz = require('tar.gz');
app.get('/download_project', function(req, res){
   var projectpath =  HOME;
   var exportfile =  "/tmp/" +  projecttitle + ".tar.gz";

   console.log("Going to download project as zip file");
   console.log( "Export path " + projectpath );
   console.log( "Export file " + exportfile );

   var compress = new targz().compress(projectpath, exportfile, function(err) {
      if( err ){
          console.log( err );
          return res.end( err );
      }
      fs.stat( exportfile, function( err, stats ){
         if (err){
            response = 'Error in downloading file ' + exportfile;
            console.log( response );
            // unlink exported file
            fs.unlink( exportfile );
            return res.end( response );
          }
          if( uploadsize + stats.size > DATA_TRANSFER_QUOTA ){
              response = 'Sorry, you do not have sufficient quota for data transfer';
              console.log( response );
              // unlink exported file
              fs.unlink( exportfile );
              return res.end( response );
          }
          var zippedfile = path.basename(exportfile);
          res.download(exportfile, zippedfile, function(err){
             if( err ){
                  console.log( err );
                  fs.unlink( exportfile );
                  return res.end( response );
              }
               console.log( "Last time consumed data upload size  was " + uploadsize );
               uploadsize += stats.size;
               console.log( "Now consumed data upload size is " + uploadsize );
               response = {
                  status  : 0,
                  message : "Successfully exported file " + exportfile
               };
               console.log( response );
               // unlink exported file
               fs.unlink( exportfile );
          });
      });
   });
});

app.post('/add_file', function(req, res){
   console.log(req.body);
   console.log(req.body.cwd);
   console.log(req.body.file);
   var response = {} ;
   // Create a file in the given directory.
   var filename = req.body.cwd + "/" + req.body.file;
   fs.open( filename,  "w+", function(err, fd) {
      if( err ){
         response = {
             status  : 1,
             message : err
         };
      }else{
         response = {
             status  : 0,
             message : 'File created successfully'
         };
         fs.close(fd);
      }
      console.log( response );
      res.end(JSON.stringify(response));
   });
});

app.post('/delete_file', function(req, res){
   var response = {} ;
   // delete given file in the given directory.
   var filename = req.body.cwd + "/" + req.body.file;
   
   fs.unlink( filename,  function(err) {
      if( err ){
         response = {
             status  : 1,
             message : err
         };
      }else{
         response = {
             status  : 0,
             message : 'File deleted successfully'
         };
      }
      console.log( response );
      res.end(JSON.stringify(response));
   });
});

var rmdir = require('rimraf');
app.post('/delete_dir', function(req, res){
   var response = {} ;
   // delete the given directory
   var dirname = req.body.cwd ;
   if( dirname === HOME ){
       response = {
             status  : 1,
             message : 'Home directory can not be deleted'
       };
      console.log( response );
      return res.end(JSON.stringify(response));
   }
   rmdir( dirname,  function(err) {
      if( err ){
         response = {
             status  : 1,
             message : err
         };
      }else{
         response = {
             status  : 0,
             message : 'Directory deleted successfully'
         };
      }
      console.log( response );
      res.end(JSON.stringify(response));
   });
});

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

app.post('/add_dir', function(req, res){
   console.log(req.body);
   console.log(req.body.cwd);
   console.log(req.body.dir);
   var response = {} ;
   // Create a file in the given directory.
   var dirname = req.body.cwd + "/" + req.body.dir;
   fs.mkdir( dirname,  function(err) {
      if( err ){
         response = {
             status  : 1,
             message : err
         };
      }else{
         response = {
             status  : 0,
             message : 'Directory created successfully'
         };
      }
      console.log( response );
      res.end(JSON.stringify(response));
   });
});

app.post('/save_file', function(req, res){
   // Create a file in the given directory.
   var filename = req.body.file;
   var content = req.body.content;
   fs.writeFile(filename, content, {flag:'w+'}, function (err) {
      if( err ){
         response = {
             status:1,
             message:err
         };
      }else{
         response = {
             status:0,
             message:'File saved successfully',
             filename: filename
         };
      }
      console.log( response );
      res.end(JSON.stringify(response));
   });
});

app.post('/rename_file', function(req, res){
   var response = {} ;

   var cwd = req.body.cwd ;
   var oldnode = req.body.oldnode ;
   var newnode = req.body.newnode ;

   var mode = getFileMode( cwd + "/" + newnode );
   fs.rename( cwd + "/" + oldnode, cwd + "/" + newnode, function(err) {
      if( err ){
         response = {
             status  : 1,
             message : err
         };
      }else{
         response = {
             status  : 0,
             mode: mode, 
             message : 'File renamed successfully'
         };
      }
      console.log( response );
      res.end(JSON.stringify(response));
   });
});
app.post('/rename_project', function(req, res){
   var response = {} ;
   projecttitle = req.body.projecttitle ;
   response = {
       status  : 0,
       message : 'Project renamed successfully'
   };
   console.log( response );
   res.end(JSON.stringify(response));
});

app.post('/set_compile_options', function (req, res){
console.log( req );
   language.compile = req.body.cmd_compile ;
   language.execute = req.body.cmd_execute ;
   result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
   '<div style="font-size:22px;text-align:center">Given options set successfully</div><br><br>' +
   '<center><div><input style="width:100px" type="button" value="OK" onclick="closeSign()" /></div></center>';
   // Update configuration file.
   fs.writeFileSync( COL_CONF_FILE, JSON.stringify(language) );
   data = {status  : 0, message : "Project compilation options set successfully"}
   res.end( result );
});
app.get('/get_compile_options', function (req, res){
   response = {
       cmd_compile : language.compile,
       cmd_execute : language.execute
   };
   console.log( response );
   res.end(JSON.stringify(response));
});

app.post('/upload_project', function(req, res){
   var importfile = req.files.file.path;
   console.log("Going to upload project from zip file");
   console.log(req.files.file.name);
   console.log(req.files.file.path);
   console.log(req.files.file.type);

   if( !STRING( req.files.file.type ).contains('zip') ){
       response = {
             status : 1, 
             message : 'Not a valid file to upload your project in compileonline workspace' 
        };
       fs.unlink( req.files.file.path );
       console.log( response );
       return res.end( JSON.stringify(response) );
   }
   cleanDir( HOME );
   response = {
       status  : 0,
       message : 'Home cleaned successfully'
   };
   console.log( response );
   response = {
       status  : 0,
       message : 'Going to unzip  ' + importfile
   };
   console.log( response );
   var compress = new targz().extract(importfile, HOME + "/..", function(err) {
      if( err ){
         response = {
             status  : 1,
             message : err
         };
         fs.unlink( req.files.file.path );
         console.log( response );
         res.end( JSON.stringify(response) );
         return false;
      }
      fs.readFile(COL_CONF_FILE, function (err, content){
          if(err){
              response = {
                  status  : 1,
                  message : err
              };
              fs.unlink( req.files.file.path );
              console.log(response);
              res.send( JSON.stringify(response) );
              return false;
           }else{
              response = {
                status  : 0,
                message : 'Project imported successfully'
              };
              var obj = JSON.parse( content );
              language = obj;
              console.log( "Language ID of the imported project : " + obj.id );
           }
           fs.unlink( req.files.file.path );
           console.log( response );
           res.end( JSON.stringify(response) );
           return false;
      });
   });
});

/*
app.use(express.basicAuth(function(user, pass, next) {
  if (user !== 'foo' || pass !== 'bar') {
    return next(true);
  }
  return next(null, user);
}));
*/

console.log ( "__dirname is : " + __dirname );
app.use(express.static(__dirname));
app.use(terminal.middleware());

if (!~process.argv.indexOf('-n')) {
  server.on('connection', function(socket) {
    disconnect = false;
    var address = socket.remoteAddress;
    client_ip_address = socket.remoteAddress;
/*
    if (address !== '127.0.0.1' && address !== '::1') {
      try {
        socket.destroy();
      } catch (e) {
        ;
      }
      console.log('Attempted connection from %s. Refused.', address);
    }
*/
      console.log('Got connection from %s.', address);
  });
}

console.log('Server is listening at  %s', port);
server.listen( port );

/**
 * Sockets
 */

io = io.listen(server, {
  log: false
});

io.sockets.on('connection', function(sock) {
  socket = sock;

  var command = "";
  socket.on('data', function(data) {
    if (stream) stream.write('IN: ' + data + '\n-\n');

    if( (STRING(data).contains ("\r") || STRING(data).contains ("\n")) && command === "exit" ){
       console.log( "Got an exit command " );
       return;
    }else if(escape(data) === "%04" ){
       console.log( "Got a Ctrl+D command " );
       return;
   }else if( data === "cmd-compile\n" ){
       // check what language we are working on.
       if( language.compile ){
           term.write(language.compile + " \n");
       }
       return;
   }else if( data === "cmd-execute\n" ){
       if( language.execute ){
            // Get File name and check if it exists.
            var exe = language.execute.split(" ");
            if( fs.existsSync( HOME + "/" + exe[0] )){
                term.write( "./" + language.execute + " \n");
            }
       }
       return;
   }else if( STRING(data).contains ("\r") || STRING(data).contains ("\n") ){
       term.write(data);
       command = "";
       return;
    }else{
       term.write(data);
       command = command.concat(data);
       return;
    }
  });

  socket.on('disconnect', function() {
    socket = null;
    disconnect = true;
    passiveTime = Date.now();
    console.log('Client got disconnected');
  });

  while (buff.length) {
    socket.emit('data', buff.shift());
  }
});

// Dropbox Interface
//
var request = require('request'),
  url = require('url');

app.use(express.cookieParser());
var ip = require( 'ip' );
function generateCSRFToken( mode ) {
   var CSRSFT = ip.toLong(ip.address()) + "-" + process.pid + "-" + port + "-" + mode;

   //var CSRSFT = crypto.randomBytes(18).toString('base64').replace(/\//g, '-').replace(/\+/g, '_');
   console.log( "Generated CSRSFT - " + CSRSFT );
   return CSRSFT;
}
function generateRedirectURI(req) {
   var URI = url.format({ protocol: req.protocol, host: req.headers.host, pathname: app.path() + '/dropbox.php'});
   var URI = "https://www.amrood.com/dropbox.php";
   console.log( "Generated URI - " + URI );
   return URI;
}
// Create a list of files & directories
function getFileList(dir) {
    var files = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
            files.push(file);
            files = files.concat(getFileList(file));
        } else {
            files.push(file);
        }
    })
    return files
}
function getCookieByName(name, req) {
    var cookies = req.headers.cookie.split("; ");
    for(var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].split("=");
        if( cookie[0] === name ){
            return unescape(cookie[1]);
        }
    }
    return null;
}
function setCookieByName(name, value, res) {
   var days = new Date(2025, 12, 01, 01, 01, 01, 01);
   console.log( days.toUTCString() );
   console.log( "Cookie value to set " + value);
   res.cookie( name, value, {expires:days });
}
app.get('/init', function(req, res){
   data = {
          status  : 0, 
          projecttitle:projecttitle, 
          mainmode:language.mode, 
          mainfile:mainfile, 
          languageid:languageid, 
          version:language.version,
          ext:language.ext,
          execute:language.execute,
          compile:language.compile,
          port:port,
          root:HOME,
          message : 'Initialized successfully'
         };
   return res.end( JSON.stringify( data ) );
});
//* ================================================================ ONE DRIVE INTERFACE GOES HERE ============================================================*//
var onedrive_project_to_import;
var onedrive_project_to_delete;
var onedrive_display_name;

app.get('/save_at_onedrive', function (req, res) {
   var csrfToken = generateCSRFToken( 201 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'login.live.com',
       pathname: 'oauth20_authorize.srf',
       query: { 'client_id': ONEDRIVE_CLIENT_ID, 'response_type':'code', 'scope':ONEDRIVE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
app.get('/list_onedrive_projects', function (req, res) {
   var csrfToken = generateCSRFToken( 202 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'login.live.com',
       pathname: 'oauth20_authorize.srf',
       query: { 'client_id': ONEDRIVE_CLIENT_ID, 'response_type':'code', 'scope':ONEDRIVE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
app.get('/import_onedrive_project', function (req, res) {
   var csrfToken = generateCSRFToken( 203 );
   onedrive_project_to_import = req.query.project;
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'login.live.com',
       pathname: 'oauth20_authorize.srf',
       query: { 'client_id': ONEDRIVE_CLIENT_ID, 'response_type':'code', 'scope':ONEDRIVE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
app.get('/delete_onedrive_project', function (req, res) {
   // Set Global variable  whenever we get a chance.
   onedrive_project_to_delete = req.query.project;
   var csrfToken = generateCSRFToken( 204 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'login.live.com',
       pathname: 'oauth20_authorize.srf',
       query: { 'client_id': ONEDRIVE_CLIENT_ID, 'response_type':'code', 'scope':ONEDRIVE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
var init = 0;
app.get('/save_at_onedrive_handler', function (req, res){
        if (req.query.error) {
            return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
        }
        // check CSRF token
        if (req.query.state !== generateCSRFToken(201)){
            return res.status(401).send(
            'CSRF token mismatch, possible cross-site request forgery attempt.'
            );
        }
        request.post('https://login.live.com/oauth20_token.srf', {form:{client_id:ONEDRIVE_CLIENT_ID, client_secret:ONEDRIVE_CLIENT_SECRET, code: req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
                var data = JSON.parse(body);
                console.log( body );
                if(data.error){
                     data = {status  : 1, message : data.error}
                     console.log( data );
                     return res.end( JSON.stringify( data ) );
                }
                // Extract bearer token
                var token = data.access_token;
                workspace = COMPILEONLINE;
                console.log( "Got a token " + token );

                // Lets get a list of all the directories and files
                var fileList = getFileList(HOME);
                var filecount = fileList.length;

                console.log( "Total files & directories to be uploaded " + filecount );
                console.log( "Project Title " + projecttitle );
               //  Get display name for the account holder.
               request.get('https://apis.live.net/v5.0/me?access_token=' + token, function (error, response, body){
               if( body.error ){
                     data = {status  : 1, message : data.error}
                     console.log( data );
                     return res.end( JSON.stringify( data ) );
                }
                onedrive_display_name = JSON.parse(body).name;
                console.log( "Got display name " + onedrive_display_name );
   
             // Create work space
             // Create workspace
             request.post('https://apis.live.net/v5.0/me/skydrive', {json:{name:workspace}, headers:{ Authorization: 'Bearer ' + token }}, function (error, response, body) {
                if( body.error ){
                    // It means workspace exist.
                    console.log( "workspace already exists");
                    // Get workspace ID
                    request.get('https://apis.live.net/v5.0/me/skydrive/files?filter=folders&access_token=' + token, function (error, response, body) {
                      if( body.error ){
                           data = {status  : 1, message : body.error}
                           console.log( data );
                           res.send( JSON.stringify( data ) );
                           return false;
                      }
                      var workspaces = JSON.parse(body).data;
                      workspaces.every( function(w){
                          if( w.name === workspace ){
                              console.log( "Got work space " + w.name );
                              console.log( "Got work space id " + w.id );
                              // Now try to create given project
                              request.post('https://apis.live.net/v5.0/' + w.id, {json:{name:projecttitle}, headers:{ Authorization: 'Bearer ' + token }}, function (error, response, body) {
                                   if( body.error ){
                                      // It means project exist.
                                      console.log( "Project already exist, going to get project ID");
                                      // Get project folder ID
                                      request.get('https://apis.live.net/v5.0/' + w.id + '/files?filter=folders&access_token=' + token, function (error, response, body) {
                                         if( body.error ){
                                              data = {status  : 1, message : body.error}
                                              console.log( data );
                                              res.send( JSON.stringify( data ) );
                                              return false;
                                         }
                                         var projects = JSON.parse(body).data;
                                         projects.every( function(p){
                                         console.log(p.name);
                                            if( p.name === projecttitle ){
                                                console.log( "Got project name " + p.name );
                                                console.log( "Got project id " + p.id );
                                                // Delete and create project to refresh all the files.
                                                console.log( "Going to delete old project");
                                                request.del('https://apis.live.net/v5.0/' + p.id + '?access_token=' + token, function (error, response, body){
                                                   if( body.error ){
                                                      data = {status  : 1, message : body.error}
                                                      console.log( data );
                                                      res.send( JSON.stringify( data ) );
                                                      return false;
                                                   }
                                                   // If project is deleted successfully, then again create it.
                                                   console.log( "Going to create same project once again");
                                                   request.post('https://apis.live.net/v5.0/' + w.id, {json:{name:projecttitle}, headers:{ Authorization: 'Bearer ' + token }}, function (error, response, body) {
                                                      if( body.error ){
                                                         data = {status  : 1, message : body.error}
                                                         console.log( data );
                                                         res.send( JSON.stringify( data ) );
                                                         return false;
                                                      }
                                                      // New project creation.
                                                      console.log( "Created project");
                                                      console.log( "Project Name " + body.name);
                                                      console.log( "Project ID " +  body.id);
                                                      init = 0;
                                                      saveAtOnedrive(HOME, body.id, token, filecount, res);
                                                   });
                                                });
                                            }
                                            return true;
                                         }); // Loop through all the projects
                                      });
                                   }else{
                                      // New project creation.
                                      console.log( "Project does not exist, so its created");
                                      console.log( "Project Name " + body.name);
                                      console.log( "Project ID " +  body.id);
                                      init = 0;
                                      saveAtOnedrive(HOME, body.id, token, filecount, res);
                                   }
                              });
                           }
                           return true;
                       });// Loop through all the workspaces
                  });
                }else{
                    console.log( "workspace already does not exist");
                }
             }); // Create workspace
             }); // Display Name
       });
});
function saveAtOnedrive(dir, pid, token, count, res){
    var list = fs.readdirSync(dir);
    list.map(function(file) {
        var basename = file;    
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
            request.post('https://apis.live.net/v5.0/' + pid, {json:{name:basename}, headers:{ Authorization: 'Bearer ' + token }}, function (error, response, body) {
               if( body && body.error ){
                  data = {status  : 1, message : body.error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               console.log( "Created directory " + file);
               init++;
               console.log( "Current init " + init + " final count is " + count );
               if( init == count ){
                  result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                  '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                  '<div style="font-size:22px;text-align:center">Your project has been saved at OneDrive at the following location</div>' +
                  '<div style="font-size:18px;text-align:center; font-weight:bold">OneDrive/' + workspace + '/' + projecttitle + '</div><br><br>' +
                  '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                  '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                  data = {status  : 0, message : "Pushed all the files successfully"}
                  console.log( data );
                  res.send( result );
                  return false;
               }
               saveAtOnedrive(file, body.id, token, count, res);
            });
        } else {
            fs.readFile(file, function(error, content){
               if( error ){
                  data = {status  : 1, message : error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               if( uploadsize + stat.size > DATA_TRANSFER_QUOTA ){
                 response = 'Sorry, you do not have sufficient quota for data transfer';
                 console.log( response );
                 res.send( response );
                 return false;
               }
               request.put('https://apis.live.net/v5.0/' + pid + '/files/' + basename + '?access_token=' + token, {headers:{'content-length':stat.size}, body:content},  function (error, response, body){
                  if( body && body.error ){
                     data = {status  : 1, message : body.error}
                     console.log( data );
                     res.send( JSON.stringify( data ) );
                     return false;
                  }
                  console.log( "Saved file " + file);
                  init++;
                  uploadsize = uploadsize + stat.size;
                  console.log( "Current init " + init + " final count is " + count );
                  if( init == count ){
                     result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                     '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                     '<div style="font-size:22px;text-align:center">Your project has been saved at OneDrive at the following location</div>' +
                     '<div style="font-size:18px;text-align:center; font-weight:bold">OneDrive/' + workspace + '/' + projecttitle + '</div><br><br>' +
                     '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                     '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                     data = {status  : 0, message : "Pushed all the files successfully"}
                     console.log( data );
                     res.send( result );
                     return false;
                  }
               });
            });
        }
    });
}
// This is where we will list down all the projects before opening or deleting.
app.get('/list_onedrive_projects_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   // check CSRF token
   if (req.query.state !== generateCSRFToken(202)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   request.post('https://login.live.com/oauth20_token.srf', {form:{client_id:ONEDRIVE_CLIENT_ID, client_secret:ONEDRIVE_CLIENT_SECRET, code: req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      console.log( body );
         if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a token " + token );
      console.log( "Going to search for  workspace  - " + workspace );
      
       //  Get display name for the account holder.
       request.get('https://apis.live.net/v5.0/me?access_token=' + token, function (error, response, body){
       if( body.error ){
              data = {status  : 1, message : data.error}
              console.log( data );
              return res.end( JSON.stringify( data ) );
        }
        onedrive_display_name = JSON.parse(body).name;
        console.log( "Got display name " + onedrive_display_name );

      // Get workspace ID
      request.get('https://apis.live.net/v5.0/me/skydrive/files?filter=folders&access_token=' + token, function (error, response, body) {
         if( body.error ){
            data = {status  : 1, message : body.error}
            console.log( data );
            res.send( JSON.stringify( data ) );
            return false;
         }
         var workspaces = JSON.parse(body).data;
         if( workspaces.length <= 0 ){
            result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
            '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
            '<div style="font-size:20px;text-align:center">Sorry you do not have any project at OneDrive to import</div><br><br>' +
            '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
            '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
            console.log( "No workspace work for the onedrive user");
            res.send( result );
            return false;
         }
         var wcount = 0;
         var pcount = 0;
         var wfound = 0;
         var pfound = 0;
         workspaces.every( function(w){
              wcount++;
              if( w.name === workspace ){
                  wfound++;
                  console.log( "Got work space " + w.name );
                  console.log( "Got work space id " + w.id );
                    console.log( "Going to get all projects");
                    // Get project folder ID
                    request.get('https://apis.live.net/v5.0/' + w.id + '/files?filter=folders&access_token=' + token, function (error, response, body) {
                       if( body.error ){
                            data = {status  : 1, message : body.error}
                            console.log( data );
                            res.send( JSON.stringify( data ) );
                            return false;
                       }
                       var projects = JSON.parse(body).data;
                       if( projects.length <= 0 ){
                           result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                           '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                           '<div style="font-size:20px;text-align:center">Sorry you do not have any project at OneDrive to import</div><br><br>' +
                           '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                           '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                           res.send( result );
                           return false;
                       }
                       result = '<head><style>table{border-collapse: collapse;border: 1px solid #DFDFDF; background-color: #eee;}' +
                       'table td{border:1px solid #dadada; color: #555; padding:5px;} ' +
                       'table th{border:1px solid #aaa; color: #555; background-color:#aaa; padding:5px;}</style>'+
                       '</head><body><center><img src="/images/mini-logo.png"/></center><br>' +
                       '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                       '<div style="font-size:20px;text-align:center">Found following projects at OneDrive</div> ' +
                       '<div style="font-size:16px;text-align:center; color:red;">Be careful before clicking on any of the actions</div><br><br> ' +
                       '<table style="text-align: left;border:1px solid #000; width:100%;"><tr><th>P.N.</th><th>Project Name</th><th>Last Modified</th><th>Action</th><th>Action</th></tr>';
                       var count = 0;
                       projects.every( function(p){
                          count = count + 1;
                          result = result + '<tr><td>' + count + '</td><td>' + p.name + '</td><td>' + p.updated_time + '</td><td><a href="delete_onedrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Delete</a></td><td><a href="import_onedrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Import</a></td></tr>';
                          return true;
                       }); // Loop through all the projects
                       result = result + '</table><br><br><center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="Quit" onclick="return quitBox(\'quit\');" /></div></center>' +
                       '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script></body></html>';
                       console.log("Found " + count + " project to list down");
                       res.send( result );
                       return false;
                    });
               }
               if( (workspaces.length == wcount) && wfound <= 0){ // it means all the workspaces search through but compileonline workspace did not find
                   result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                   '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                   '<div style="font-size:20px;text-align:center">Sorry you do not have any project at OneDrive to import</div><br><br>' +
                   '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                   '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                   console.log( "No workspace work for the onedrive user");
                   res.send( result );
                   return false;
               }
               return true;
           });// Loop through all the workspaces
      });
      }); // Display Name
   });
});
app.get('/delete_onedrive_project_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   console.log( "Project to delete " + onedrive_project_to_delete );
   // check CSRF token
   if (req.query.state !== generateCSRFToken(204)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   request.post('https://login.live.com/oauth20_token.srf', {form:{client_id:ONEDRIVE_CLIENT_ID, client_secret:ONEDRIVE_CLIENT_SECRET, code: req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      console.log( body );
         if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a token " + token );
      console.log( "Going to search for  workspace  - " + workspace );
      
      console.log( "Going to delete old project " + onedrive_project_to_delete);
      request.del('https://apis.live.net/v5.0/' + onedrive_project_to_delete + '?access_token=' + token, function (error, response, body){
         if( body.error ){
            data = {status  : 1, message : body.error}
            console.log( data );
            res.send( JSON.stringify( data ) );
            return false;
         }
      
         // Get workspace ID
         request.get('https://apis.live.net/v5.0/me/skydrive/files?filter=folders&access_token=' + token, function (error, response, body) {
            if( body.error ){
               data = {status  : 1, message : body.error}
               console.log( data );
               res.send( JSON.stringify( data ) );
               return false;
            }
            var workspaces = JSON.parse(body).data;
            if( workspaces.length <= 0 ){
               result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
               '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
               '<div style="font-size:20px;text-align:center">Sorry you do not have any more project at OneDrive to list down</div><br><br>' +
               '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
               '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
               console.log( "No workspace work for the onedrive user");
               res.send( result );
               return false;
            }
            var wcount = 0;
            var pcount = 0;
            var wfound = 0;
            var pfound = 0;
            workspaces.every( function(w){
                 wcount++;
                 if( w.name === workspace ){
                     wfound++;
                     console.log( "Got work space " + w.name );
                     console.log( "Got work space id " + w.id );
                       console.log( "Going to get all projects");
                       // Get project folder ID
                       request.get('https://apis.live.net/v5.0/' + w.id + '/files?filter=folders&access_token=' + token, function (error, response, body) {
                          if( body.error ){
                               data = {status  : 1, message : body.error}
                               console.log( data );
                               res.send( JSON.stringify( data ) );
                               return false;
                          }
                          var projects = JSON.parse(body).data;
                          if( projects.length <= 0 ){
                              result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                              '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                              '<div style="font-size:20px;text-align:center">Sorry you do not have any more project at OneDrive to list down</div><br><br>' +
                              '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                              '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                              res.send( result );
                              return false;
                          }
                          result = '<head><style>table{border-collapse: collapse;border: 1px solid #DFDFDF; background-color: #eee;}' +
                          'table td{border:1px solid #dadada; color: #555; padding:5px;} ' +
                          'table th{border:1px solid #aaa; color: #555; background-color:#aaa; padding:5px;}</style>'+
                          '</head><body><center><img src="/images/mini-logo.png"/></center><br>' +
                          '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                          '<div style="font-size:20px;text-align:center">Found following projects at OneDrive</div> ' +
                          '<div style="font-size:16px;text-align:center; color:red;">Selected project has been deleted permanentaly</div><br><br> ' +
                          '<table style="text-align: left;border:1px solid #000; width:100%;"><tr><th>P.N.</th><th>Project Name</th><th>Last Modified</th><th>Action</th><th>Action</th></tr>';
                          var count = 0;
                          projects.every( function(p){
                             count = count + 1;
                             result = result + '<tr><td>' + count + '</td><td>' + p.name + '</td><td>' + p.updated_time + '</td><td><a href="delete_onedrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Delete</a></td><td><a href="import_onedrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Import</a></td></tr>';
                             return true;
                          }); // Loop through all the projects
                          result = result + '</table><br><br><center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="Quit" onclick="return quitBox(\'quit\');" /></div></center>' +
                          '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script></body></html>';
                          console.log("Found " + count + " project to list down");
                          res.send( result );
                          return false;
                       });
                  }
                  if( (workspaces.length == wcount) && wfound <= 0){ // it means all the workspaces search through but compileonline workspace did not find
                      result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                      '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
                      '<div style="font-size:20px;text-align:center">Sorry you do not have any project at OneDrive to import</div><br><br>' +
                      '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                      '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                      console.log( "No workspace work for the onedrive user");
                      res.send( result );
                      return false;
                  }
                  return true;
              });// Loop through all the workspaces
         });
      }); // Project deletion
   });
});
app.get('/import_onedrive_project_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   console.log( "Project to import " + dropbox_project_to_import );
   console.log( "Code " + req.query.code );
   console.log( "CSRFT " + req.query.state );
   // check CSRF token
   if (req.query.state !== generateCSRFToken(203)){
      return res.status(401).send('CSRF token mismatch, possible cross-site request forgery attempt.');
   }
   // exchange access code for bearer token
   request.post('https://login.live.com/oauth20_token.srf', {form:{client_id:ONEDRIVE_CLIENT_ID, client_secret:ONEDRIVE_CLIENT_SECRET, code: req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      console.log( body );
         if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a OneDrive token " + token );
      console.log( "Going to clean existing workspace " + projecttitle);
      var result ;
     // Let's clean exiting workspace and then start downloading files.
      cleanDir( HOME );

     // Set project name, just make a call and proceed.
     projecttitle = NEW_PROJECT_TITLE;
     request.get('https://apis.live.net/v5.0/' + onedrive_project_to_import + '?access_token=' + token, function (error, response, body) {
        projecttitle = JSON.parse(body).name;
        console.log( "Set project title " + projecttitle );
     });
     
     getFromOnedrive(HOME, onedrive_project_to_import, token, res);
     // Take a pause and send message.
      setTimeout(function() {
         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
         '<div style="font-size:24px;text-align:center">' + onedrive_display_name + '</div><br>' +
         '<div style="font-size:22px;text-align:center">Your project has been imported successfully</div>' +
         '<div style="font-size:18px;text-align:center">Next step is, close this window and refresh your project</div><br><br>' +
         '<div style="font-size:18px;font-weight:bold;text-align:center">Project &gt; Refresh Project</div><br><br>' +
         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
         data = {status  : 0, message : "Imported all the files successfully"}
         console.log( data );
         res.send( result );
         return false;
      }, 10000);
   });
});
function getFromOnedrive(dir, pid, token, res ){
      request.get('https://apis.live.net/v5.0/' + pid + '/files?access_token=' + token, function (error, response, body) {
         if( body.error ){
            result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
             '<div style="font-size:20px;text-align:center">' + body.error + '</div><br><br>' +
             '<div style="font-size:16px;text-align:center">Please try to import your project once again.</div><br><br>' +
             '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
             '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
             res.send( result );
             return false;
         }
         var data = JSON.parse(body).data;   
         data.forEach( function( file ) {
            console.log( "Got an entry "  + file.name );
            if( file.type === 'folder' ){
               var dirname = dir + "/" + file.name;
               console.log( "Creating directory -- " + dirname);
               fs.mkdirSync( dirname  );
               getFromOnedrive( dirname, file.id, token, res );
            }else{
               console.log( "Writing file -- " + dir + "/" + file.name );
               request.get('https://apis.live.net/v5.0/' + file.id + '/content?access_token=' + token, {encoding: null}, function (error, response, body) {
                  if( body.error ){
                     result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                      '<div style="font-size:20px;text-align:center">' + body.error + '</div><br><br>' +
                      '<div style="font-size:16px;text-align:center">Please try to import your project once again.</div><br><br>' +
                      '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                      '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                      console.log(body.error);
                      res.send( result );
                      return false;
                  }
                  var filename = dir + "/" + file.name;
                  fs.writeFile(filename, body, function (error){
                     if(error){
                        result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                        '<div style="font-size:20px;text-align:center">' + error + '</div><br><br>' +
                        '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                        '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                        console.log(error);
                        res.send( result );
                        return false;
                     }
                     if( filename === COL_CONF_FILE ){
                        var obj = JSON.parse( body );
                        language = obj;
                        console.log( "Language ID of the imported project : " + obj.id );
                     }
                  }); //fs.writeFile
               }); // request.get()
            } //  node.is_dir
         }); // contents.forEach(
   });
}
//* ================================================================  GITHUB INTERFACE GOES HERE ============================================================*//
var github_project_to_import;
var github_project_to_delete;
var github_display_name;
var github_email_id;
var github_owner;
// This is where we will request Login ID and Password from the user at the time of project saving at Dropbox
app.get('/save_at_github', function (req, res) {
   var csrfToken = generateCSRFToken( 301 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'github.com',
       pathname: 'login/oauth/authorize',
       query: { 'client_id': GITHUB_CLIENT_ID, 'response_type':'code', 'state':csrfToken, 'redirect_uri': generateRedirectURI(req), scope:GITHUB_SCOPES}
   }));
});
app.get('/save_at_github_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   // check CSRF token
   if (req.query.state !== generateCSRFToken(301)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   console.log( "Going to exchange token with GitHub..." );
   // Exchange access code for bearer token
   request.post('https://github.com/login/oauth/access_token', { form:{ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code: req.query.code, redirect_uri: generateRedirectURI(req) }}, function (error, response, body) {
      var data = body;
      if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var tokens = body.split("&");;
      tokens = tokens[0].split("=");
      var token = tokens[1];
      workspace = COMPILEONLINE;

      // Lets get a list of all the directories and files
      var fileList = getFileList(HOME);
      var filecount = fileList.length;

      console.log( "Got Github token " + token );
      console.log( "Total files & directories to be uploaded " + filecount );
      console.log( "Project Title " + projecttitle );
      //  Get display name for the account holder.
      request.get('https://api.github.com/user', {headers: { 'User-Agent':'COMPILEONLINE', Authorization: 'token ' + token }}, function (error, response, body){
      var data = JSON.parse(body);
      if( body.error ){
          data = {status  : 1, message : data.error}
          console.log( data );
          return res.end( JSON.stringify( data ) );
      }
      github_display_name = data.name;
      github_email_id = data.email;
      github_owner = data.login;
      console.log( "Got display name " + github_display_name );
      console.log( "Got Email ID " + github_email_id );
      console.log( "Got Login ID" + github_owner );
      // By default create compileonline workspace.  If this workspace exist then it will fail which is fine.
      request.post('https://api.github.com/user/repos', {headers: {'User-Agent':'COMPILEONLINE', Authorization: 'token ' + token}, json:{private:false, has_downloads:true, auto_init:true, description:'Main Repository for COMPILEONLINE', name:workspace}}, function (error, response, body){
      console.log( body );
          // Now let's push all the files and directories.
          init = 0;
          saveAtGithub(HOME, token, filecount, res);
      }); // Get display name 
    }); // Token exchange
   }); // Token exchange
});
function saveAtGithub(dir, token, count, res){
    var list = fs.readdirSync(dir);
    list.map(function(file) {
        file = dir + '/' + file;
        var relativePath = file.substr( HOME.length + 1 );
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
               init++;
               console.log( "Current init " + init + " final count is " + count );
               if( init == count ){
                  result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                  '<div style="font-size:24px;text-align:center">' + github_display_name + '</div>' +
                  '<div style="font-size:14px;text-align:center">(' + github_email_id + ')</div><br>' +
                  '<div style="font-size:22px;text-align:center">Your project has been saved at Github at the following Repository:Project</div>' +
                  '<div style="font-size:18px;text-align:center; font-weight:bold">Github/' + workspace + ':' + projecttitle + '</div><br><br>' +
                  '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                  '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                  data = {status  : 0, message : "Pushed all the files successfully"}
                  console.log( data );
                  res.send( result );
                  return false;
               }
               saveAtGithub(file, token, count, res);
        } else {
            fs.readFile( file,  function(error, content){
               if( error ){
                  data = {status  : 1, message : error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               if( uploadsize + stat.size > DATA_TRANSFER_QUOTA ){
                 response = 'Sorry, you do not have sufficient quota for data transfer';
                 console.log( response );
                 res.send( response );
                 return false;
               }
               var base64content = content.toString('base64');
               request.put('https://api.github.com/repos/' + github_owner + "/" + workspace + "/contents/" + projecttitle + "/" + relativePath, { json:{path:projecttitle + "/" + relativePath, message:'Created by COL', content:base64content}, headers: {'User-Agent':'COMPILEONLINE', Authorization: 'token ' + token} }, function (error, response, body) {
                  if( body && body.error ){
                     data = {status  : 1, message : body.error}
                     console.log( data );
                     res.send( JSON.stringify( data ) );
                     return false;
                  }
                  console.log( "Saved file " + file);
                  init++;
                  uploadsize = uploadsize + stat.size;
                  console.log( "Current init " + init + " final count is " + count );
                  if( init == count ){
                         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                         '<div style="font-size:24px;text-align:center">' + github_display_name + '</div>' +
                         '<div style="font-size:14px;text-align:center">(' + github_email_id + ')</div><br>' +
                         '<div style="font-size:22px;text-align:center">Your project has been saved at Github at the following Repository:Project</div>' +
                         '<div style="font-size:18px;text-align:center; font-weight:bold">Github/' + workspace + '/' + projecttitle + '</div><br><br>' +
                         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                         data = {status  : 0, message : "Pushed all the files successfully"}
                         console.log( data );
                         res.send( result );
                         return false;
                    }
               });
            });
        }
    });
}

//* ================================================================ DROP BOX INTERFACE GOES HERE ============================================================*//
var dropbox_project_to_import;
var dropbox_project_to_delete;
var dropbox_display_name;
var dropbox_email_id;
// This is where we will request Login ID and Password from the user at the time of project saving at Dropbox
app.get('/save_at_dropbox', function (req, res) {
   var csrfToken = generateCSRFToken( 1 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'www.dropbox.com',
       pathname: '1/oauth2/authorize',
       query: { 'client_id': DROPBOX_APP_KEY, 'response_type':'code', 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
// This is where we will request Login ID and Password from the user at the time of project listing
app.get('/list_dropbox_projects', function (req, res) {
   var csrfToken = generateCSRFToken( 2 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'www.dropbox.com',
       pathname: '1/oauth2/authorize',
       query: { client_id: DROPBOX_APP_KEY, response_type:'code', state:csrfToken, redirect_uri: generateRedirectURI(req)}
   }));
});
// This is where we will request Login ID and Password from the user at the time of project Importing
app.get('/import_dropbox_project', function (req, res) {
   var csrfToken = generateCSRFToken( 3 );
   dropbox_project_to_import = req.query.project;
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'www.dropbox.com',
       pathname: '1/oauth2/authorize',
       query: { client_id: DROPBOX_APP_KEY, response_type:'code', state:csrfToken, redirect_uri: generateRedirectURI(req)}
   }));
});
// This is where we will request Login ID and Password from the user at the time of project deleting
app.get('/delete_dropbox_project', function (req, res) {
   var csrfToken = generateCSRFToken( 4 );
   dropbox_project_to_delete = req.query.project;
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'www.dropbox.com',
       pathname: '1/oauth2/authorize',
       query: { client_id: DROPBOX_APP_KEY, response_type:'code', state:csrfToken, redirect_uri: generateRedirectURI(req)}
   }));
});
// This is where user will be redirected after authentication.
app.get('/save_at_dropbox_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   // check CSRF token
   if (req.query.state !== generateCSRFToken(1)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   // Exchange access code for bearer token
   request.post('https://api.dropbox.com/1/oauth2/token', { form: { code: req.query.code, grant_type: 'authorization_code', redirect_uri: generateRedirectURI(req) }, auth: { user: DROPBOX_APP_KEY, pass: DROPBOX_APP_SECRET } }, function (error, response, body) {
      var data = JSON.parse(body);
      if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;

      // Lets get a list of all the directories and files
      var fileList = getFileList(HOME);
      var filecount = fileList.length;

      console.log( "Total files & directories to be uploaded " + filecount );
      console.log( "Project Title " + projecttitle );
      //  Get display name for the account holder.
      request.get('https://api.dropbox.com/1/account/info', { headers: { Authorization: 'Bearer ' + token } }, function (error, response, body){
      if( body.error ){
          data = {status  : 1, message : data.error}
          console.log( data );
          return res.end( JSON.stringify( data ) );
      }
      dropbox_display_name = JSON.parse(body).display_name;
      dropbox_email_id = JSON.parse(body).email;
      console.log( "Got display name " + dropbox_display_name );
      console.log( "Got Email ID" + dropbox_email_id );
      // By default create compileonline workspace.  If this workspace exist then it will fail which is fine.
      request.post('https://api.dropbox.com/1/fileops/create_folder', { form:{root:'dropbox', path:'/' + workspace}, headers: { Authorization: 'Bearer ' + token } }, function (error, response, body){
         // By default let's delete project and recreate it.
         console.log( "Going to delete project if it exists " + projecttitle );
         request.post('https://api.dropbox.com/1/fileops/delete', { form:{root:'dropbox', path:'/' +  workspace + '/'+  projecttitle}, headers: { Authorization: 'Bearer ' + token } }, function (error, response, body) {
            if( body.error ){
               data = {status  : 1, message : data.error}
               console.log( data );
               return res.end( JSON.stringify( data ) );
            }
            // Now let's create it once again from scratch.
            console.log( "Project deleted successfully" );
            console.log( "Going to create project once again " + projecttitle );
            request.post('https://api.dropbox.com/1/fileops/create_folder', { form:{root:'dropbox', path:'/' +  workspace + '/'+  projecttitle}, headers: { Authorization: 'Bearer ' + token } }, function (error, response, body) {
               if( body.error ){
                  data = {status  : 1, message : data.error}
                  console.log( data );
                  return res.end( JSON.stringify( data ) );
               }
               // Now let's push all the files and directories.
               init = 0;
               saveAtDropbox(HOME, token, filecount, res);
            });
         }); // Delete project directory
      }); // Delete workspace
      }); // Get display name 
   }); // Token exchange
});

function saveAtDropbox(dir, token, count, res){
    var list = fs.readdirSync(dir);
    list.map(function(file) {
        file = dir + '/' + file;
        var relativePath = file.substr( HOME.length + 1 );
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
            request.post('https://api.dropbox.com/1/fileops/create_folder', {form:{root:'dropbox', path:'/' + workspace + '/' + projecttitle + '/' + relativePath}, headers:{ Authorization: 'Bearer ' + token } }, function (error, response, body) {
               if( body && body.error ){
                  data = {status  : 1, message : body.error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               console.log( "Created directory " + file);
               init++;
               console.log( "Current init " + init + " final count is " + count );
               if( init == count ){
                  result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                  '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
                  '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
                  '<div style="font-size:22px;text-align:center">Your project has been saved at Dropbox at the following location</div>' +
                  '<div style="font-size:18px;text-align:center; font-weight:bold">Dropbox/' + workspace + '/' + projecttitle + '</div><br><br>' +
                  '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                  '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                  data = {status  : 0, message : "Pushed all the files successfully"}
                  console.log( data );
                  res.send( result );
                  return false;
               }
               saveAtDropbox(file, token, count, res);
            });
        } else {
            fs.readFile( file,  function(error, content){
               if( error ){
                  data = {status  : 1, message : error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               if( uploadsize + stat.size > DATA_TRANSFER_QUOTA ){
                 response = 'Sorry, you do not have sufficient quota for data transfer';
                 console.log( response );
                 res.send( response );
                 return false;
               }
               request.put('https://api-content.dropbox.com/1/files_put/auto' + '/' + workspace + '/' + projecttitle + '/' + relativePath, {headers:{ Authorization: 'Bearer ' + token, 'content-length':stat.size}, body:content},  function (error, response, body) {
                  if( body && body.error ){
                     data = {status  : 1, message : body.error}
                     console.log( data );
                     res.send( JSON.stringify( data ) );
                     return false;
                  }
                  console.log( "Saved file " + file);
                  init++;
                  uploadsize = uploadsize + stat.size;
                  console.log( "Current init " + init + " final count is " + count );
                  if( init == count ){
                         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                         '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
                         '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
                         '<div style="font-size:22px;text-align:center">Your project has been saved at Dropbox at the following location</div>' +
                         '<div style="font-size:18px;text-align:center; font-weight:bold">Dropbox/' + workspace + '/' + projecttitle + '</div><br><br>' +
                         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                         data = {status  : 0, message : "Pushed all the files successfully"}
                         console.log( data );
                         res.send( result );
                         return false;
                    }
               });
            });
        }
    });
}
// This is where we will list down all the projects before opening or deleting.
app.get('/list_dropbox_projects_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   // check CSRF token
   if (req.query.state !== generateCSRFToken(2)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   // Exchange access code for bearer token
   request.post('https://api.dropbox.com/1/oauth2/token', { form: { code: req.query.code, grant_type: 'authorization_code', redirect_uri: generateRedirectURI(req) }, auth: { user: DROPBOX_APP_KEY, pass: DROPBOX_APP_SECRET } }, function (error, response, body) {
      var data = JSON.parse(body);
      if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      console.log( "Got Dropbox token " + token );
      workspace = COMPILEONLINE;
      
      console.log( "Going to search for the folder  - " + workspace );
      // Check if this user has compileonline folder or not, if yes then fetch all the folders available inside it.
      var result ;
      //  Get display name for the account holder.
      request.get('https://api.dropbox.com/1/account/info', { headers: { Authorization: 'Bearer ' + token } }, function (error, response, body){
      if( body.error ){
          data = {status  : 1, message : data.error}
          console.log( data );
          return res.end( JSON.stringify( data ) );
      }
      dropbox_display_name = JSON.parse(body).display_name;
      dropbox_email_id = JSON.parse(body).email;
      console.log( "Got display name " + dropbox_display_name );
      console.log( "Got Email ID" + dropbox_email_id );
      request.get('https://api.dropbox.com/1/metadata/auto/' + workspace, { form:{list:true}, headers: { Authorization: 'Bearer ' + token } }, function (error, response, body) {
         if( body.error ){
            data = {status  : 1, message : body.error}
            console.log( data );
            res.send( JSON.stringify( data ) );
            return false;
         }
         var projects = JSON.parse(body).contents;
         if( projects.length <= 0 ){
            result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
            '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
            '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
            '<div style="font-size:20px;text-align:center">Sorry you do not have any project at Dropbox to import</div>' +
            '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
            '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
            res.send( result );
            return false;
         }
         
         result = '<head><style>table{border-collapse: collapse;border: 1px solid #DFDFDF; background-color: #eee;}' +
         'table td{border:1px solid #DADADA; color: #555; padding:5px;} ' +
         'table th{border:1px solid #aaa; color: #555; background-color:#aaa; padding:5px;}</style>'+
         '</head><body><center><img src="/images/mini-logo.png"/></center><br>' +
         '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
         '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
         '<div style="font-size:20px;text-align:center">Found following projects</div>' +
         '<div style="font-size:16px;text-align:center; color:red;">Be careful before clicking on any of the actions</div><br><br> ' +
         '<table style="text-align: left;border:1px solid #000; width:100%;"><tr><th>P.N.</th><th>Project Name</th><th>Last Modified</th><th>Action</th><th>Action</th></tr>';
         var count = 0;
         
         projects.every( function( p ) {
            if( p.is_dir ){
               var project = path.basename( p.path );
               count = count + 1;
               result = result + '<tr><td>' + count + '</td><td>' + project + '</td><td>' + p.modified + '</td><td><a href="delete_dropbox_project?state=' + req.query.state  + '&project=' + p.path + '&code=' + req.query.code + '\'">Delete</a></td><td><a href="import_dropbox_project?state=' + req.query.state  + '&project=' + p.path + '&code=' + req.query.code + '\'">Import</a></td></tr>';
               console.log( "Project found " + project );
            }
            return true;
         }); // Loop through all the projects
         result = result + '</table><br><br><center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="Quit" onclick="return quitBox(\'quit\');" /></div></center>' +
         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script></body></html>';
         console.log("Found " + count + " project to list down");
         res.send( result );
         return false;
      });
   });
   });
});
app.get('/delete_dropbox_project_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   console.log( "Project  to delete " + dropbox_project_to_delete );
   // check CSRF token
   if (req.query.state !== generateCSRFToken(4)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   // exchange access code for bearer token
   request.post('https://api.dropbox.com/1/oauth2/token', { form: { code: req.query.code, grant_type: 'authorization_code', redirect_uri: generateRedirectURI(req) }, auth: { user: DROPBOX_APP_KEY, pass: DROPBOX_APP_SECRET } }, function (error, response, body) {
      var data = JSON.parse(body);
      if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // extract bearer token
      var token = data.access_token;
      var project =  dropbox_project_to_delete;
      workspace = COMPILEONLINE;
      console.log( "Got a Dropbox token " + token );
      console.log( "Going to search for  workspace  - " + workspace );

      console.log( "Going to delete project " + dropbox_project_to_delete);
      request.post('https://api.dropbox.com/1/fileops/delete', { form:{root:'dropbox', path:project}, headers: { Authorization: 'Bearer ' + token } }, function (error, response, body) {
         if( body.error ){
            data = {status  : 1, message : body.error}
            console.log( data );
            res.send( JSON.stringify( data ) );
            return false;
         }
         // Now list down all the remaining project.
         console.log( "Going to search for the folder  - " + workspace );
         var result ;
         request.get('https://api.dropbox.com/1/metadata/auto/' + workspace, { form:{list:true}, headers: { Authorization: 'Bearer ' + token } }, function (error, response, body) {
            if( body.error ){
               data = {status  : 1, message : body.error}
               console.log( data );
               res.send( JSON.stringify( data ) );
               return false;
            }
            var projects = JSON.parse(body).contents;
            if( projects.length <= 0 ){
               result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
               '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
               '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
               '<div style="font-size:20px;text-align:center">Sorry you do not have any more project at Dropbox to import or delete</div><br><br>' +
               '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
               '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
               res.send( result );
               return false;
            }
         
            result = '<head><style>table{border-collapse: collapse;border: 1px solid #DFDFDF; background-color: #eee;}' +
            'table td{border:1px solid #DADADA; color: #555; padding:5px;} ' +
            'table th{border:1px solid #aaa; color: #555; background-color:#aaa; padding:5px;}</style>'+
            '</head><body><center><img src="/images/mini-logo.png"/></center><br>' +
            '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
            '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
            '<div style="font-size:20px;text-align:center">Found following projects</div> ' +
            '<div style="font-size:16px;text-align:center; color:red;">Be careful before clicking on any of the actions</div><br><br> ' +
            '<div style="font-size:16px;text-align:center; color:red;">Selected project has been deleted permanentaly</div><br><br> ' +
            '<table style="text-align: left;border:1px solid #000; width:100%;"><tr><th>P.N.</th><th>Project Name</th><th>Last Modified</th><th>Action</th><th>Action</th></tr>';
            var count = 0;
            projects.every( function( p ) {
               if( p.is_dir ){
                  var project = path.basename( p.path );
                  count = count + 1;
                  result = result + '<tr><td>' + count + '</td><td>' + project + '</td><td>' + p.modified + '</td><td><a href="delete_dropbox_project?state=' + req.query.state  + '&project=' + p.path + '&code=' + req.query.code + '\'">Delete</a></td><td><a href="import_dropbox_project?state=' + req.query.state  + '&project=' + p.path + '&code=' + req.query.code + '\'">Import</a></td></tr>';
                  console.log( "Project found " + project );
               }
               return true;
            }); // Loop through all the projects
            result = result + '</table><br><br><center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="Quit" onclick="return quitBox(\'quit\');" /></div></center>' +
            '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script></body></html>';
            console.log("Found " + count + " project to list down");
            res.send( result );
            return false;
         });
      });
   });
});

app.get('/import_dropbox_project_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   console.log( "Project to import " + dropbox_project_to_import );
   console.log( "Code " + req.query.code );
   console.log( "CSRFT " + req.query.state );
   // check CSRF token
   if (req.query.state !== generateCSRFToken(3)){
      return res.status(401).send('CSRF token mismatch, possible cross-site request forgery attempt.');
   }
   // exchange access code for bearer token
   request.post('https://api.dropbox.com/1/oauth2/token', { form: { code: req.query.code, grant_type: 'authorization_code', redirect_uri: generateRedirectURI(req) }, auth: { user: DROPBOX_APP_KEY, pass: DROPBOX_APP_SECRET } }, function (error, response, body) {
      var data = JSON.parse(body);
      console.log( body );
         if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a Dropbox token " + token );
      console.log( "Going to clean existing workspace " + dropbox_project_to_import);
      var result ;
     // Let's clean exiting workspace and then start downloading files.
      cleanDir( HOME );
      projecttitle = NEW_PROJECT_TITLE;
      request.get('https://api.dropbox.com/1/metadata/auto/' + dropbox_project_to_import, { headers: {Authorization: 'Bearer ' + token} }, function (error, response, body) {
           projecttitle = path.basename( JSON.parse(body).path  );
           console.log( "Set project title " + projecttitle );
      });
      getDropboxProject( HOME, dropbox_project_to_import, token, res );
      // Take a pause and send message.
      setTimeout(function() {
         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
         '<div style="font-size:24px;text-align:center">' + dropbox_display_name + '</div>' +
         '<div style="font-size:14px;text-align:center">(' + dropbox_email_id + ')</div><br>' +
         '<div style="font-size:22px;text-align:center">Your project has been imported successfully</div>' +
         '<div style="font-size:18px;text-align:center">Next step is, close this window and refresh your project</div><br><br>' +
         '<div style="font-size:18px;font-weight:bold;text-align:center">Project &gt; Refresh Project</div><br><br>' +
         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
         data = {status  : 0, message : "Imported all the files successfully"}
         console.log( data );
         res.send( result );
         return false;
      }, 10000);
   });
});
function getDropboxProject( dir, project, token, res ){
   request.get('https://api.dropbox.com/1/metadata/auto/' + project, { form:{list:true}, headers: {Authorization: 'Bearer ' + token} }, function (error, response, body) {
      error = JSON.parse(body).error;
      if(error){
         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
         '<div style="font-size:20px;text-align:center">' + error + '</div><br><br>' +
         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
         console.log(error);
         res.send( result );
         return false;
      }
      var contents = JSON.parse(body).contents;
      contents.forEach( function( file ) {
         var relativePath = file.path.substr( dropbox_project_to_import.length + 1 );
         console.log( "Got an entry "  + relativePath );
         if( file.is_dir ){
            var dirname = dir + "/" + relativePath;
            console.log( "Creating directory -- " + dirname);
            fs.mkdirSync( dirname );
            getDropboxProject(HOME, file.path, token, res );
         }else{
            console.log( "Reading file -- " +  file.path );
            request.get('https://api-content.dropbox.com/1/files/auto/' + file.path, {encoding: null, headers: {Authorization: 'Bearer ' + token} }, function (error, response, body) {
               if( body.error ){
                  result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                   '<div style="font-size:20px;text-align:center">' + body.error + '</div><br><br>' +
                   '<div style="font-size:16px;text-align:center">Please try to import your project once again.</div><br><br>' +
                   '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                   '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                   console.log(body.error);
                   res.send( result );
                   return false;
               }
               fs.writeFile( dir + "/" + relativePath, body, function (error){
                  if(error){
                     result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                     '<div style="font-size:20px;text-align:center">' + error + '</div><br><br>' +
                     '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                     '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                     console.log(error);
                     res.send( result );
                     return false;
                  }
                  var filename = dir + "/" + relativePath;
                  if( filename === COL_CONF_FILE ){
                       var obj = JSON.parse( body );
                       language = obj;
                       console.log( "Language ID of the imported project : " + obj.id );
                  }
               }); //fs.writeFile
            }); // request.get()
         } //  file.is_dir
      }); // contents.forEach(
   });
}
//* ================================================================ GOOGLE DRIVE INTERFACE GOES HERE ============================================================*//
var googledrive_project_to_import;
var googledrive_project_to_delete;
var googledrive_display_name;
var googledrive_email_id;
app.get('/save_at_googledrive', function (req, res) {
   var csrfToken = generateCSRFToken( 101 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'accounts.google.com',
       pathname: 'o/oauth2/auth',
       query: { 'client_id': GOOGLE_CLIENT_ID, 'response_type':'code', 'scope':GOOGLE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});

app.get('/list_googledrive_projects', function (req, res) {
   var csrfToken = generateCSRFToken( 102 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'accounts.google.com',
       pathname: 'o/oauth2/auth',
       query: { 'client_id': GOOGLE_CLIENT_ID, 'response_type':'code', 'scope':GOOGLE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});

app.get('/import_googledrive_project', function (req, res) {
   var csrfToken = generateCSRFToken( 103 );
   googledrive_project_to_import = req.query.project;
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'accounts.google.com',
       pathname: 'o/oauth2/auth',
       query: { 'client_id': GOOGLE_CLIENT_ID, 'response_type':'code', 'scope':GOOGLE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
app.get('/delete_googledrive_project', function (req, res) {
   // Set Global variable  whenever we get a chance.
   googledrive_project_to_delete = req.query.project;
   var csrfToken = generateCSRFToken( 104 );
   res.redirect(url.format({
       protocol: 'https',
       hostname: 'accounts.google.com',
       pathname: 'o/oauth2/auth',
       query: { 'client_id': GOOGLE_CLIENT_ID, 'response_type':'code', 'scope':GOOGLE_SCOPES, 'state':csrfToken, 'redirect_uri': generateRedirectURI(req)}
   }));
});
app.get('/save_at_googledrive_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   // check CSRF token
   if (req.query.state !== generateCSRFToken(101)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   // Exchange access code for bearer token
   request.post('https://accounts.google.com/o/oauth2/token', {form:{client_id:GOOGLE_CLIENT_ID, client_secret:GOOGLE_CLIENT_SECRET, code:req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got google token " + token );

      // Lets get a list of all the directories and files
      var fileList = getFileList(HOME);
      var filecount = fileList.length;

      console.log( "Total files & directories to be uploaded " + filecount );
      console.log( "Project Title " + projecttitle );
      // Get display name and email ID
      request.get('https://www.googleapis.com/drive/v2/about', { headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
      if( body.error ){
          data = {status  : 1, message : data.error}
          console.log( data );
          return res.end( JSON.stringify( data ) );
       }
       googledrive_display_name = JSON.parse( body ).user.displayName;
       googledrive_email_id = JSON.parse( body ).user.emailAddress;
       console.log( "Got display name " + googledrive_display_name );
       console.log( "Got Email ID" + googledrive_email_id );
      // Just check if you have compileonline workspace available.
      request.get('https://www.googleapis.com/drive/v2/files', {qs:{q:'title=\'' + workspace + '\' and trashed=false and mimeType=\'application/vnd.google-apps.folder\''}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
         if( body.error ){
            data = {status  : 1, message : data.error}
            console.log( data );
            return res.end( JSON.stringify( data ) );
          }
          var wid = 0;
          if( JSON.parse(body).items[0] ){
              wid = JSON.parse(body).items[0].id;
              console.log("Found workspace...." + workspace);
              console.log("Workspace id...." + wid);
          }
          if( wid ){
               // Workspace already exist so now let's try to find out project name.
               request.get('https://www.googleapis.com/drive/v2/files/' + wid + '/children', {qs:{q:'title=\'' + projecttitle + '\' and trashed=false and mimeType=\'application/vnd.google-apps.folder\''}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
                  if( body.error ){
                     data = {status  : 1, message : data.error}
                     console.log( data );
                     return res.end( JSON.stringify( data ) );
                  }
                  var pid = 0;
                  if( JSON.parse(body).items[0] ){
                     pid = JSON.parse(body).items[0].id;
                     console.log("Found project with the same name...." + projecttitle);
                     console.log("Project id...." + pid);
                  }
                  if( pid ){
                     console.log( "Going to delete old project");
                     request.del('https://www.googleapis.com/drive/v2/files/' + pid + '?access_token=' + token, function (error, response, body){
                        if( body.error ){
                           data = {status  : 1, message : body.error}
                           console.log( data );
                           res.send( JSON.stringify( data ) );
                           return false;
                        }
                        // If project is deleted successfully, then again create it.
                        console.log( "Going to create same project once again");
                        request.post('https://www.googleapis.com/drive/v2/files', { json:{title:projecttitle, parents:[{id:wid}], mimeType:'application/vnd.google-apps.folder'}, headers: { Authorization: 'Bearer ' + token, 'Content-type':'application/json'} }, function (error, response, body) {
                           if( body.error ){
                              data = {status  : 1, message : body.error}
                              console.log( data );
                              res.send( JSON.stringify( data ) );
                              return false;
                           }
                           // New project creation.
                           console.log( "Created new project once again");
                           console.log( "Project Name " + body.title);
                           console.log( "Project ID " +  body.id);
                           init = 0;
                           saveAtGoogledrive(HOME, body.id, token, filecount, res);
                        });
                    });
                }else{
                    // New project creation.
                    console.log( "Project does not exist, Let's create it");
                    request.post('https://www.googleapis.com/drive/v2/files', { json:{title:projecttitle, parents:[{id:wid}], mimeType:'application/vnd.google-apps.folder'}, headers: { Authorization: 'Bearer ' + token, 'Content-type':'application/json'} }, function (error, response, body) {
                        if( body.error ){
                           data = {status  : 1, message : body.error}
                           console.log( data );
                           res.send( JSON.stringify( data ) );
                           return false;
                        }
                        // New project creation.
                        console.log( "Created new project from scratch");
                        console.log( "Project Name " + body.title);
                        console.log( "Project ID " +  body.id);
                        init = 0;
                        saveAtGoogledrive(HOME, body.id, token, filecount, res);
                     });
                  }
               });
          }else{
              // Create a workspace if it does not exit.
              console.log( 'Going to create workspoce : ' + workspace);
              request.post('https://www.googleapis.com/drive/v2/files', { json:{title:workspace, parents:[{id:'root'}], mimeType:'application/vnd.google-apps.folder'}, headers: { Authorization: 'Bearer ' + token, 'Content-type':'application/json'} }, function (error, response, body) {
                   if( body.error ){
                      data = {status  : 1, message : data.error}
                      console.log( data );
                      return res.end( JSON.stringify( data ) );
                    }
                    wid = body.id;
                    console.log( 'New workspoce space created with id ' + wid);
                    console.log( "Going to create new project inside new workspace");
                    request.post('https://www.googleapis.com/drive/v2/files', { json:{title:projecttitle, parents:[{id:wid}], mimeType:'application/vnd.google-apps.folder'}, headers: { Authorization: 'Bearer ' + token, 'Content-type':'application/json'} }, function (error, response, body) {
                        if( body.error ){
                           data = {status  : 1, message : body.error}
                           console.log( data );
                           res.send( JSON.stringify( data ) );
                           return false;
                        }
                        // New project creation.
                        console.log( "Created new project once again");
                        console.log( "Project Name " + body.title);
                        console.log( "Project ID " +  body.id);
                        init = 0;
                        saveAtGoogledrive(HOME, body.id, token, filecount, res);
                   }); // project creation 
              }); // workspace creation
          } // else part when workspace does not exist
      }); // search for compileonline workspace.
      }); // Display name
   });  // getting exchange token.
}); // main function entry.

function saveAtGoogledrive(dir, pid, token, count, res){
    var list = fs.readdirSync(dir);
    list.map(function(file) {
        var basename = file;    
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
            request.post('https://www.googleapis.com/drive/v2/files', {json:{title:basename, parents:[{id:pid}], mimeType:'application/vnd.google-apps.folder'}, headers:{ Authorization: 'Bearer ' + token, 'Content-type':'application/json' }}, function (error, response, body) {
               if( body && body.error ){
                  data = {status  : 1, message : body.error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               console.log( "Created directory " + file);
               init++;
               console.log( "Current init " + init + " final count is " + count );
               if( init == count ){
                  result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                  '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
                  '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
                  '<div style="font-size:22px;text-align:center">Your project has been saved at Google Drive at the following location</div>' +
                  '<div style="font-size:18px;text-align:center; font-weight:bold">Google Drive/' + workspace + '/' + projecttitle + '</div><br><br>' +
                  '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                  '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                  data = {status  : 0, message : "Pushed all the files successfully"}
                  console.log( data );
                  res.send( result );
                  return true;
               }
               saveAtGoogledrive(file, body.id, token, count, res);
            });
        } else {
            fs.readFile( file,  function(error, content){
               if( error ){
                  data = {status  : 1, message : error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               if( uploadsize + stat.size > DATA_TRANSFER_QUOTA ){
                 response = 'Sorry, you do not have sufficient quota for data transfer';
                 console.log( response );
                 res.send( response );
                 return true;
               }
               request.post('https://www.googleapis.com/upload/drive/v2/files', {qs:{'uploadType': 'multipart'}, headers:{ Authorization: 'Bearer ' + token}, multipart:[{'Content-Type': 'application/json; charset=UTF-8', body:JSON.stringify({title:basename, parents:[{id:pid}]})}, {body: content}]},  function (error, response, body) {
                  if( body && body.error ){
                     data = {status  : 1, message : body.error}
                     console.log( data );
                     res.send( JSON.stringify( data ) );
                     return false;
                  }
                  console.log( "Saved file " + file);
                  init++;
                  uploadsize = uploadsize + stat.size ;
                  console.log( "Current init " + init + " final count is " + count );
                  if( init == count ){
                         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                         '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
                         '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
                         '<div style="font-size:22px;text-align:center">Your project has been saved at Google Drive at the following location</div>' +
                         '<div style="font-size:18px;text-align:center; font-weight:bold">Google Drive/' + workspace + '/' + projecttitle + '</div><br><br>' +
                         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                         data = {status  : 0, message : "Pushed all the files successfully"}
                         console.log( data );
                         res.send( result );
                         return true;
                    }
               });
            });
        }
    });
}
// This is where we will list down all the projects before opening or deleting.
app.get('/list_googledrive_projects_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   // check CSRF token
   if (req.query.state !== generateCSRFToken(102)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   }
   // Exchange access code for bearer token
   request.post('https://accounts.google.com/o/oauth2/token', {form:{client_id:GOOGLE_CLIENT_ID, client_secret:GOOGLE_CLIENT_SECRET, code:req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a google token " + token );
      console.log( "Going to search for  workspace  - " + workspace );
      
      // Get display name and email ID
      request.get('https://www.googleapis.com/drive/v2/about', { headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
      if( body.error ){
          data = {status  : 1, message : data.error}
          console.log( data );
          return res.end( JSON.stringify( data ) );
       }
       googledrive_display_name = JSON.parse( body ).user.displayName;
       googledrive_email_id = JSON.parse( body ).user.emailAddress;
       console.log( "Got display name " + googledrive_display_name );
       console.log( "Got Email ID" + googledrive_email_id );
      // Lets try to search for default workspace.
      request.get('https://www.googleapis.com/drive/v2/files', {qs:{q:'title=\'' + workspace + '\' and trashed=false and mimeType=\'application/vnd.google-apps.folder\''}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
         if( body.error ){
            data = {status  : 1, message : data.error}
            console.log( data );
            return res.end( JSON.stringify( data ) );
          }
          var wid = 0;
          if( JSON.parse(body).items[0] ){
              wid = JSON.parse(body).items[0].id;
              console.log("Found workspace...." + workspace);
              console.log("Workspace id...." + wid);
          }
          if( wid <= 0 ){
            result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
            '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
            '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
            '<div style="font-size:20px;text-align:center">Sorry you do not have any project at GoogleDrive to import</div><br><br>' +
            '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
            '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
            console.log( "No workspace work for the onedrive user");
            res.send( result );
            return false;
         }
         // Get a list of all the folders inside default workspace.
         request.get('https://www.googleapis.com/drive/v2/files/', {qs:{q:'trashed=false and mimeType=\'application/vnd.google-apps.folder\' and \'' + wid + '\' in parents'}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
           if( body.error ){
                data = {status  : 1, message : body.error}
                console.log( data );
                res.send( JSON.stringify( data ) );
                return false;
           }
           var projects = JSON.parse(body).items;
           if( projects.length <= 0 ){
               result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
               '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
               '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
               '<div style="font-size:20px;text-align:center">Sorry you do not have any project at GoogleDrive to import</div><br><br>' +
               '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
               '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
               res.send( result );
               return false;
           }
           result = '<head><style>table{border-collapse: collapse;border: 1px solid #DFDFDF; background-color: #eee;}' +
           'table td{border:1px solid #dadada; color: #555; padding:5px;} ' +
           'table th{border:1px solid #aaa; color: #555; background-color:#aaa; padding:5px;}</style>'+
           '</head><body><center><img src="/images/mini-logo.png"/></center><br>' +
           '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
           '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
           '<div style="font-size:20px;text-align:center">Found following projects at GoogleDrive</div> ' +
           '<div style="font-size:16px;text-align:center; color:red;">Be careful before clicking on any of the actions</div><br><br> ' +
           '<table style="text-align: left;border:1px solid #000; width:100%;"><tr><th>P.N.</th><th>Project Name</th><th>Last Modified</th><th>Action</th><th>Action</th></tr>';
           var count = 0;
           projects.every( function(p){
              count = count + 1;
              result = result + '<tr><td>' + count + '</td><td>' + p.title + '</td><td>' + p.modifiedDate + '</td><td><a href="delete_googledrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Delete</a></td><td><a href="import_googledrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Import</a></td></tr>';
              return true;
           }); // Loop through all the projects
           result = result + '</table><br><br><center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="Quit" onclick="return quitBox(\'quit\');" /></div></center>' +
           '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script></body></html>';
           console.log("Found " + count + " project to list down");
           res.send( result );
           return false;
        });
      });
      });
   });
});
app.get('/delete_googledrive_project_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   console.log( "Project to delete " + onedrive_project_to_delete );
   // check CSRF token
   if (req.query.state !== generateCSRFToken(104)){
      return res.status(401).send(
      'CSRF token mismatch, possible cross-site request forgery attempt.'
      );
   } 
   request.post('https://accounts.google.com/o/oauth2/token', {form:{client_id:GOOGLE_CLIENT_ID, client_secret:GOOGLE_CLIENT_SECRET, code:req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      console.log( body );
         if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a token " + token );
      console.log( "Going to search for  workspace  - " + workspace );
      
      console.log( "Going to delete project " + googledrive_project_to_delete);
      request.del('https://www.googleapis.com/drive/v2/files/' + googledrive_project_to_delete + '?access_token=' + token, function (error, response, body){
         if( body.error ){
            data = {status  : 1, message : body.error}
            console.log( data );
            res.send( JSON.stringify( data ) );
            return false;
         }
         
         // Lets try to search for default workspace.
         request.get('https://www.googleapis.com/drive/v2/files', {qs:{q:'title=\'' + workspace + '\' and trashed=false and mimeType=\'application/vnd.google-apps.folder\''}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
            if( body.error ){
               data = {status  : 1, message : data.error}
               console.log( data );
               return res.end( JSON.stringify( data ) );
             }
             var wid = 0;
             if( JSON.parse(body).items[0] ){
                 wid = JSON.parse(body).items[0].id;
                 console.log("Found workspace...." + workspace);
                 console.log("Workspace id...." + wid);
             }
             if( wid <= 0 ){
               result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
               '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
               '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
               '<div style="font-size:20px;text-align:center">Sorry you do not have any more project at GoogleDrive to list down</div><br><br>' +
               '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
               '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
               console.log( "No workspace work for the onedrive user");
               res.send( result );
               return false;
            }
            // Get a list of all the folders inside default workspace.
            request.get('https://www.googleapis.com/drive/v2/files/', {qs:{q:'trashed=false and mimeType=\'application/vnd.google-apps.folder\' and \'' + wid + '\' in parents'}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
              if( body.error ){
                   data = {status  : 1, message : body.error}
                   console.log( data );
                   res.send( JSON.stringify( data ) );
                   return false;
              }
              var projects = JSON.parse(body).items;
              if( projects.length <= 0 ){
                  result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                  '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
                  '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
                  '<div style="font-size:20px;text-align:center">Sorry you do not have any more project at GoogleDrive to list down</div><br><br>' +
                  '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                  '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                  res.send( result );
                  return false;
              }
              result = '<head><style>table{border-collapse: collapse;border: 1px solid #DFDFDF; background-color: #eee;}' +
              'table td{border:1px solid #dadada; color: #555; padding:5px;} ' +
              'table th{border:1px solid #aaa; color: #555; background-color:#aaa; padding:5px;}</style>'+
              '</head><body><center><img src="/images/mini-logo.png"/></center><br>' +
              '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
              '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
              '<div style="font-size:20px;text-align:center">Found following projects at Google Drive</div> ' +
              '<div style="font-size:16px;text-align:center; color:red;">Be careful before clicking on any of the actions</div><br><br> ' +
              '<div style="font-size:16px;text-align:center; color:red;">Selected project has been deleted permanentaly</div><br><br> ' +
              '<table style="text-align: left;border:1px solid #000; width:100%;"><tr><th>P.N.</th><th>Project Name</th><th>Last Modified</th><th>Action</th><th>Action</th></tr>';
              var count = 0;
              projects.every( function(p){
                 count = count + 1;
                 result = result + '<tr><td>' + count + '</td><td>' + p.title + '</td><td>' + p.modifiedDate + '</td><td><a href="delete_googledrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Delete</a></td><td><a href="import_googledrive_project?state=' + req.query.state  + '&project=' + p.id + '&code=' + req.query.code + '\'">Import</a></td></tr>';
                 return true;
              }); // Loop through all the projects
              result = result + '</table><br><br><center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="Quit" onclick="return quitBox(\'quit\');" /></div></center>' +
              '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script></body></html>';
              console.log("Found " + count + " project to list down");
              res.send( result );
              return false;
           });
         });
      }); // Project deletion
   });
});
app.get('/import_googledrive_project_handler', function (req, res){
   if (req.query.error) {
      return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
   }
   console.log( "Project to import " + dropbox_project_to_import );
   console.log( "Code " + req.query.code );
   console.log( "CSRFT " + req.query.state );
   // check CSRF token
   if (req.query.state !== generateCSRFToken(103)){
      return res.status(401).send('CSRF token mismatch, possible cross-site request forgery attempt.');
   }
   // exchange access code for bearer token
   request.post('https://accounts.google.com/o/oauth2/token', {form:{client_id:GOOGLE_CLIENT_ID, client_secret:GOOGLE_CLIENT_SECRET, code:req.query.code, grant_type:"authorization_code", redirect_uri:generateRedirectURI(req)}}, function (error, response, body) {
      var data = JSON.parse(body);
      console.log( body );
         if(data.error){
         data = {status  : 1, message : data.error}
         console.log( data );
         return res.end( JSON.stringify( data ) );
      }
      // Extract bearer token
      var token = data.access_token;
      workspace = COMPILEONLINE;
      console.log( "Got a GoogleDrive token " + token );
      console.log( "Going to clean existing workspace");
      var result ;
     // Let's clean exiting workspace and then start downloading files.
     cleanDir( HOME );
     projecttitle = NEW_PROJECT_TITLE;
     request.get('https://www.googleapis.com/drive/v2/files/' + googledrive_project_to_import, { headers: {Authorization: 'Bearer ' + token} }, function (error, response, body) {
        projecttitle = JSON.parse(body).title;
        console.log( "Set project title " + projecttitle );
     });
     getFromGoogledrive(HOME, googledrive_project_to_import, token, res);
     // Take a pause and send message.
      setTimeout(function() {
         result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
         '<div style="font-size:22px;text-align:center">Your project has been imported successfully</div><br><br>' +
         '<div style="font-size:24px;text-align:center">' + googledrive_display_name + '</div>' +
         '<div style="font-size:14px;text-align:center">(' + googledrive_email_id + ')</div><br>' +
         '<div style="font-size:18px;text-align:center">Next step is, close this window and refresh your project</div>' +
         '<div style="font-size:18px;font-weight:bold;text-align:center">Project &gt; Refresh Project</div><br><br>' +
         '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
         '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
         data = {status  : 0, message : "Imported all the files successfully"}
         console.log( data );
         res.send( result );
         return false;
      }, 10000);
   });
});
function getFromGoogledrive(dir, pid, token, res ){
     // Get a list of all the files and folders available inside the given project folder.
     request.get('https://www.googleapis.com/drive/v2/files/', {qs:{q:'trashed=false and \'' + pid + '\' in parents'}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
        if( body.error ){
            result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
             '<div style="font-size:20px;text-align:center">' + body.error + '</div><br><br>' +
             '<div style="font-size:16px;text-align:center">Please try to import your project once again.</div><br><br>' +
             '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
             '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
             if( res ) {
                  res.send( result );
             }
             return false;
         }
         var data = JSON.parse(body).items;   
         data.forEach( function( file ) {
            console.log( "Got an entry "  + file.title );
            if( file.mimeType === 'application/vnd.google-apps.folder' ){
               var dirname = dir + "/" + file.title;
               console.log( "Creating directory -- " + dirname);
               fs.mkdirSync( dirname  );
               getFromGoogledrive( dirname, file.id, token, res );
            }else{
               console.log( "Writing file -- " + dir + "/" + file.title );
               request.get(file.downloadUrl, {encoding: null, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
                  if( body.error ){
                     result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                      '<div style="font-size:20px;text-align:center">' + body.error + '</div><br><br>' +
                      '<div style="font-size:16px;text-align:center">Please try to import your project once again.</div><br><br>' +
                      '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                      '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                      console.log(body.error);
                      if( res ) {
                          res.send( result );
                      }
                      return false;
                  }
                  var filename = dir + "/" + file.title;
                  fs.writeFile(filename, body, function (error){
                     if(error){
                        result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                        '<div style="font-size:20px;text-align:center">' + error + '</div><br><br>' +
                        '<center><div><input style="width:100px" type="button" name="Quit" id="Quit" value="OK" onclick="return quitBox(\'quit\');" /></div></center>' +
                        '<script>function quitBox(cmd){if (cmd===\'quit\'){open(location, \'_self\').close();}return false;}</script><body></html>';
                        console.log(error);
                        if( res ) {
                            res.send( result );
                        }
                        return false;
                     }
                     if( filename === COL_CONF_FILE ){
                          var obj = JSON.parse( body );
                          language = obj;
                          console.log( "Language ID of the imported project : " + obj.id );
                     }
                  }); //fs.writeFile
               }); // request.get()
            } //  node.is_dir
         }); // contents.forEach(
   });
}
//* ================================================================ COMPILEONLINE Aka GOOGLE DRIVE INTERFACE GOES HERE ============================================================*//
//require('request').debug = true;

var compileonline_project_to_share;
app.post('/share_project', function (req, res){

    var tokenProvider = new GoogleTokenProvider({
      'refresh_token': GOOGLE_REFRESH_TOKEN,
      'client_id' : GOOGLE_WEBCLIENT_ID,
      'client_secret': GOOGLE_WEBCLIENT_SECRET
    });
   workspace = COMPILEONLINE;

      tokenProvider.getToken(function(error, token){
      console.log( "Got google token " + token );
      // Lets get a list of all the directories and files
      var fileList = getFileList(HOME);
      var filecount = fileList.length;

      console.log( "Total files & directories to be uploaded " + filecount );
      console.log( "Project Title " + projecttitle );
      // Create this project in the root and it will be moved to workspace after verification.

      console.log( "Create a new project to be shared");
      request.post('https://www.googleapis.com/drive/v2/files', { json:{title:projecttitle, description:projecttitle, indexableText:{text:projecttitle}, permissions:['anyone'], properties: [{key:'client_ip_address', value:client_ip_address, visibility:'PRIVATE'}],  parents:[{id:'root'}], mimeType:'application/vnd.google-apps.folder'}, headers: {Authorization: 'Bearer ' + token, 'Content-type':'application/json'} }, function (error, response, body) {
         if( body.error ){
            data = {status  : 1, message : body.error}
            console.log( data );
            res.send( JSON.stringify( data ) );
            return false;
         }
         // New project creation.
         console.log( "Project ID " +  body.id);
         console.log( "Created new project from scratch");
         console.log( "Project Name " + body.title);
         init = 0;
         compileonline_project_to_share  = WEBSITE + "/col/" + "view_project.php?LANG=" + language.id + "&PID=" + body.id;
         // Let's prepare URL to be shared.
         shareAtGoogledrive(HOME, body.id, token, filecount, res);
      });
   });
});// main function entry.

function shareAtGoogledrive(dir, pid, token, count, res){
    var list = fs.readdirSync(dir);
    list.map(function(file) {
        var basename = file;    
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()){
            request.post('https://www.googleapis.com/drive/v2/files', {json:{title:basename, parents:[{id:pid}], mimeType:'application/vnd.google-apps.folder'}, headers:{ Authorization: 'Bearer ' + token, 'Content-type':'application/json' }}, function (error, response, body) {
               if( body && body.error ){
                  data = {status  : 1, message : body.error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               console.log( "Created directory " + file);
               init++;
               console.log( "Current init " + init + " final count is " + count );
               if( init == count ){
                  // Create a short URL.
                  request.post('https://www.googleapis.com/urlshortener/v1/url', {json:{longUrl:compileonline_project_to_share}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
                      result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                      '<div style="font-size:22px;text-align:center">Project URL for Public Sharing</div><br><br>' +
                     '<script type="text/javascript" src="//s7.addthis.com/js/300/addthis_widget.js#pubid=ra-544a252d2abdc963" async="async"></script>'+
                      '<center><div class="addthis_sharing_toolbox" data-url="' + body.id + '" data-title="Check it @ compileonline"></div></center><br>' +
                      '<div style="font-size:18px;text-align:center; font-weight:bold">'+  body.id +'</div><br><br>' +
                      '<center><div><input style="width:100px" type="button" value="OK" onclick="closeSign()" /></div></center>';
                      data = {status  : 0, message : "Pushed all the files successfully"}
                      console.log( data );
                      res.send( result );
                      return true;
                  });
               }
               shareAtGoogledrive(file, body.id, token, count, res);
            });
        } else {
            fs.readFile( file,  function(error, content){
               if( error ){
                  data = {status  : 1, message : error}
                  console.log( data );
                  res.send( JSON.stringify( data ) );
                  return false;
               }
               if( uploadsize + stat.size > DATA_TRANSFER_QUOTA ){
                 response = 'Sorry, you do not have sufficient quota for data transfer';
                 console.log( response );
                 res.send( response );
                 return true;
               }
               request.post('https://www.googleapis.com/upload/drive/v2/files', {qs:{'uploadType': 'multipart'}, headers:{ Authorization: 'Bearer ' + token}, multipart:[{'Content-Type': 'application/json; charset=UTF-8', body:JSON.stringify({title:basename, parents:[{id:pid}]})}, {body: content}]},  function (error, response, body) {
                  if( body && body.error ){
                     data = {status  : 1, message : body.error}
                     console.log( data );
                     res.send( JSON.stringify( data ) );
                     return false;
                  }
                  console.log( "Saved file " + file);
                  init++;
                  uploadsize = uploadsize + stat.size ;
                  console.log( "Current init " + init + " final count is " + count );
                  if( init == count ){
                         // Create a short URL.
                         request.post('https://www.googleapis.com/urlshortener/v1/url', {json:{longUrl:compileonline_project_to_share}, headers:{ Authorization: 'Bearer ' + token}}, function (error, response, body) {
                             result = '<html><body><center><img src="/images/mini-logo.png"/></center><br><br>' +
                             '<div style="font-size:22px;text-align:center">Project URL for Public Sharing</div><br><br>' +
                             '<script type="text/javascript" src="http://s7.addthis.com/js/300/addthis_widget.js#pubid=ra-544a252d2abdc963" async="async"></script>' +
                             '<center><div class="addthis_sharing_toolbox" data-url="' + body.id + '" data-title="Check it @ compileonline"></div></center><br>' +
                             '<div style="font-size:18px;text-align:center; font-weight:bold">'+  body.id +'</div><br><br>' +
                             '<center><div><input style="width:100px" type="button" value="OK" onclick="closeSign()" /></div></center></html></body>';
                             data = {status  : 0, message : "Pushed all the files successfully"}
                             console.log( data );
                             res.send( result );
                             return true;
                         });
                    }
               });
            });
        }
    });
}
function getSharedProject(sharedpid){
    googledrive_project_to_import = sharedpid;

    console.log( "Going to fetch project id : " + googledrive_project_to_import );

    var tokenProvider = new GoogleTokenProvider({
      'refresh_token': GOOGLE_REFRESH_TOKEN,
      'client_id' : GOOGLE_WEBCLIENT_ID,
      'client_secret': GOOGLE_WEBCLIENT_SECRET
    });
   tokenProvider.getToken(function(error, token){
      console.log( "Got google token " + token );
      workspace = COMPILEONLINE;
      console.log( "Got a GoogleDrive token " + token );
      console.log( "Going to clean existing workspace ");
      var result ;
     // Let's clean exiting workspace and then start downloading files.
     projecttitle = NEW_PROJECT_TITLE;
     request.get('https://www.googleapis.com/drive/v2/files/' + googledrive_project_to_import, { headers: {Authorization: 'Bearer ' + token} }, function (error, response, body) {
         var data = JSON.parse( body );
         if( data.error ){
              console.log(data.error);
              return;
         }
         cleanDir( HOME );
         projecttitle = JSON.parse(body).title;
         console.log( "Set project title " + projecttitle );
         getFromGoogledrive(HOME, googledrive_project_to_import, token, false);
     });
   });
}
