'use strict';

/**
 * Things that happened after the Player was last logged in and results reported out
 * through the resful interface.  There is a buffer of time where things can still be happening
 * based on the system time out found in ranvier.json for a player, and the buffered time
 * that is currently in restful-networking/express.js where a response is required quickly
 * but the results of Player actions may be continuing after that initial response.
 *
 *
 * @property {string} type the stream or type
 * @property {string} message main "printable" content
 * @property {object} metadata any custom info for this attribute
 */
class LoggedOffEvent {
  /**
   * @param {string} type="textoutput"
   * @param {string} message=""
   * @param {object} metadata={}
   */
  constructor(type="textoutput",message="",metadata = {}) {
    // put validation here, like type validation
    this.type = type;
    this.message = message;
    this.metadata = metadata;
  }

  serialize() {
    const { type, message, metadata } = this;
    return { type, message, metadata };
  }
}


module.exports = LoggedOffEvent;
