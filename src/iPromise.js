/*!
 * An implementation for Promises/A+
 * @author fsjohnhuang
 * @version v0.0.3
 */
;(function(exports, undefined){
	var version = '0.0.3'

	var iPromise = exports.iPromise = function(mixin){
		var state = {
			dirty: false, // 标识是否调用过then、catch、finally、progress函数
			status: 'pending',
			fulfilled: function(){
				state.status = 'fulfilled'
				state.val = arguments 
				return arguments
			},
			rejected: function(){
				state.status = 'rejected'
				state.val = arguments
				return arguments
			},
			progress: function(){
				state.val = arguments
				return arguments
			},
			finally: function(){}
		}

		var deferred = {
			then: function(fulfilledFn, rejectedFn, progressFn, finallyFn){
				return post(state, fulfilledFn, rejectedFn, progressFn, finallyFn)
			},
			catch: function(rejectedFn){
				return post(state, 0, rejectedFn)
			},
			progress: function(progressFn){
				return post(state, 0, 0, progressFn)
			},
			finally: function(finallyFn){
				return post(state, 0, 0, 0, finallyFn)
			}
		}

		configTuple.each(1, function(method, i){
			deferred[method] = function (){
					if (i < 2 && state.status !== 'pending') return

					if (state.dirty)
						fire(state, i, arguments)
					else
						setImmediate(fire, state, i, arguments)
				}
		})	

		if (mixin != undefined)
			if (typeof mixin === 'function')
				mixin.apply(null, extend([], deferred, configTuple.stringify(1, ' ')))
			else
				for (var p in mixin) if (p in deferred);else
					deferred[p] = mixin[p]

		return deferred
	}

	var post = function(state /*...[Function]*/){
		var fns = toArray(arguments, 1)
		state.dirty = true
		var i = -1
		configTuple.each(0, function(cb){
			var fn = fns[++i]
			if (typeof fn !== 'function') return

			state[cb] = i >= 2 ? fn : function(){
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
		var promise = extend({}, state.next, 'then catch progress finally')

		// 若Deferred实例状态为fulfilled或rejected则调用对应的回调函数
		var tuple = configTuple.find(state.status)
		if (tuple)
			if (typeof state.val[0].then === 'function')
				val[0].then(state.next.resolve, state.next.reject, state.next.notify)
			else
				state[tuple[0]].apply(this, state.val)

		return promise
	}

	var fire = function(state, idxOfTuple, args){
		var val = toArray(state[configTuple[idxOfTuple][0]].apply(this, args))
		if (val[0] && typeof val[0].then === 'function')
			return state.next && val[0].then(state.next.resolve, state.next.reject, state.next.notify)

		var method = idxOfTuple === 2 ? configTuple[idxOfTuple][1] : function(){
			try{
				state['finally']()
			}
			catch(e){
				state.status = 'rejected'
				val = e
			}
			return configTuple.find(state.status)[1]
		}()
		state.next && state.next[method].apply(this, val)
	}

	/** 辅助方法 **/
	/**
	 * 将类数组或单个元素转换为数组
	 * @param {*} arrayLike 类数组、没有length的对象或其他Primitive变量
	 * @param {Number} startIdx 截取元素的起始位
	 * @return {Array}
	 */
	var toArray = function(arrayLike, startIdx){
		if (arrayLike == undefined || !('length' in arrayLike)) return [arrayLike]

		try{
			return [].slice.call(arrayLike, startIdx)
		}
		catch(e){
			var array = []
			for (var i = startIdx || 0, len = arrayLike.length; i < len; ++i)
				array[i] = arrayLike[i]
			return array
		}
	}
	/**
	 * 浅拷贝
	 * @param {Object|Array} target 目标对象
	 * @param {Object} other 源对象
	 * @param {String|Boolean} [props=false] true表示重写target属性，false表示不重写；字符串表示将被拷贝的属性
	 * @param {String} [seperator=' '] 当props为String类型时，表示属性间的分隔符
	 * @return {Object|Array}
	 */
	var extend = function(target, other, props, seperator){
		var isArray = Object.prototype.toString.call(target).indexOf('Array') > 0
		if (typeof props === 'string'){
			props = props.split(seperator || ' ')
			for(var i = 0, len = props.length, prop; prop = props[i], i < len; ++i)
				if (prop in other)
					isArray && target.push(other[prop]) || (target[prop] = other[prop])
		}
		else{
			for(var prop in other)
				if (props == true || !(prop in target))
					isArray && target.push(other[prop]) || (target[prop] = other[prop])
		}

		return target
	}
	/**
	 * setImmediate方法polyfill
	 */
	var setImmediate = window.setImmediate || function(fn){
		var args = [].slice.call(arguments, 1)	
		setTimeout(function(){
			fn.apply(this, args)
		}, 0)
	}

	/** 配置信息 **/
	var configTuple = [
		['fulfilled', 'resolve'],
		['rejected', 'reject'],
		['progress', 'notify'],
		['finally', '']
	] 
	/**
	 * 根据元素获取所属元组
	 * @param {String} key 元组元素
	 * @param {Array}
	 */
	configTuple.find = function(key){
		var tokens = (this + '').split(',')
		for (var i = 0, len = tokens.length; i < len; ++i)
			if (tokens[i] === key) break	

		return this[i>>1]
	}
	/**
	 * 循环元组指定索引的元素
	 * @param {Number} idx 索引
	 * @param {Function<{String} el, {Number} i, {Boolean} isEnd>} fn
	 */
	configTuple.each = function(idx, fn){
		idx = idx % 2
		var tokens = (this + '').split(',')
		for (var i = idx, len = tokens.length, token; (token = tokens[i]) && i < len; i+=2)
			fn(token, i>>1, i + 2 >= len)
	}
	/**
	 * 序列化元组指定索引的元素
	 * @param {Number} idx 索引
	 * @param {String} seperator 分隔符
	 * @param {String} 序列化字符串
	 */
	configTuple.stringify = function(idx, seperator){
		var ret = []
		this.each(idx, function(method, i, isEnd){
			ret.push(method)
		})
		return ret.join(seperator)
	}
}(window, void 0));