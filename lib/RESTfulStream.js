'use strict';

const { TransportStream } = require('ranvier');
const { Logger, Player } = require('ranvier');
const LoggedOffEventsManager = require('./LoggedOffEventsManager');
const Convert = require('ansi-to-html');


/**
 * Attach https REST calls to data stream - need to connect, log in, do the thing, and record
 */
class RESTfulStream extends TransportStream
{

  constructor(state) {
    super();
    this._writable = false;
    this._state = state;
    this._player = null;
    this._writemode = "html"; // json can be set also
    this.LoggedOffEventsManager = null;
  }

  attach(socket) {
    super.attach(socket);
    Logger.log('socket writableEnded: ' + socket.writableEnded);
    this._writable = !socket.writableEnded;
  }

  setWriteMode(mode) {
    this._writemode = mode;
  }

  login(username, state, callback) {
    const p = this.emit('login-restful', this, { name: username, 
      playerloadedcallback: (player) => {
        Logger.log("callback to RESTful Stream made, initiating LoggedOffEventsManager for " + player.name);
        this._player = player;
        this.LoggedOffEventsManager = new LoggedOffEventsManager(state); 
        // initialize a local version.
        // this similar to what happens in the loading player class already, except
        // this manager is needed to wire-up events happening after the closed stream,
        // but the player is still logged in.
        // when login-restful runs, it should be setting up and loading the events to
        // the player object already.
        

        if(this.LoggedOffEventsManager.hasEvents(player))
        {
          this.LoggedOffEventsManager.readbackAndDelete(player);
        }

        // now, if callback exists, do that.
        if(callback)
        {
          callback();
        }

      }
    });
    Logger.log('p: ' + p);
  }


// commented  because when set the write function doesn't get called??
  // get writable() {
  //   return this._writable;
  // }

  write(message) {
    //Logger.write("writing message " + message);
    if (!this._writable) {
      Logger.log("tried to write to closed stream");

      if(this.LoggedOffEventsManager)
      {
        Logger.log("moving message to logged off events");
        if(this._player && !message.includes("Connection taken over") )
        {
          message = message.replace(/^\s+/, '').replace(/\s+$/, ''); // trim white space
          if (message!=="") { // not white space
            this.LoggedOffEventsManager.add(this._player, message, "textoutput");
            Logger.log(this._player.loggedOffEvents.length + " messages waiting for " + this._player.name);
          }
        }
      }

      return;
    }
    
    
    const convert = new Convert();
    var htmlversion = convert.toHtml(message);
    const regexRemoveMapAndUnicode = /(?:(- . -.*?- . -)|\x1b\[[0-9;]*[a-zA-Z])/g;
    var textonlyversion = message.replace(regexRemoveMapAndUnicode, '');
    //Logger.log("html version " + htmlversion);

    if(this._writemode==="html")
    {
      this.socket.write(
        "<div class=\"stdout\"><pre>" +
        htmlversion.replace(/(?:\r\n|\r|\n)/g, '<br />') + //line breaks
        "</pre></div>"
      );
    }
    else if (this._writemode==="json")
    {
      this.socket.write(
        JSON.stringify({
          type: 'message',
          textonlyversion,
          htmlversion})
      );
    }
    else {
      this.socket.write(textonlyversion);
    }  
    
  }

  pause() {
    this.socket.pause();
    this._writable = false;
  }

  resume() {
    this.socket.resume();
    this._writable = true;
  }

  end() {
    // this is called by Express when result is returned
    // so it marks the stream not writable, but doesn't
    // close the player's login - allows redirected actions 
    Logger.log("end function on RESTful stream called, stream was writable? " + this._writable);
    if(this._writable)
    {
      this._writable = false;
      
    }
  }

  executeSendData(group, data) {
    if(group!=="attributes")
    {
      Logger.log('RESTful stream asked to send ' + data + ' to ' + group);
    }
    if (!this._writable) {
      if(group!=="attributes" && this._player)
      {
        this.LoggedOffEventsManager.add(this._player, data, group);
      }
      return;
    }

    const message = JSON.stringify({
      type: 'data',
      group,
      data
    });
    const convert = new Convert();
    var htmlversion = convert.toHtml(message).replace(/\:\{/g, ":<br />{").replace(/\",/g, "\",<br />");
    //const regexRemoveMapAndUnicode = /(?:(- . -.*?- . -)|\x1b\[[0-9;]*[a-zA-Z])/g;
    var textonlyversion = message;
    //Logger.log("html version " + htmlversion);

    if(this._writemode==="html")
    {
      this.socket.write(
        "<div class=\"dataout\">" +
        htmlversion.replace(/(?:\r\n|\r|\n)/g, '<br />') + //line breaks
        "</div>"
      );
    }
    else if (this._writemode==="json")
    {
      this.socket.write(
        JSON.stringify({
          type: 'data',
          group,
          data
        }));
    }
    else {
      this.socket.write('{DATA: ' + textonlyversion + "}");
    }  

  }


  
}

module.exports = RESTfulStream;
