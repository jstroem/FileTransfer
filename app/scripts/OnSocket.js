define([''], function() {
	/** Internal Events: 
			Socket:Close(CloseEvent)
			Socket:Error(ErrorEvent)
			Socket:Open(OpenEvent)
			Socket:SyntaxError(Error)

	WebSocket messages follows the syntax: {e: String, args: Array}
	where `e` is the event and args is a array of arguments

	**/

	var OnSocket = function(url){
		var webSocket = null;
		var events = {};
		var open = null;
		var pending = [];

		var onclose = function(e){
			open = null;
			this.trigger('Socket:Close',e);
		}

		var onerror = function(e) {
			this.trigger('Socket:Error',e);
		}

		var onopen = function(e) { 
			open = e;
			this.trigger('Socket:Open',e);
			//Send all pendings
			for(var i = 0; i < pending.length; i++){
				webSocket.send(pending[i]);
			}
			pending=[];
		}

		var onmessage = function(e) {
			var msg = null;
			try {
				msg = JSON.parse(e.data);
			} catch(e){
				this.trigger('Socket:SyntaxError',e);
			}
			if (typeof msg.e === "string" && msg.args instanceof Array) {
				this.trigger(msg.e,msg.args);
			} else {
				this.trigger('Socket:SyntaxError',e);
			}
		}

		if (OnSocket.runnable()){
			var self = this;
			webSocket = new WebSocket(url);
			webSocket.onclose = function(e) { onclose.call(self,e) };
			webSocket.onerror = function(e) { onerror.call(self,e) };
			webSocket.onopen = function(e) { onopen.call(self,e) };
			webSocket.onmessage = function(e) { onmessage.call(self,e) };

			this.close = function(){
				webSocket.close();
			}

			this.send = function(e,args,wait){
				if (wait === undefined || wait === null) wait = true;
				if (!(args instanceof Array)) args = [args];
				if (!open){
					if (wait) pending.push(JSON.stringify({e: e, args: args}));
				} else {
					webSocket.send(JSON.stringify({e: e, args: args}));	
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
				if (e === 'Socket:Open' && open !== null) succ(open); //The socket is already open
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
	}

	OnSocket.runnable = function() {
		return WebSocket && JSON && true;
	}
	
	return OnSocket;
});