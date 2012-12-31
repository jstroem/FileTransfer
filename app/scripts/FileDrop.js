define(['Eventify'], function(Eventify) {
	/**
		Events:
			filedrop(files)
	**/

	var FileDrop = function(el) {
		var self = this;

		Eventify(self); //Bind event methods

		var handleDragover = function(e) {
			e.stopPropagation();
	    	e.preventDefault();
	    	(e.originalEvent ? e.originalEvent : e).dataTransfer.dropEffect = 'copy';
		};

		var handleDrop = function(e) {
			e.stopPropagation();
	   		e.preventDefault();
	   		var files = (e.originalEvent ? e.originalEvent : e).dataTransfer.files;
	   		if (files.length) {
	   			self.trigger('filedrop',files);
	   		}
		};
		if (window.jQuery) {
			// if we have jquery use it
			jQuery(el).on('dragover', handleDragover);
			jQuery(el).on('drop', handleDrop);
		} else {
			el.addEventListener('dragover', handleDragover);
			el.addEventListener('drop', handleDrop);
		}

		this.destroy = function(){
			self.unbindAll();
			if (window.jQuery) {
				jQuery(el).unbind('dragover',handleDragover);
				jQuery(el).unbind('drop',handleDrop);
			} else {
				el.removeEventListener('dragover', handleDragover);
				el.removeEventListener('drop', handleDrop);
			}

		}
	}

	FileDrop.runnable = function(){
		return window.File || window.FileList;
	}

	return FileDrop;
});