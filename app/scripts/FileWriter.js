define(['Eventify'], function(Eventify){
	var FileWriter = function(fileEntry) {

		Eventify(this);

		var self = this;
		var pending = [];
		var writer = null;
		var written = 0;
		var writing = false;

		var onabort = function(e){ self.trigger('abort',e); };
		var onerror = function(e){ self.trigger('error',e); };
		var onprogress = function(e){ };
		var onwrite = function(e){ };
		var onwriteend = function(e){
			written += e.total;
			self.trigger('progress',written);
			writer = null;
			writing = false;
			checkQueue();
		};
		var onwritestart = function(e){ };

		var bindWriter = function(writer) {
			writer.onabort = onabort;
			writer.onerror = onerror;
			writer.onprogress = onprogress;
			writer.onwrite = onwrite;
			writer.onwriteend = onwriteend;
			writer.onwritestart = onwritestart;
		}

		var blobFromBinaryString = function(binary,type) {
			var byteArray = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) {
                byteArray[i] = binary.charCodeAt(i) & 0xff;
            }

            return new Blob([new DataView(byteArray.buffer)], {type: type });
		}

		var checkQueue = function(){
			if (writer === null && !writing) { // No writers in progress
				if (pending.length > 0) {
					writing = true;
					fileEntry.createWriter(function(fw) {
						bindWriter(fw);
						var next = pending.shift();
						fw.seek(fw.length); //Set it to the end of the file
						fw.write(blobFromBinaryString(next.data,next.type));
					});
				}
			}
		}

		if (FileWriter.runnable()) {
			this.write = function(data,type){
				pending.push({data: data, type: type});
				checkQueue();
			}	
		}
	}

	FileWriter.runnable = function(){
		return Uint8Array && DataView && Blob;
	}

	return FileWriter;
});