define(['OnDataChannel'], function(OnDataChannel) {
	//Standard with the rtpDataChannel running
	var peerConfig = { optional:[ { RtpDataChannels: true }]};

	/**
		Requires that the connection (`sigConn`) has the following interface:
			* on(e,listener): Which invokes `listener` when event `e` is being sent
			* send(e,[arguments]): Send `arguments` to all listeners of event `e`.
	**/
	var PeerConnection = function(servers,sigConn){
		var signalConnection = null;
		var pc = null;
		var self = this;

		var localDescCreated = function(desc){
			pc.setLocalDescription(desc, function(){
				signalConnection.send('PeerConnection:dsp', pc.localDescription);
			}, this.onerror);
		}

		if (PeerConnection.runnable()){
			signalConnection = sigConn;
			//If no support this will cause an error
			pc = new RTCPeerConnection(servers,peerConfig);

		 	pc.onicecandidate = function(event) {
		 		if (event.candidate){
		 			var ice = {label: event.candidate.sdpMLineIndex,
                   		id: event.candidate.sdpMid,
                   		candidate: event.candidate.candidate};
			 		signalConnection.send('PeerConnection:ice',ice);
                }
		 	};
		 	pc.onnegotiationneeded = function(){
				pc.createOffer(localDescCreated, this.onerror);
			};

			signalConnection.on('PeerConnection:dsp',function(remoteDescription){
				pc.setRemoteDescription(new RTCSessionDescription(remoteDescription), function() {
					//If we got an offer we need to return it
					if (pc.remoteDescription.type === 'offer')
							pc.createAnswer(localDescCreated,this.onerror);
				}, this.onerror);
			});

			signalConnection.on('PeerConnection:ice', function(ice){
				pc.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:ice.label,candidate:ice.candidate}));
			});

		 	pc.onconnecting = function() { self.onconnecting.apply(self, arguments) };
		 	pc.onopen = function() { self.onopen.apply(self, arguments) };
		 	pc.onaddstream = function() { self.onaddstream.apply(self, arguments) };
		 	pc.onremovestream = function() { self.onremovestream.apply(self, arguments) };
		 	pc.ondatachannel = function(e) { if (e.channel) { self.ondatachannel.call(self, new OnDataChannel(e.channel)); } };

		 	this.onerror = function(){};
			this.onconnecting = function(){};
			this.onaddstream = function(){};
			this.onremovestream = function(){};
			this.ondatachannel = function(){};
			this.onopen = function(){};

			this.createDataChannel = function(label,config) {
				return new OnDataChannel(pc.createDataChannel(label,config));
			}
		}
	}

	PeerConnection.runnable = function(){
		window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
		return window.RTCPeerConnection && window.RTCPeerConnection.prototype.createDataChannel && true;
	}

	return PeerConnection;
});