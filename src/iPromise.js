/*!
 * An implementation for Promises/A+
 * @author fsjohnhuang
 * @version v0.0.2
 */
;(function(exports, undefined){
	var Version = '0.0.2'

	var iPromise = exports.iPromise = function(mixin){
		var state = {
			dirty: false,
			status: 'pending',
			fulfilled: function(v){
				state.status = 'fulfilled'
				return v
			},
			rejected: function(r){
				state.status = 'rejected'
				return r
			},
			progress: function(v){return v},
			finally: function(){}
		}

		var deferred = {
			then: function(fulfilledFn, rejectedFn, progressFn, finallyFn){
				return post(state, arguments)
			},
			catch: function(rejectedFn){
				return post(state, [0].concat(toArray(arguments)))
			},
			progress: function(progressFn){
				return post(state, [0, 0].concat(toArray(arguments)))
			},
			finally: function(finallyFn){
				return post(state, [0, 0, 0].concat(toArray(arguments)))
			}
		}

		for (var i = 0, len = statusMethodTuple.length; i < len; ++i)
			deferred[statusMethodTuple[i][1]] = function(i){
				return function (){
					if (i < 2 && state.status !== 'pending') return

					if (state.dirty)
						fire(state, i, arguments)
					else
						setImmediate(fire, state, i, arguments)
				}
			}(i)

		return deferred
	}

	var post = function(state, fns){
		state.dirty = true
		var i = -1
		'fulfilled rejected progress finally'.replace(/\w+/g, function(method){
			var fn = fns[++i]
			if (typeof fn !== 'function') return

			state[method] = i >= 2 ? fn : function(){
				var val
				try{
					val = fn.apply(this, arguments)
					state.status = 'fulfilled'
				}
				catch(e){
					val = e
					state.status = 'rejected'
				}
				return val
			}
		})

		state.next = iPromise()
		return extend({}, state.next, 'then catch progress finally')
	}

	var fire = function(state, idxOfTuple, args){
		var val = state[statusMethodTuple[idxOfTuple][0]].apply(this, args)
		if (val && typeof val.then === 'function' && state.next)
			return val.then(state.next.resolve, state.next.reject, state.next.notify)

		var method = idxOfTuple === 2 ? statusMethodTuple[idxOfTuple][1] : function(){
			try{
				state['finally']()
			}
			catch(e){
				state.status = 'rejected'
				val = e
			}
			return statusMethodTuple.find(state.status)[1]
		}()
		state.next && state.next[method](val)
	}

	var toArray = function(arrayLike){
		try{
			return [].slice.call(arrayLike)
		}
		catch(e){
			var array = []
			for (var i = 0, len = arrayLike.length; i < len; ++i)
				array[i] = arrayLike[i]
			return array
		}
	}
	var extend = function(target, other, props){
		for (var i in other){
			if (typeof props !== 'string' || new RegExp(i).test(props))
				target[i] = other[i]
		}
		return target
	}
	var setImmediate = window.setImmediate || function(fn){
		var args = [].slice.call(arguments, 1)	
		setTimeout(function(){
			fn.apply(this, args)
		}, 0)
	}
	var statusMethodTuple = [
		['fulfilled', 'resolve'],
		['rejected', 'reject'],
		['progress', 'notify']
	] 
	statusMethodTuple.find = function(key){
		var tokens = (this + '').split(',')
		for (var i = 0, len = tokens.length; i < len; ++i)
			if (tokens[i] === key) break	

		return this[i/2]
	}

}(window, void 0));