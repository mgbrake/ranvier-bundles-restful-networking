'use strict';

// import 3rd party websocket library
const express = require('express');
const bodyParser = require('body-parser');
const { promisify } = require('util');

const { Logger } = require('ranvier');

// import our adapter
const RESTfulStream = require('../lib/RESTfulStream');

module.exports = {
  listeners: {
    startup: state => function (commander) {
      // create a new express server
      const app = express();

      var options = {
        //TODO: figure out path to these
        key: null, //fs.readFileSync('/path/to/key.pem'), // not sure where this is right now...
        cert: null//fs.readFileSync('/path/to/cert.pem')
      };
      
      //http.createServer(app).listen(80);
      //https.createServer(options, app).listen(443);

      const startServer = async () => {
        const port = 80; //process.env.SERVER_PORT || 3000
        await promisify(app.listen).bind(app)(port);
        Logger.log(`RESTful Listening on port ${port}`);
      }

      const connect = (req, res) => {
         // create our adapter
         const stream = new RESTfulStream();
         stream.attach(res);
         res.write(`<html><head><title>Ranvier RESTful</title>
         <!-- CSS --> 
         <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
         <!-- jQuery and JS bundle w/ Popper.js -->
         <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
         <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>
         <style>
          pre { margin: 0px; background-color: black; color: white !important; }
          .stdout{ margin: 0px; padding: 5px; width: 100%; background-color: black; color: white; } 
          .dataout{ margin: 0px; padding: 5px; width: 100%; background-color: lightblue; color: black; } 
          /* Sticky footer styles
          -------------------------------------------------- */
          html {
            position: relative;
            min-height: 100%;
          }
          body {
            margin-bottom: 60px; /* Margin bottom by footer height */
          }
          .footer {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 60px; /* Set the fixed height of the footer here */
            line-height: 60px; /* Vertically center the text there */
            background-color: #f5f5f5;
          }
         </style>
         <script>
            jQuery(document).ready(()=>{
              jQuery('.stdout').appendTo(jQuery('#mainset'));
              jQuery('.dataout').appendTo(jQuery('#dataset'));
            });
         </script>
         <body>
            <ul class="nav nav-tabs" id="tabset" role="tablist">
              <li class="nav-item">
                <a class="nav-link active" id="mainset-tab" data-toggle="tab" href="#mainset" role="tab" aria-controls="mainset" aria-selected="true">Main</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" id="dataset-tab" data-toggle="tab" href="#dataset" role="tab" aria-controls="dataset" aria-selected="false">Data</a>
              </li>
            </ul>
            <div class="tab-content" id="tabcontent">
              <div class="tab-pane fade show active" id="mainset" role="tabpanel" aria-labelledby="mainset-tab"></div>
              <div class="tab-pane fade" id="dataset" role="tabpanel" aria-labelledby="dataset-tab"></div>
            </div>
            `
         );
 
         // Register all of the input events (login, etc.)
         state.InputEventManager.attach(stream);
         stream.on('error', (err) => {
           Logger.log(err);
         });
         stream.on('data', (data) => {
           Logger.log("Received some data. " + data);
           res.write(data);
         });
         
         stream.on('end', (data) => {
          stream.write('</body></html>');
           stream.end();
           Logger.log("End signal found.  Sending Success");
             res.status(200).send();
         });
         //set a maximum amount of time to watch stream before returning
         setTimeout(() => {
           Logger.log("Time limit reached, sending response now.");
           stream.emit('end');
       }, 5000);
         Logger.log("User connected via RESTfulStream...");

         return stream;
      }

      const prompt = (stream) => {
        const form = `
        <div class="footer">
        <form method="post" action="action" id="commandform">
          <label for="commandinput">Your move: </label>
          <input type="text" autocomplete="off" name="command" id="command" placeholder="help or <direction> or open <item>" />
          <input type="submit" value="go" title="hint: type something in the text box, press tab to select this button, and press enter to submit" />
        </form>
        </footer>
        `;
        stream.write(form);
      }


      startServer();

      /*********
       * HELLO
       */
      // This creates the first login point
      app.get('/hello', (req, res) => {
        // request is a readable stream, response is a writable stream
        
        const stream = connect(req, res);

        stream.emit('intro-restful', stream);
        stream.login('User', state);  // TODO: replace with actual person username from OAuth
        prompt(res);
        
        //res.write('hello world')
      });

      /********
       * ACTION
       */
      // Main looping processing point
      app.post('/action', (req, res) => {
        

      app.use(bodyParser.urlencoded({ extended: false }));
      
        const stream = connect(req, res);
        stream.login('User', state,
          ()=>{
            Logger.log("Callback to command interp in action method reached.");
            // callback function to pass the command, AFTER being logged in.
            let commandstring = "";
            try {
              commandstring = req.body.command;
            }
            catch {}

            if(commandstring)
            {
              res.write("> " + commandstring);
              stream.write(commandstring);
            }
            else {
              stream.write("command didn't work.  " + JSON.stringify(req));
            }
            prompt(res);
          }
        );  // TODO: replace with actual person username from OAuth

        

        
        
        //res.write('hello world')
      });
      
    },

    shutdown: state => function () {
      // no need to do anything special in shutdown
    },
  }
};
