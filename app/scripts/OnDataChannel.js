define([], function() {
	/** Internal events: 
			DataChannel:Close(CloseEvent)
			DataChannel:Error(ErrorEvent)
			DataChannel:Open(OpenEvent);
			DataChannel:SyntaxError(Error);
			DataChannel:SendSuccess(Event,Arguments);
			DataChannel:Received;

	DataChannel messages follows the syntax: {e: String, args: Arrayr}
	where `e` is the event and args is a array of arguments
	**/

	var OnDataChannel = function(channel,reliable){
		var events = {};
		var open = null;
		var messageId = 0;

		var sendNotAccepted = {};
		var receiverlastSeenMessageId = 0;
		var lastSeenMessageId = 0;
		var lastSendMessageId = 0;

		var checkQueueTimer = null;
		/** If the channel is stalling we sleep this amount of miliseconds
			If the channel keeps stalling we increasing the timeout **/
		var defaultTimeout = 200; 
		var timeout = 0; 

		if (reliable === undefined || reliable === null) reliable = true;

		var self = this;

		var onclose = function(e){
			open = null;
			this.trigger('DataChannel:Close',e);
		}

		var onerror = function(e) {
			this.trigger('DataChannel:Error',e);
		}

		var onopen = function(e) { 
			open = e;
			this.trigger('DataChannel:Open',e);
			checkQueue();
		}

		var	acknowledgement = function(args){
			var acknowledgedMessageId = args[0];
			if (receiverlastSeenMessageId + 1 === acknowledgedMessageId) {
				//This acknowledgement is for the next message in the line
				self.trigger('DataChannel:SendSuccess', [sendNotAccepted[acknowledgedMessageId].e, sendNotAccepted[acknowledgedMessageId].args]);
				delete sendNotAccepted[acknowledgedMessageId]; //It is now accepted
				receiverlastSeenMessageId = acknowledgedMessageId;
				//Just send the next without waiting
				timeout = 0;
				sendNextItem();
			}
		}

		var sendNextItem = function(){
			if (receiverlastSeenMessageId < messageId) { 
				//Must be something in the queue so we try to send it again
				lastSendMessageId = receiverlastSeenMessageId + 1;
				channel.send(JSON.stringify(sendNotAccepted[receiverlastSeenMessageId + 1]));
			}
		}

		var updateTimeout = function(){
			if (receiverlastSeenMessageId < messageId) {

			} else {
				timeout = 0;
			}
		}

		var checkQueue = function(){
			if (checkQueueTimer === null) { //This ensures that we dont start multiple timeouts
				if (receiverlastSeenMessageId < messageId) { //something needs to be send
					var prevLastSendMessageId = lastSendMessageId;
					sendNextItem();
					if (prevLastSendMessageId === lastSendMessageId){
						timeout += defaultTimeout;
					} else {
						timeout = defaultTimeout;
					}
					checkQueueTimer = setTimeout(function(){
						checkQueueTimer = null;
						checkQueue();
					},timeout);
				} else if (receiverlastSeenMessageId === messageId) { //everything is send
					clearTimeout(checkQueueTimer);
					checkQueueTimer = null;
				}
			}
		}

		var onmessage = function(e) {
			var msg = null;
			try {
				msg = JSON.parse(e.data);
			} catch(err){
				this.trigger('DataChannel:SyntaxError',e.data);
				return;
			}
			if (typeof msg['e'] === "string" && msg['args'] instanceof Array && typeof msg['mid']  === "number") {
				if (reliable) {
					if (msg.e === 'DataChannel:Received') {
						acknowledgement(msg.args);
						checkQueue();
					} else {
						if (lastSeenMessageId + 1 === msg.mid) { //Message is the next in line
							lastSeenMessageId = msg.mid;
							this.send('DataChannel:Received',msg.mid);
							this.trigger(msg.e,msg.args);		
						} else if (lastSeenMessageId + 1 < msg.mid) {
							this.send('DataChannel:Received',msg.mid);
						}
					}
				} else {
					this.trigger(msg.e,msg.args);
				}
			} else {
				this.trigger('DataChannel:SyntaxError',msg);
			}
		}

		channel.onclose = function(e) { onclose.call(self,e) };
		channel.onerror = function(e) { onerror.call(self,e) };
		channel.onopen = function(e) { onopen.call(self,e) };
		channel.onmessage = function(e) { onmessage.call(self,e) };

		this.close = function(){
			channel.close();
		}

		this.send = function(e,args){
			if (!(args instanceof Array)) args = [args];
			if (!open){
				if (reliable) {
					var msg = {e: e, args: args, mid: ++messageId};
					sendNotAccepted[msg.mid] = msg;
				}
			} else {
				if (reliable) {
					if (e === 'DataChannel:Received') {
						var msg = {e: e, args: args, mid: 0};
						channel.send(JSON.stringify(msg));
					} else {
						var msg = {e: e, args: args, mid: ++messageId};
						sendNotAccepted[msg.mid] = msg;
						//New item in the queue so lets check if we can do something
						checkQueue();
					}
				} else {
					var msg = {e: e, args: args, mid: 0};
					channel.send(JSON.stringify(msg));
				}
			}
		}

		this.trigger = function(e){
			if (events[e]) {
				for(var i = 0; i < events[e].length; i++){
					events[e][i].apply(self,arguments[1]);
				}
			}
		}

		this.on = function(e,succ) {
			if (typeof succ === 'function'){
				if (!events[e]) events[e] = [];
				events[e].push(succ);
			}
			if (e === 'DataChannel:Open' && open !== null) succ(open); //The socket is already open
		}

		this.bind = this.on;

		this.unbind = function(e,succ) {
			if (succ === undefined) {
				//Remove everyone if there is some
				if (events[e]) events[e] = [];
			} else if (typeof succ === 'function') {
				if (events[e]){
					for(var i = 0; i < events[e].length; i++){
						if (events[e][i] === succ) events[e].splice(i,1);
					}
				}
			}
		}
	}
	
	return OnDataChannel;
});