define([''], function() {

	var Eventify = function(context){
		var events = {};
		var self = this;

		context.trigger = function(e){
			if (events[e]) {
				for(var i = 0; i < events[e].length; i++){
					var args = arguments[1];
					if (!(args instanceof Array)) args = [arguments[1]];
					events[e][i].func.apply(context,args);
					if (events[e][i].one) context.unbind(e,events[e][i].func); //Remove is one is setup
				}
			}
		}

		context.on = function(e,func) {
			if (typeof func === 'function'){
				if (!events[e]) events[e] = [];
				events[e].push({func: func, one: false});
			}
		}

		context.bind = context.on;

		context.one = function(e,func) {
			if (typeof func === 'function'){
				if (!events[e]) events[e] = [];
				events[e].push({func: func, one: true});
			}
		}

		context.unbind = function(e,succ) {
			if (succ === undefined) {
				//Remove everyone if there is some
				if (events[e]) events[e] = [];
			} else if (typeof succ === 'function') {
				if (events[e]){
					for(var i = 0; i < events[e].length; i++){
						if (events[e][i].func === succ) events[e].splice(i,1);
					}
				}
			}
		}

		context.unbindAll = function() {
			events = {};
		}
	}
	
	return Eventify;
});