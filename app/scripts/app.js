define(['jquery','OnSocket','PeerConnection','BuddyConnector'], function($,OnSocket,PeerConnection,BuddyConnector) {
	var fileTrans = $(new (function() {}));

	var internals = {
		resetApp: function() {
			//Global pointers
			fileTrans.file = null;
			fileTrans.progress = 0;

			fileTrans.peerConnection = null;
			if (fileTrans.signalConnection != null) fileTrans.signalConnection.close();
			fileTrans.signalConnection = null;
			fileTrans.dataChannel = null;
			
			//Global constants
			fileTrans.chunk = 1024;
			fileTrans.signalURL = 'ws:localhost:8080';
			fileTrans.peerServers = {"iceServers": [{"url": "stun:stun:stun.l.google.com:19302"}]};
		},

		handleMsg: function(msg,type) {
			console.log(msg,type);
		},

		handleSendFile: function(chunk) {
			//TODO Send file
		},

		handleReadFileError: function(e) {
			switch(e.target.error.code) {
		      case e.target.error.NOT_FOUND_ERR:
		        internals.handleMsg('File Not Found!','error');
		        break;
		      case e.target.error.NOT_READABLE_ERR:
		       	internals.handleMsg('File is not readable!','error');
		        break;
		      case e.target.error.ABORT_ERR:
		      	internals.handleMsg('Abort error!','error');
		        break; // noop
		      default:
		      	internals.handleMsg('An error occurred reading the file.','error');
		    };
		    internals.resetApp();
		},

		handleWriteFileError: function(e) {
			switch (e.code) {
			    case FileError.QUOTA_EXCEEDED_ERR:
			   	 internals.handleMsg('Not enough space!','error');
			      break;
			    case FileError.NOT_FOUND_ERR:
			    internals.handleMsg('Not file or directory found!','error');
			      break;
			    case FileError.SECURITY_ERR:
			    internals.handleMsg('Security error!','error');
			      break;
			    case FileError.INVALID_MODIFICATION_ERR:
			    internals.handleMsg('Invalid modification!','error');
			      break;
			    case FileError.INVALID_STATE_ERR:
			    internals.handleMsg('Invalid state!','error');
			      break;
			    default:
		      	internals.handleMsg('An error occurred writing the file.','error');
			      break;
			  }
		    internals.resetApp();
		},

		handleFileProgress: function(e) {
			fileTrans.progress += e.loaded;
			app.trigger('fileProgress', fileTrans.progress/fileTrans.file.size);
		},

		handleFileFinished: function() {
			console.log("File has been transfered");
			app.trigger('fileFinished');
			internals.resetApp();
		},

		readFile: function(file,start,chunk) {
			var reader = new FileReader();
			var blob = file.slice(start,start+chunk);
			reader.onloadend = (function(file,start,chunk) {
				return function(e) {
					if (e.target.readyState == FileReader.DONE) {
						internals.handleSendFile(e.target.result);
						start += e.total;
						//Check if this is the end of the file.
						if (start < file.size) {
							//Need another round so go recursive
							internals.readFile(file,start,chunk);
						} else {
							internals.handleFileFinished();
						}
					}
				}
			})(file,start,chunk);
			reader.onerror = internals.handleReadFileError;
			reader.onprogress = internals.handleFileProgress;
			reader.readAsBinaryString(blob);
		},

		writeToFile: function(fe,type,text,success,error) {
			success = success || function() { };
			error = error || function() { };
			fe.createWriter(function(fw) {
				fw.onwriteend = success;
				fw.onerror = error;
				fw.seek(fw.length);
				fw.write(new Blob([text], {type: type}));
			}, internals.handleWriteFileError);

		},

		removeFile: function(fs,name,success,error) {
			fs.root.getFile(name, {create: false}, function(fe) {
				fe.remove(success,error);
			}, success);
		},

		createPeerConnection: function() {
			//Buddy system should be up
			try {
				var pc = fileTrans.peerConnection = new PeerConnection(fileTrans.peerServers,fileTrans.signalConnection);
			} catch (e) {
				internals.handleMsg("Failed to create peerConnection, exception: "+ e.message, "error");
				return;
			}
		 	pc.onicecandidate = function(event) {
		 		if (event.candidate){
		 			var ice = {label: event.candidate.sdpMLineIndex,
                   		id: event.candidate.sdpMid,
                   		candidate: event.candidate.candidate};
			 		ws.trigger('ice',ice);
                }
		 	};
		},

		sendFile: function(file) {
			//Open new connection
			var dataChannel = fileTrans.dataChannel = fileTrans.peerConnection.createDataChannel("fileTrans",{ reliable : false });
			fileTrans.dataChannel.onmessage = function(event) {
				console.log("Message recv", event);
			}
			fileTrans.dataChannel.onopen = function(event) {
				console.log("open", event);
				fileTrans.dataChannel.send('test');
			}
			fileTrans.dataChannel.onclose = function(event) {
				//Show error message

			}
		},

		recvFile: function() {
			
		}
	}

	var app = {
		handleDragover: function(e) {
			e.stopPropagation();
	    	e.preventDefault();
	    	(e.originalEvent ? e.originalEvent : e).dataTransfer.dropEffect = 'copy';
		},

		handleDrop: function(e) {
			e.stopPropagation();
	   		e.preventDefault();
	   		var files = (e.originalEvent ? e.originalEvent : e).dataTransfer.files;

	   		if (files.length) {
	   			var f = fileTrans.file = files[0];
	   			app.trigger('fileUploadReady',f);
	   		} else {
	   			internals.handleMsg('No files choosen!', 'error');
	   		}
		},

		bind: function() { fileTrans.bind.apply(fileTrans, arguments); }, 
		trigger: function() { fileTrans.trigger.apply(fileTrans, arguments); },
		on: function() { fileTrans.on.apply(fileTrans, arguments); },
		one: function() { fileTrans.one.apply(fileTrans, arguments); },
		unbind: function() { fileTrans.unbind.apply(fileTrans, arguments); },

		runnable: function() {
			window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
			window.storageInfo = window.storageInfo || window.webkitStorageInfo;
			window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection; 
			return window.File && window.FileReader && window.FileList && window.Blob && window.requestFileSystem && window.storageInfo && window.RTCPeerConnection && window.WebSocket;
		},

		startFileLoad: function() {
			internals.readFile(fileTrans.file,0,fileTrans.chunk);
		},

		createFile: function(name,type,size,success) {
			success = success || function() { };

			//TODO: Dont know what to use yet TEMPORARY or PERSISTENT
			window.storageInfo.requestQuota(TEMPORARY, size, function(bytes) {
			  window.requestFileSystem(TEMPORARY, size, function(fs) {

			  	//TODO: Maybe you need to remove files before adding new

			  	internals.removeFile(fs,name,function() {
			  		//Successfully removed
				  	fs.root.getFile(name, {create: true}, function(fileEntry) {
				  		//File is created
				  		fileTrans.file = fileEntry;
				  		success();
				  	}, internals.handleWriteFileError);
			  	}, function(e) {
			  		internals.handleMsg('File already exists and cant be removed', 'error');
			  	});

			  }, internals.handleWriteFileError);
			}, internals.handleWriteFileError);
		},
		
		writeChunk: function(text,type,success) {
			internals.writeToFile(fileTrans.file,type,text,success,function(e){
				console.log("Custom write error: ",e);
			});
		},

		setupSenderConnection: function() {
			signalConnection = new OnSocket(fileTrans.signalURL);
			buddy = new BuddyConnector(signalConnection);

			buddy.bind('seek',function(id) {
				app.trigger('buddySetup',id);
			});

			buddy.bind('paired', function(){
				internals.createPeerConnection();
				app.trigger('buddyReady');
			});

			buddy.create();
		},

		sendFile: function(){
			internals.sendFile(fileTrans.file);
		},

		setupRecvConnection: function(id) {
			signalConnection = new OnSocket(fileTrans.signalURL);
			buddy = new BuddyConnector(signalConnection);

			buddy.bind('paired', function(){
				internals.createPeerConnection();
				app.trigger('buddyReady');
			});

			buddy.join(id);
		},

		recvFile: function(){
			internals.recvFile();
		},

		getLink: function() {
			return fileTrans.file.toURL();
		}
	}

	internals.resetApp();

	return app;
});