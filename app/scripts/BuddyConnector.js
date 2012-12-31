define(['Eventify'], function(Eventify) {
	/**
	Events:
		seek(id)
		paired()

	Requires that the connection has the following interface:
		* on(e,listener): Which invokes `listener` when event `e` is being sent
		* send(e,[arguments]): Send `arguments` to all listeners of event `e`.
	*/
	var BuddyConnector = function(connection){

		Eventify(this); //bind event methods
		var self = this;

		this.create = function(){
			connection.on('Buddy:created',function(id) {
				self.trigger('seek',id);
			});

			connection.on('Buddy:paired', function() {
				self.trigger('paired');
			});

			//start seeking for a buddy.
			connection.send('Buddy:create');
		},

		this.join = function(id) {
			connection.on('Buddy:paired', function() {
				self.trigger('paired');
			});
			connection.send('Buddy:join',id);
		}
	}
	
	return BuddyConnector;
});