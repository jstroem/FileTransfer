define(['Eventify'],function(Eventify){
	/** Events:
			read(data)
			progress(progressPoint)
			end()
			error(ErrorEvent)
			abort(abortEvent)
			start()
			reading(from,to)
	**/
	var defaultChunkSize = 32;

	var FileStreamer = function(file) {
		var reader = new FileReader();
		var point = 0;
		var chunk = defaultChunkSize;
		var loading = false;

		Eventify(this); //Bind event methods

		var self = this;

		var onloadend = function(e){
			if (e.target.readyState == FileReader.DONE) {
				console.log(e.target.result);
				point += e.total;
				loading = false;
				self.trigger('read',e.target.result);
				self.trigger('progress',point);
				if (self.atEnd()) self.trigger('end');
			}
		}

		var onerror = function(e){ self.trigger('error',e); };
		var onprogress = function(e){ };
		var onloadstart = function(e){ };
		var onload = function(e){ };
		var onabort = function(e){ self.trigger('abort',e); };

		reader.onerror = onerror;
		reader.onprogress = onprogress;
		reader.onloadstart = onloadstart;
		reader.onloadend = onloadend;
		reader.onload = onload;
		reader.onabort = onabort;

		this.read = function() {
			if (!self.atEnd() && !loading) {
				loading = true;
				var blob = file.slice(point,point+chunk);
				if (self.atStart()) self.trigger('start');
				self.trigger('reading',[point,point+chunk]);
				reader.readAsBinaryString(blob);
			}
		}

		this.atEnd = function() {
			return file.size == point;
		}

		this.chunks = function(){
			return Math.ceil(file.size / chunk);
		}

		this.atStart = function(){
			return point == 0;
		}

		this.setChunkSize = function(c) { chunk = c; };
		this.setPoint = function(p) { point = p };
	}

	FileStreamer.chunks = function(size) { 
		return Math.ceil(size / defaultChunkSize);
	}

	FileStreamer.runnable = function(){
		return Blob && File && FileReader && Math;
	}

	return FileStreamer;
});