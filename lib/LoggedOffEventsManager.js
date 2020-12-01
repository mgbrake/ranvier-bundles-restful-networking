'use strict';

const {Broadcast, Data, Logger, Metadatable, Player } = require('ranvier');
const EventEmitter = require('events');
const LoggedOffEvents = require('./LoggedOffEvents');
const LoggedOffEvent = require('./LoggedOffEvent');
const fs = require('fs');



class LoggedOffEventsManager extends Metadatable(EventEmitter) {
constructor(state) {
    super();
    // reads the loader info from ranvier.json file at the top level
    this.loader = state.EntityLoaderRegistry.get('loggedOffEvents'); 
    this.dataPath = this.loader.config.path || `${__dirname}/../data/loggedOffEvents`;
    Logger.log(`loader dataPath set ${this.dataPath}`);
  }

  
  // /**
  //  * Proxy all events on this back to effects.
  //  * If logged off while glowing, still glowing
  //  * @param {string} event
  //  * @param {...*}   args
  //  */
  // emit(event, ...args) {
  //   super.emit(event, ...args);

  //   this.effects.emit(event, ...args);
  // }

  hasEvents(player)
  {
    Logger.log("checking if player has events");
    return player && player.loggedOffEvents && (player.loggedOffEvents instanceof Array) && player.loggedOffEvents.length>0;
  }

  summarize(player) {
    Logger.log("summarize called");
    this.emit('data', `Logged off events include ${player.loggedOffEvents.length} entries.`);
    //TO DO: add feedback about types of entries and get the net effects.
    // for instance, 2 textoutput entries, 3 movement of characters or NPCs through your room, 12 combat entries,
    // and 2 defeated monster entries, spanning 4 minutes.  Then you were logged out for inactivity.
    //  If there isn't a logout yet and the session has resumed, well, tbd
  }

  add(player, data, eventgroup="textoutput") {
    Logger.log("add called");
    const loe = new LoggedOffEvent(eventgroup, data, { datetime: Date.now() });
    player.loggedOffEvents.add(loe);
    this.save(player);
  }

  readbackAndDelete(player)
  {
    Logger.log("readbackAndDelete called");
    Broadcast.at(player, 'Since last connection... ');
    if(!player.loggedOffEvents || player.loggedOffEvents.length<=0)
    {
      Broadcast.at(player, 'nothing happened.');
    }
    player.loggedOffEvents.forEach( (logoffevent) => {
      Broadcast.at(player, `${logoffevent.message}`);
      player.emit('data', `${logoffevent.type}: ${logoffevent.message}`);
    });
    player.loggedOffEvents.clear();
    this.save(player);
  }

    /**
   * @param {string} name
   * @return {boolean}
   */
  exists(name) {
    let exCk = false;
    //Logger.log(JSON.stringify(this.loader));
    if(this.loader&&this.loader.dataSource.name.startsWith('Json'))
    {
      exCk = fs.existsSync(this.dataPath + `/${name}.json`);
    } else if(this.loader&&this.loader.dataSource.name.startsWith('Yaml'))
    {
      exCk = fs.existsSync(this.dataPath + `/${name}.yaml`);
    }

    Logger.log(`checking for appropriate file named ${name}: ${exCk}`);
    return exCk;
  }

   /**
   * Load logged off events for a single player
   * @param {Player} player
   * @return {Player}
   */
  async load(player)
  {
    if (!this.loader) {
      throw new Error('No entity loader configured for loggedOffEvents');
    }
    if (!player) {
      throw new Error('No player was passed to the loggedOffEventsManager');
    }
    
    Logger.log("loadLoggedOffEvents called");
    // wire up the save function here to the player saved signal
    player.on('saved', async() => {
      this.save(player);
    });
    
    // check for presense of file/data
    if(!this.exists(player.name)) // no entry for this player yet
    {
      Logger.log("player: " + player.name + " new LoggedOffEvents initiated");
      player.loggedOffEvents = new LoggedOffEvents();
      return player;
    }
    // else, data exists, time to load it.
    try {
      const data = await this.loader.fetch(player.name);
      Logger.log("data retreived: " + data); 
      let loggedOffEvents = new LoggedOffEvents(data);
      Logger.log(" recreated: " + loggedOffEvents.length + " " + loggedOffEvents.serialize());
      player.loggedOffEvents = loggedOffEvents;
    } catch (e) {
      Logger.error(`problem loading for ${player.name}, ${e}`);
    }
    // called a hydrate elsewhere because the hydrate also remakes connections.  
    // I don't think it's necessary if by attaching the LoggedOffEvents object to 
    // the player is enough to get it to write that data as part of the save.
    // That's why both the LoggedOffEvents array and the individual LoggedOffEvent
    // items need a serialize function.  So in theory, shouldn't need to do anything
    // here.

    return player;
  }

  /**
   * Save loggedOffEvents
   */
  async save(player) {
    if (!this.loader) {
      throw new Error('No entity loader configured for players');
    }
    if(typeof player.loggedOffEvents === 'undefined' || !player.loggedOffEvents instanceof Array)
    {
      throw new Error(`No loggedOffEvents loaded for player ${player.name}`);
    }

    
    Logger.log("save called");

    await this.loader.update(player.name, player.loggedOffEvents.serialize());

 
  }
  

}

module.exports = LoggedOffEventsManager;