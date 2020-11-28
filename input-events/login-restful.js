'use strict';

const { Broadcast, Config, EventUtil, Logger } = require('ranvier');
const CommonFunctions = require('../lib/CommonFunctions');
const LoggedOffEventsManager = require('../lib/LoggedOffEventsManager');

module.exports = {
  event: state => (socket, args) => {

    let name = "";
    if (args && args.name) {
        name = args.name.toString().trim();
    }
    Logger.log('Logging in user ' + name);

    let playerloadedcallback = () => { return; };
    if (args && args.playerloadedcallback) {
        playerloadedcallback = args.playerloadedcallback;
    }
    

    const invalid = CommonFunctions.validateName(name);
    if (invalid) {
        socket.write(invalid + '\r\n');
        return socket.emit('login', socket);
    }

    name = name[0].toUpperCase() + name.slice(1);

    let account = this.loginAccount(name, state, socket, playerloadedcallback);   
    
    

    return;

  }
};


exports.loginAccount = async function(accountname, state, socket, playerloadedcallback) {
    const pm = state.PlayerManager;

    try {
        Logger.log(`Account Loading for ${accountname}.`);
        let account =  await state.AccountManager.loadAccount(accountname);
        if (!account || typeof account==="undefined") {
            Logger.error(`No account found as ${accountname}.`);
            //return socket.emit('create-account', socket, name);
            //socket.end();
            return;
        }
    
        if (account.banned) {
            socket.write('This account has been banned.\r\n');
            //socket.end();
            return;
        }
    
        if (account.deleted) {
            socket.write('This account has been deleted.\r\n');
            //socket.end();
            return;
        }
        Logger.log('Socket: ' + socket);
        Logger.log('Account: ' + account.username);
    
        //return socket.emit('password', socket, { dontwelcome: false, account });
        let characters = account.characters.filter(currChar => currChar.deleted === false);
        let charnames = [];
        characters.forEach(char => {
            charnames.push(char);
        });
        Logger.log(charnames);
        //login first on list
        let char = charnames[0];
        Logger.log('Selected character is ' + char.username);
        
        let currentPlayer = pm.getPlayer(char.username);
        let existed = false;
        
        if (currentPlayer) {
            existed = true;
            // kill old connection
            Broadcast.at(currentPlayer, 'Connection taken over by another client. Goodbye.');
            currentPlayer.socket.end();
    
            // link new socket
            currentPlayer.socket = socket;
            Broadcast.at(currentPlayer, 'Taking over old connection. Welcome.');
            //Broadcast.prompt(currentPlayer);
            Logger.log("Character reconnected to new RESTful connection " + currentPlayer.name + " in " + currentPlayer.room + " with socket " + socket);

            //player is already hydrated
            currentPlayer.socket.emit('commands', currentPlayer);
            //Broadcast.prompt(currentPlayer);
            playerloadedcallback(currentPlayer);
            currentPlayer.emit('login');
            
            return currentPlayer;
        }
    
        Logger.log("Character Loading... ");
        currentPlayer =  await state.PlayerManager.loadPlayer(state, account, char.username);
        currentPlayer.socket = socket;
        Logger.log("Character Loaded " + currentPlayer.name + " in " + currentPlayer.room + " with socket " + socket);

        const loggedOffEventsManager = new LoggedOffEventsManager(state); 
        currentPlayer = await loggedOffEventsManager.load(currentPlayer);

        socket.emit('hydrate-player', socket, { player: currentPlayer, callback: 
            () => {
                state.CommandManager.get('look').execute(null, currentPlayer);
                currentPlayer.socket.emit('commands', currentPlayer);
                //Broadcast.prompt(currentPlayer);
                
                playerloadedcallback(currentPlayer);
                currentPlayer.emit('login');
        }});
        return currentPlayer;
    } catch (e) {
        Logger.error(e.message);
        return null;
    }
};