require.config({
  shim: {
  },

  paths: {
    jquery: 'vendor/jquery.min'
  }
});
 
require(['PageManager','FileDrop','FileTransfer','jquery'], function(PageManager,FileDrop,FileTransfer,$) {

	var pageManager = new PageManager('.container');

	var config = {
		signalURL: 'ws:localhost:8080',
		httpURL: 'http://localhost:3501',
		peerServers: {"iceServers": [{"url": "stun:stun:stun.l.google.com:19302"}]}
	};

	//Add connect page
	(function(){
		var fileTransfer = null;
		pageManager.addPage('connect',
			function(fileId){ //On showing the page
				fileTransfer = new FileTransfer(config);
				fileTransfer.setupRecvConnection(fileId);
				onconnected = function() {
					pageManager.changePage('receiving',fileTransfer);
				}
				fileTransfer.one('connected', onconnected);
			},
			function(){ //On hiding the page
				filedrop.unbind('connected',onconnected);
			}
		);
	})();

	//Add main page
	(function(){
		var filedrop = null;
		pageManager.addPage('main',
			function(){ //On showing the page
				filedrop = new FileDrop($('.loadarea')), 
					startUpload = $('.startUpload');

				filedrop.one('filedrop',function(files){
					pageManager.changePage('pending', files[0]);
				});
			},
			function(){ //On hiding the page
				filedrop.destroy();
			}
		);
	})();

	//Add pending page
	(function(){
		var fileTransfer = null;
		var onlink = null;
		var onconnected = null;
		pageManager.addPage('pending',
			function(file){ //On showing the page
				$('.fileInfo').text(file.name + " (size: "+file.size+"b)");

				fileTransfer = new FileTransfer(config);

				onlink = function(link){
					$('.setupLink').fadeOut('fadeOut',function(){
						$('.downloadLink').text(link).fadeIn('fadeIn');	
					});
				};

				onconnected = function() {
					pageManager.changePage('sending',[file,fileTransfer]);
				}

				fileTransfer.one('link', onlink);
				fileTransfer.one('connected', onconnected);
				fileTransfer.setupSenderConnection();
			},
			function(){ //On hiding the page
				filedrop.unbind('link',onlink);
				filedrop.unbind('connected',onconnected);
				$('.setupLink').show();
				$('.downloadLink').hide();
			}
		);
	})();

	//Add page requirements
	(function(){
		pageManager.addPage('requirements',
			function(){ //On showing the page

			},
			function(){ // On hiding the page

			});
	})();

	//Add page sending
	(function(){
		var onprogress = null;
		var oncomplete = null;
		var fileTransfer = null;
		pageManager.addPage('sending',
			function(file,fe){ //On showing the page
				fileTransfer = fe;
				onprogress = function(progress) {
					$('.sendingProgress .progressInfo').text(Math.round(progress * 100) + "%");
					$('.sendingProgress .bar').css('width',progress * 100 + "%");
				}
				oncomplete = function() {
					pageManager.changePage('sendComplete');
				}
				fileTransfer.on('progress',onprogress);
				fileTransfer.on('complete',oncomplete);
				fileTransfer.sendFile(file);
			},
			function(){ // On hiding the page
				fileTransfer.unbind('complete',oncomplete);
				fileTransfer.unbind('progress',onprogress);
				$('.sendingProgress .progressInfo').text("0%");
				$('.sendingProgress .bar').css('width',"0%");
			});
	})();

	//Add page receiving
	(function(){
		var onaccept = null;
		var onincoming = null;
		var onprogress = null;
		var oncomplete = null;
		var fileTransfer = null;

		pageManager.addPage('receiving',
			function(fe){ //On showing the page
				fileTransfer = fe;
				var file = null;
				onprogress = function(progress) {
					$('.receivingProgress .progressInfo').text(Math.round(progress * 100) + "%");
					$('.receivingProgress .bar').css('width',progress * 100 + "%");
				}
				oncomplete = function(link) {
					pageManager.changePage('receiveComplete',link);
				}
				onaccept = function(){
					fileTransfer.on('complete',oncomplete);
					fileTransfer.on('progress',onprogress);
					fileTransfer.acceptFile(file);
					$('.confirm_recv').fadeOut('slow',function(){
						$('.receivingProgress').fadeIn('slow');			
					});
				};
				onincoming = function(f){
					file = f;
					$('.startDownload').one('click',onaccept);
					$('.recvFilename').text(file.name);
					$('.recvFiletype').text(file.type);
					$('.recvFilesize').text(file.size);
					$('.confirm_recv').fadeIn('slow');
				}

				fileTransfer.one('incoming',onincoming);
			},
			function(){ // On hiding the page
				$('.confirm_recv').hide();
				$('.receivingProgress').hide();
				$('.recvFilename').text('...');
				$('.recvFiletype').text('...');
				$('.recvFilesize').text('...');
				$('.sendingProgress .progressInfo').text("0%");
				$('.sendingProgress .bar').css('width',"0%");
				$('.startDownload').unbind('click',onaccept);
				fileTransfer.unbind('complete',oncomplete);
				fileTransfer.unbind('progress',onprogress);
				fileTransfer.unbind('incoming',onincoming);
			});
	})();



	//Add page sendComplete
	(function(){
		pageManager.addPage('receiveComplete',
			function(link){ //On showing the page
				$('.receiveCompleteMove').attr('href',link);
			},
			function(){ // On hiding the page
				$('.receiveCompleteMove').attr('href','#');
			});
	})();

	//Add page sendComplete
	(function(){
		pageManager.addPage('sendComplete',
			function(){ //On showing the page

			},
			function(){ // On hiding the page

			});
	})();

	if (FileTransfer.runnable() && FileDrop.runnable()) {
		fileId = location.hash.substr(1);
		recv = (fileId.length>0);

		if (recv) {//Show recv page
			pageManager.changePage('connect', fileId);
		} else {// Else show sender page
			pageManager.changePage('main');
		}
	} else {
		pageManager.changePage('requirements');
	}

	
});