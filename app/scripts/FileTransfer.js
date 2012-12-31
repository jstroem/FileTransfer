define(['OnSocket','Eventify','PeerConnection','BuddyConnector','FileStreamer','FileUtilities','FileWriter'], function(OnSocket,Eventify,PeerConnection,BuddyConnector,FileStreamer,FileUtilities,FileWriter) {

	var FileTransfer = function(config){
		var signalConnection = null;
		var peerConnection = null;
		var dataChannel = null;
		var self = this;

		Eventify(self); //bind event methods

		var createPeerConnection = function() {
			try {
				peerConnection = new PeerConnection(config.peerServers,signalConnection);
			} catch (e) {
				console.log("error",e);
				self.trigger('error',"Failed to create peerConnection: "+ e.message );
				return;
			}
		}

		if (FileTransfer.runnable()) {
			this.setupSenderConnection = function() {
				signalConnection = new OnSocket(config.signalURL);
				var buddy = new BuddyConnector(signalConnection);

				buddy.on('seek',function(id) {
					self.trigger('link',config.httpURL + "#" + id);
				});

				buddy.on('paired', function(){
					self.trigger('paired');

					createPeerConnection();

					if (peerConnection!==null){
						self.setupSenderDataChannel();
					}

				});

				buddy.create();
			};

			this.setupRecvConnection = function(id) {
				signalConnection = new OnSocket(config.signalURL);
				buddy = new BuddyConnector(signalConnection);

				buddy.on('paired', function(){
					self.trigger('paired');
					createPeerConnection();

					//Setup the new datachannel
					if (peerConnection!==null){
						peerConnection.ondatachannel = self.setupRecvDataChannel;
					}
				});

				buddy.join(id);
			};

			this.setupRecvDataChannel = function(channel) {
				channel.on('DataChannel:Open',function(e){
					self.trigger('connected');
				});
				channel.on('FileTransfer:File',function(file){
					self.trigger('incoming', file);
				});
				dataChannel = channel;
			};

			this.setupSenderDataChannel = function() {
				dataChannel = peerConnection.createDataChannel("fileTransfer",{reliable: false}); //reliable: true is not supported by chrome yet!
				dataChannel.on('DataChannel:Open',function(e){
					self.trigger('connected');
				});
			}

			this.acceptFile = function(file){
				var fileEntry = null;
				var chunk = 0;
				var onerror = function(e) { 
					dataChannel.send('FileTransfer:DeclineFile');
					self.trigger('error'); 
				};
				var onprogress = function(length) {
					chunk++;
					self.trigger('progress', chunk/file.chunks);
					if (chunk == file.chunks) {
						self.trigger('complete',fileEntry.toURL());
					}
				}
				var onfileentrycreated = function(fe){
					fileEntry = fe;
					var fileWriter = new FileWriter(fileEntry);
					fileWriter.on('progress', onprogress);
					dataChannel.on('FileTransfer:Data',function(part,data){
						fileWriter.write(data, file.type);
					});
					dataChannel.send('FileTransfer:AcceptFile');
				}
				FileUtilities.newFileSystem(file.size,function(fileSystem){
					FileUtilities.createFile(fileSystem,file.name,onfileentrycreated,onerror);
				},onerror);
			};

			this.sendFile = function(file) {
				var fileStreamer = null;
				var part = 0;
				var onread = function(data) {
					dataChannel.send('FileTransfer:Data', [part, data]);
					part++;
					if (!fileStreamer.atEnd()) fileStreamer.read();
				}
				var onprogress = function(event,args) {
					if (event == 'FileTransfer:Data') {
						self.trigger('progress', args[0]/fileStreamer.chunks());	
						if (args[0] === fileStreamer.chunks() - 1){ //The parts is 0 indexed
							self.trigger('complete');
						}
					}
				}
				var ondecline = function(){
					dataChannel.unbind('FileTransfer:DeclineFile',ondecline);
					dataChannel.unbind('FileTransfer:AcceptFile',onaccept);
					self.trigger('declined');
				}
				var onaccept = function(){
					dataChannel.unbind('FileTransfer:DeclineFile',ondecline);
					dataChannel.unbind('FileTransfer:AcceptFile',onaccept);
					dataChannel.on('DataChannel:SendSuccess',onprogress);
					fileStreamer = new FileStreamer(file);
					fileStreamer.on('read',onread);
					fileStreamer.read();
				}
				dataChannel.on('FileTransfer:AcceptFile', onaccept);
				dataChannel.on('FileTransfer:DeclineFile', onaccept);
				dataChannel.send('FileTransfer:File', {name: file.name, size: file.size, chunks: FileStreamer.chunks(file.size), type: file.type});
			};
		}
	}


	FileTransfer.runnable = function(){
		return 	OnSocket.runnable() && PeerConnection.runnable() && FileStreamer.runnable() && FileUtilities.runnable() && FileWriter.runnable() && true;
	}

	return FileTransfer;
});