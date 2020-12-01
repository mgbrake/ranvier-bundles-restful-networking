'use strict';
const { Logger } = require('ranvier');
const LoggedOffEvent = require('./LoggedOffEvent');

/**
 * Container for a list of logged events for a {@link Player}
 *
 * @extends Array
 */
class LoggedOffEvents extends Array
{
  constructor(init) {
    init = Object.assign({
      loggedOffEvents: []
    }, init);

    super();
    (init.loggedOffEvents).forEach(element => {
      //Logger.log(`adding message back: ${element}: ${element.type}, ${element.message}, ${element.metadata}`)
      while(Array.isArray(element))
      {
        element = element[0]; // fixing this weird thing where it's nesting arrays in arrays
      }
      if(element)
      {
        const loe = new LoggedOffEvent(element.type, element.message, element.metadata);
        this.add(loe);
      }
    });
  }
  /**
   * @param {LoggedOffEvent} loggedOffEvent
   */
  add(loggedOffEvent) {
    this.push(loggedOffEvent);
  }

  clear() {
      while(this.length>0)
      {
          this.pop();
      }
  }


  /**
   * Gather data that will be persisted
   * @return {Object}
   */
  serialize() {
    let data = {
      loggedOffEvents: []
    };
    for(const loe of this)
    {
      //Logger.log('item from array: ' + loe)
      data.loggedOffEvents.push(loe);
    }
    // [...this].forEach(([loggedOffEvent]) => {
    //   data[this.indexOf(loggedOffEvent)] = loggedOffEvent.serialize();
    // });

    return data;
  }
}

module.exports = LoggedOffEvents;
