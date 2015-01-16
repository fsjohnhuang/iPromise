/*!
 * An implementation for Promises/A+
 * @author fsjohnhuang
 * @version v0.7.0
 */
;(function(require, exports){
	var version = '0.7.0'

	/**
	 * 配置信息
	 * @private
	 * @readonly
	 * @type {Array.<Array.<string>>}
	 */
	var configTuples = [
		['fulfilled', 'resolve'],
		['rejected', 'reject']
	] 

	/* 引入工具方法 */
	var utils = require('utils')
		, impls = utils.impls
		, makeArray = utils.makeArray
		, extend = utils.extend
		, isGenFn = utils.isGenFn 
		, setImmediate = utils.setImmediate
		, configMgr = new utils.ConfigMgr(configTuples)
		, noop = utils.noop
		, isFn = utils.isFn

	undefined = utils.undefined

	/**
	 * iPromise的状态
	 * @enum {string}
	 */
	var STATUS = {pending: 0, fulfilled: 1, rejected: 2}

	/**
	 * iPromise构造函数
	 * @public
	 * @param  {(Function|GeneratorFunction)} [mixin] - 工厂函数 或 Generator Function
	 * @return {?iPromise}       
	 */
	var iPromise = exports.iPromise = function(mixin){
		var state = {
			dirty: false, // 标识是否调用过then、catch函数
			val: undefined,
			status: STATUS.pending,
			fulfilled: function(arg){
				state.status = STATUS.fulfilled
				return state.val = arg
			},
			rejected: function(arg){
				state.status = STATUS.rejected
				return state.val = arg
			}
		}

		var deferred = state.curr = {
			status: function(){
				return state.status
			},
			then: function(fulfilledFn, rejectedFn, finallyFn){
				return subs(state, fulfilledFn, rejectedFn, finallyFn)
			},
			catch: function(rejectedFn, finallyFn){
				return subs(state, 0, rejectedFn, finallyFn)
			}
		}
		deferred.wait = defnWait(deferred)

		configMgr.each(1, function(method, i){
			deferred[method] = function (){
					if (i < 2 && state.status !== STATUS.pending) return

					var arg = state.val = arguments.length <= 1 ? arguments[0]
						: makeArray(arguments)
					if (state.dirty){
						state.status = STATUS[i ? 'rejected' : 'fulfilled']
						fire(state, arg)
					}
					else
						setImmediate(function(state, arg, i){
							state.status = STATUS[i ? 'rejected' : 'fulfilled']
							fire(state, arg)
						}, state, arg, i)
				}
		})	
		
		var _isGenFn = false, ret = deferred
		if (mixin != undefined)
			if (isFn(mixin))
				if (_isGenFn = isGenFn(mixin));else
					try{
						ret = deferred.then()
						mixin.call(null, deferred.resolve, deferred.reject)
					}
					catch(e){
						deferred.reject(e)
					}
			else
				for (var p in mixin) if (p in deferred);else
					deferred[p] = mixin[p]

		// mixin为生成器函数时，进行特殊处理并返回undefined
		if (_isGenFn){
			// FF下生成器函数的入参必须在创建迭代器时传递
			// 若第一次调用迭代器的next函数传递参数，则会报TypeError: attempt to send 第一个入参值 to newborn generator
			var iterator = mixin.apply(null, makeArray(arguments,1))
			var next = function(arg){
				var deferred = iPromise()
				deferred.resolve(arg)

				return deferred.then(function(arg){
						var yieldReturn = iterator.next.call(iterator, arg)
						if(yieldReturn.done) throw Error('StopIteration')
						
						return yieldReturn.value
					}).then(next, function(e){
						iterator.throw(e)
					})
			}
			deferred.resolve()
			deferred.then(next)
		}
		else{
			return impls(ret, iPromise)
		}
	}
	
	/**
	 * 等待所有条件成立才执行后续的fulfilled事件处理函数
	 * @method iPromise.all
	 * @static
	 * @param {...*} arg - 条件集合，入参形式有三种：1.(a,b,c);2.([a,b,c]);3.({a:a,b:b,c:c})
	 * @return {iPromise}
	 */
	iPromise.all = function(arg){
		return some.apply(null, [1].concat(makeArray(arguments)))
	}
	/**
	 * 当有一个条件成立则执行后续的fulfilled事件处理函数
	 * @method iPromise.any
	 * @static
	 * @param {...*} arg - 条件集合，入参形式有三种：1.(a,b,c);2.([a,b,c]);3.({a:a,b:b,c:c})
	 * @return {iPromise}
	 */
	iPromise.any = function(arg){
		return some.apply(null, [0].concat(makeArray(arguments)))
	}
	/**
	 * 等待ms毫秒执行fulfilled事件处理函数
	 * @method iPromise.wait
	 * @static
	 * @param {number} [ms=0] - 等待的毫秒数
	 * @param {...*} [arg] - 作为resovle函数的入参
	 * @return {iPromise}
	 */
	iPromise.wait = defnWait()

	/**
	 * iPromise.all和iPromise.any的实现
	 * @private
	 * @method
	 * @param  {boolean} isAll - true，实现all功能；false，实现any功能
	 * @param {...*} arg - 决定是否执行后续fulfilled事件处理函数的条件
	 * @return {iPromise}        
	 */
	function some(isAll, arg){
		var args, i = 0, results = [], type = Object.prototype.toString.call(arguments[1])
		if (/Array|Object/.test(type) && !isFn(arguments[1].then)){
			args = arguments[1]
			if (/Object/.test(type))
				results = {}
		}
		else{
			args = makeArray(arguments, 1)
		}

		var fire4Any = false
		var deferred = iPromise()
		for (var p in args){
			++i
			results[p] = args[p]
			;(function(p){
				if (isFn(results[p].then))
					results[p].then(function(arg){
						if (isAll){
							results[p] = arg
							if (--i);else
								deferred.resolve.call(deferred, results)	
						}
						else if(!fire4Any){
							fire4Any = true
							deferred.resolve.call(deferred, arg)	
						}
					}, deferred.reject)
				else 
					setImmediate(function(){
						if (isAll){
							if (--i);else
								deferred.resolve.call(deferred, results)	
						}
						else if(!fire4Any){
							fire4Any = true
							deferred.resolve.call(deferred, results[p])	
						}
					})
			}(p))
		}

		return deferred.then()
	}

	/**
	 * 创建wait函数
	 * @method defnWait
	 * @private
	 * @param {iPromise} deferred - iPromise实例
	 * @param {Function.<number, {...*}>}
	 */
	function defnWait(deferred){
		/**
		 * 等待ms毫秒执行后续的fulfilled事件处理函数
		 * @method  wait
		 * @public
		 * @param  {number} [ms=0] - 等待的毫秒数
		 * @param  {...*} arg - 当deferred不存在时，作为resovle函数的入参使用
		 * @return {iPromise} 
		 */
		return function(ms, arg){
			ms = ms || 0	
			if (!deferred){
				var args = makeArray(arguments, 1)
				return iPromise(function(r){
					setTimeout(function(){
						r.apply(null, args)
					}, ms)
				}).then()
			}

			return deferred.then(function(arg){
				return createThenable4Wait(0, ms, arg)
			}, function(arg){
				return createThenable4Wait(1, ms, arg)
			})
		}
	}
	/**
	 * 生成供wait函数使用的thenable实例
	 * @method createThenable4Wait
	 * @private
	 * @param {number} methodIdx - 方法索引，0:resolve,1:reject
	 * @param {number} ms - 等待的毫秒数
	 * @param {*} arg - resolve、reject函数的入参
	 */
	function createThenable4Wait(methodIdx, ms, arg){
		return {
			then: function(){
				var methods = arguments
				setTimeout(function(){
					methods[methodIdx].call(null, arg)
				}, ms)
			}
		}	
	}

	/**
	 * 订阅fulfilled和rejected事件，和附加finally语句块内执行函数
	 * @method subs
	 * @private
	 * @param  {Object} state - iPromise实例的内部状态对象
	 * @param  {Function.<*>} [fulfilledFn] - fulfilled事件处理函数
	 * @param  {Function.<*>} [rejectedFn] - rejected事件处理函数
	 * @param  {Function.<>} [finallyFn] - finally语句块内执行函数
	 * @return {iPromise}       
	 */
	var subs = function(state, fulfilledFn, rejectedFn, finallyFn){
		// fix: #20141215
		if (state.dirty) return state.curr

		state.dirty = true
		var fns = makeArray(arguments, 1)
		var i = -1
		configMgr.each(0, function(cb){
			var fn = fns[++i]
			if (!isFn(fn)) return

			state[cb] = function(arg){
				var val
				try{
					val = fn.call(this, arg)
					state.status = STATUS.fulfilled
				}
				catch(e){
					val = e
					state.status = STATUS.rejected
				}
				finally{
					(fns[2] || noop)()	
				}
				return val
			}
		})

		state.next = iPromise()
		var promise = extend({}, state.next, 'then catch wait status')

		// 若Deferred实例状态为fulfilled或rejected则调用对应的回调函数
		var tuple = configMgr.find(state.status)
		if (tuple)
			if (state.val && isFn(state.val.then))
				val.then(state.next.resolve, state.next.reject)
			else
				fire(state, state.val)

		return impls(promise, iPromise)
	}

	/**
	 * 执行fulfilled和rejected事件处理函数
	 * @method fire
	 * @private
	 * @param  {Object} state - iPromise实例的内部状态对象
	 * @param  {*} arg - fulfilled和rejected事件处理函数的入参
	 */
	var fire = function(state, arg){
		var val = state[configMgr.find(state.status)[0]].call(this, arg)
		if (val && isFn(val.then))
			return state.next && val.then(state.next.resolve, state.next.reject)

		state.next && state.next[configMgr.find(state.status)[1]].call(this, val)
	}
}(function(){
	var version = '0.1.0'

	var exports = {'undefined': void 0}

	var noop = exports['noop'] = function(){}

	var isFn = exports['isFn'] = function(o){
		return typeof o === 'function'
	}

	var implsCache = {}
	/**
	 * 实现接口
	 * @method impls
	 * @exports
	 * @param  {Object.<string, *>} members - 接口实现
	 * @param  {Function} interface 接- 口函数
	 * @return {Object} - 接口实现对象
	 */
	var impls = exports['impls'] = function(members, interface){
		var key = interface.toString()
		if (!implsCache[key]){
			var ExtCls= function(){}
				,Ctor = implsCache[key] = function(members){
					for(var p in members)
						this[p] = members[p]
				}
				, ProtoCtor = function(){}
			ProtoCtor.prototype = interface.prototype
			var proto = interface.prototype = new ProtoCtor()

			ExtCls.prototype = proto 
			Ctor.prototype = new ExtCls()
		}
		
		return new implsCache[key](members)
	}

	/**
	 * 浅拷贝
	 * @method extend
	 * @exports
	 * @param {(Object|Array)} target - 目标对象
	 * @param {Object} other - 源对象
	 * @param {(string|boolean)} [props=false] - true表示重写target属性，false表示不重写；字符串表示将被拷贝的属性
	 * @param {string} [seperator=' '] - 当props为String类型时，表示属性间的分隔符
	 * @return {(Object|Array)}
	 */
	var extend = exports['extend'] = function(target, other, props, seperator){
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
	 * 将类数组或单个元素转换为数组
	 * @method makeArray
	 * @exports
	 * @param {*} arrayLike - 类数组、没有length的对象或其他Primitive变量
	 * @param {number} [startIdx=0] - 截取元素的起始位
	 * @return {Array}
	 */
	var makeArray = exports['makeArray'] = function(arrayLike, startIdx){
		if (arrayLike == undefined 
			|| typeof arrayLike !== 'object'
			|| !('length' in arrayLike)) return [arrayLike]

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
	 * 检测Generator Function的RegExp
	 * @private
	 * @type {RegExp}
	 */
	var rIsGenFn = /^\s*function\s+GeneratorFunction\(\s*\)\s*\{\s*\[\s*native/
	/**
	 * 检测函数是否为Generator Function
	 * @method isGenFn 
	 * @exports
	 * @param  {Function} fn - 待检测函数
	 * @return {boolean} - true为Generator Function   
	 */
	var isGenFn = exports['isGenFn'] = function(fn){
		return rIsGenFn.test(fn.constructor) || fn.isGenerator && fn.isGenerator()
	}

	/**
	 * setImmediate polyfill
	 * @method  setImmediate
	 * @exports
	 * @param  {Function.<Function>} fn 异步执行的函数
	 */
	var setImmediate = exports['setImmediate'] = window.setImmediate || function(fn){
		var args = [].slice.call(arguments, 1)	
		setTimeout(function(){
			fn.apply(this, args)
		}, 0)
	}

	/**
	 * 配置信息管理器
	 * @constructor
	 * @exports
	 * @param  {Array} configTuple 配置信息元组
	 * @return {ConfigMgr}
	 */
	var ConfigMgr = exports['ConfigMgr'] = function(configTuple){
		if (!(this instanceof ConfigMgr)) return new ConfigMgr(configTuple)
		this.configTuple = configTuple
	}
	/**
	 * 根据元素获取所属元组
	 * @method find
	 * @param {(string|number)} key 元组元素、状态位索引
	 * @param {Array}
	 */
	ConfigMgr.prototype.find = function(key){	
		if (+key === key)
			return this.configTuple[key - 1]

		var tokens = (this.configTuple + '').split(',')
		for (var i = 0, len = tokens.length; i < len; ++i)
			if (tokens[i] === key) break	

		return this.configTuple[i>>1]
	}
	/**
	 * 循环元组指定索引的元素
	 * method each
	 * @param {number} idx 子元组内元素的索引, 取值范围: 0或1
	 * @param {Function.<{string} el, {number} i, {boolean} isEnd>} fn
	 */
	ConfigMgr.prototype.each = function(idx, fn){
		idx = idx % 2
		var tokens = (this.configTuple + '').split(',')
		for (var i = idx, len = tokens.length, token; (token = tokens[i]) && i < len; i+=2)
			fn(token, i>>1, i + 2 >= len)
	}
	/**
	 * 序列化元组指定索引的元素
	 * @method stringify
	 * @param {number} idx 索引
	 * @param {string} seperator 分隔符
	 * @param {string} 序列化字符串
	 */
	ConfigMgr.prototype.stringify = function(idx, seperator){
		var ret = []
		this.each(idx, function(method, i, isEnd){
			ret.push(method)
		})
		return ret.join(seperator)
	}

	return function(){
		return 	exports
	}	
}()
, Function('return this')()))