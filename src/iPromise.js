/*!
 * An implementation for Promises/A+
 * @author fsjohnhuang
 * @version v0.0.1
 */
;(function(exports){
	if (!Function.prototype.bind)
		Function.prototype.bind = function(self){
			var fn = this;
			return function(){
				fn.apply(self, arguments);
			};
		};

	var handle = function(_){
		var state = _.state, 
			data = _.data, 
			thenables = _.thenables, 
			handlerHame = state === 1 ? 'onFulfilled' : 'onRejected',
			data4NoHandler = state === 1 ? data : undefined,
			thenable;
		while(thenable = thenables.shift()){
			try{
				var handler = thenable[handlerHame];
				if (handler){
					var ret = handler(data);
					if (ret && typeof ret.then === 'function'){
						ret.then(thenable.promise.resolve.bind(thenable.promise)
							,thenable.promise.reject.bind(thenable.promise));
					}
					else{
						thenable.promise.resolve(ret);	
					}
				}	
				else{
					thenable.promise.resolve(data4NoHandler);
				}
			}
			catch(e){
				thenable.promise.reject(e);
			}
		}
	};
	var complete = function(state, _, data){
		if (_.state !== 0) return;
		_.state = state;
		_.data = data;
		handle(_);
	};

	var iPromise = exports.iPromise = function(fn){
		if (!(this instanceof iPromise))
			return new iPromise(fn);

		var _ = this._ = {};
		_.state = 0; // 0:pending, 1:fulfilled, 2:rejected
		_.thenables = [];

		fn && fn(this.resolve.bind(this), this.reject.bind(this));
	};	
	iPromise.prototype.then = function(fulfilledHandler, rejectedHandler){
		var _ = this._;
		var promise = new iPromise();
		var thenable = {
			onFulfilled: fulfilledHandler,
			onRejected: rejectedHandler,
			promise: promise
		};
		_.thenables.push(thenable);

		if (_.state !== 0){
			window[window.setImmediate ? 'setImmediate' : 'setTimeout'].call(window, function(){
				handle(_);
			}, 0);	
		}

		return promise;
	};
	iPromise.prototype.resolve = function(data){
		complete(1, this._, data);
	};
	iPromise.prototype.reject = function(data){
		complete(2, this._, data);
	};
}(window));