define([],function() {
	var FileUtilities = function() {}

	FileUtilities.newFileSystem = function(size,success,error,type) {
		if (typeof success !== "function") success = function(){};
		if (typeof error !== "function") error = function(){};
		if (type !== TEMPORARY || type !== PERSISTENT) type = TEMPORARY;

		window.storageInfo.requestQuota(type, size, function(bytes) {
			window.requestFileSystem(TEMPORARY, size, success, error);
		}, error);
	}

	FileUtilities.getFile = function(fileSystem,name,success,error) {
		if (typeof success !== "function") success = function(){};
		if (typeof error !== "function") error = function(){};
		fileSystem.root.getFile(name, {create: true}, success, error);
	}

	FileUtilities.removeFile = function(fileSystem,name,success,error) {
		if (typeof success !== "function") success = function(){};
		if (typeof error !== "function") error = function(){};
		fileSystem.root.getFile(name, {create: false}, function(fe) {
			fe.remove(success,error);
		}, success);
	}

	FileUtilities.createFile = function(fileSystem,name,success,error,override) {
		if (typeof success !== "function") success = function(){};
		if (typeof error !== "function") error = function(){};
		if (override === undefined || override === null) override = true;

		//Delete file if exists first.
		if (override) {
			FileUtilities.removeFile(fileSystem,name,function(){
				FileUtilities.getFile(fileSystem,name,success,error);
			},error);
		} else {
			FileUtilities.getFile(fileSystem,name,success,error);
		}
	}

	FileUtilities.runnable = function(){
		window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
		window.storageInfo = window.storageInfo || window.webkitStorageInfo;
		return window.requestFileSystem && window.storageInfo;
	}

	return FileUtilities;
});