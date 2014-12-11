;(function($){
	// Promise methods
	var promiseMethods = "then done fail isResolved isRejected promise".split( " " );
	var toString = Object.prototype.toString,
		// [[Class]] -> type pairs
		class2type = {};
	// Populate the class2type map
	for (var i = 0, types = "Boolean Number String Function Array Date RegExp Object".split(" "), len = types; i < len; ++i){
		var name = types[i];
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	}
	
	$.type = function(){
		return obj == null ?
				String( obj ) :
				class2type[ toString.call(obj) ] || "object";
	}
	// Create a simple deferred (one callbacks list)
	$._Deferred = function(){
		var // callbacks list
			callbacks = [],
			// stored [ context , args ]
			fired,
			// to avoid firing when already doing so
			firing,
			// flag to know if the deferred has been cancelled
			cancelled,
			// the deferred itself
			deferred  = {
				// done( f1, f2, ...)
				done: function() {
					if ( !cancelled ) {
						var args = arguments,
							i,
							length,
							elem,
							type,
							_fired;
						if ( fired ) {
							_fired = fired;
							fired = 0;
						}
						for ( i = 0, length = args.length; i < length; i++ ) {
							elem = args[ i ];
							type = jQuery.type( elem );
							if ( type === "array" ) {
								deferred.done.apply( deferred, elem );
							} else if ( type === "function" ) {
								callbacks.push( elem );
							}
						}
						if ( _fired ) {
							deferred.resolveWith( _fired[ 0 ], _fired[ 1 ] );
						}
					}
					return this;
				},

				// resolve with given context and args
				resolveWith: function( context, args ) {
					if ( !cancelled && !fired && !firing ) {
						firing = 1;
						try {
							while( callbacks[ 0 ] ) {
								callbacks.shift().apply( context, args );
							}
						}
						finally {
							fired = [ context, args ];
							firing = 0;
						}
					}
					return this;
				},

				// resolve with this as context and given arguments
				resolve: function() {
					deferred.resolveWith( jQuery.isFunction( this.promise ) ? this.promise() : this, arguments );
					return this;
				},

				// Has this deferred been resolved?
				isResolved: function() {
					return !!( firing || fired );
				},

				// Cancel
				cancel: function() {
					cancelled = 1;
					callbacks = [];
					return this;
				}
			};

		return deferred;
	}
	
	// Full fledged deferred (two callbacks list)
	$.Deferred = function( func ) {
		var deferred = jQuery._Deferred(), failDeferred = jQuery._Deferred(), promise;
		// Add errorDeferred methods, then and promise
		jQuery.extend(deferred, {
			then : function(doneCallbacks, failCallbacks) {
				deferred.done(doneCallbacks).fail(failCallbacks);
				return this;
			},
			fail : failDeferred.done,
			rejectWith : failDeferred.resolveWith,
			reject : failDeferred.resolve,
			isRejected : failDeferred.isResolved,
			// Get a promise for this deferred
			// If obj is provided, the promise aspect is added to the object
			promise : function(obj, i /* internal */) {
				if (obj == null) {
					if (promise) {
						return promise;
					}
					promise = obj = {};
				}
				i = promiseMethods.length;
				while (i--) {
					obj[promiseMethods[i]] = deferred[promiseMethods[i]];
				}
				return obj;
			}
		});
		// Make sure only one callback list will be used
		deferred.then(failDeferred.cancel, deferred.cancel);
		// Unexpose cancel
		delete deferred.cancel;
		// Call given func if any
		if (func) {
			func.call(deferred, deferred);
		}
		return deferred;
	}
	
	// Deferred helper
	$.when = function( object ) {
		var args = arguments, length = args.length, deferred = length <= 1
				&& object && jQuery.isFunction(object.promise) ? object
				: jQuery.Deferred(), promise = deferred.promise(), resolveArray;
		if (length > 1) {
			resolveArray = new Array(length);
			jQuery.each(args, function(index, element) {
				jQuery.when(element).then(
						function(value) {
							resolveArray[index] = arguments.length > 1 ? slice
									.call(arguments, 0) : value;
							if (!--length) {
								deferred.resolveWith(promise, resolveArray);
							}
						}, deferred.reject);
			});
		} else if (deferred !== object) {
			deferred.resolve(object);
		}
		return promise;
	};
}(jQuery={}))