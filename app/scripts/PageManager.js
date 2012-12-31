define(['Eventify','jquery'], function(Eventify,$) {
	/** Events:
		showPage(pageShowing,arguments)
		hidePage(pageHiding)
	**/

	var PageManager = function(pageContainer){
		pageContainer = $(pageContainer);
		var self = this;

		Eventify(this); //bind event methods

		this.addPage = function(page,show,hide) {
			self.on('showPage', function(p,args) {
				if (page === p) {
					show.apply(self,args);
				}
			});
			self.on('hidePage', function(p) {
				if (page === p) {
					show.apply(self);
				}
			});
		}

		this.changePage = function(page,args) {
			var current = $('.current',pageContainer);
			if (!(args instanceof Array)) args = [args];
			if (current.length) {
				if (current != page){
					self.trigger('hidePage',current);
					current.removeClass('current').fadeOut('slow',function(){
						self.trigger('showPage',[page,args]);
						$('[data-page="'+page+'"]',pageContainer).addClass('current').fadeIn('slow');
					});
				}
			} else {
				self.trigger('showPage',[page,args]);
				$('[data-page="'+page+'"]',pageContainer).addClass('current').fadeIn('slow');
			}
		}
	}
	
	return PageManager;
});