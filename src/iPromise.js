/*!
 * An implementation for Promises/A+
 * @author fsjohnhuang
 * @version v0.8.1
 */
var version = '0.8.0'

/* 引入工具方法 */
var utils = require('./utils')
	, makeArray = utils.makeArray
	, isGenFn = utils.isGenFn 
	, isFn = utils.isFn
	, isThenable = utils.isThenable

/* 引入异步事件系统 */
var AsyncES = require('./AsyncES')
AsyncES = new AsyncES('statusChanged')

/**
 * iPromise构造函数
 * @public
 * @param  {(Function|GeneratorFunction)} [mixin] - 工厂函数 或 Generator Function
 * @return {?iPromise}       
 */
var iPromise = module.exports = function(mixin){
	if (!isFn(mixin)) throw Error('TypeError: invalid iPromise arguments')

	if (!(this instanceof iPromise)) return new iPromise(mixin)
	var isES6GF = isGenFn(mixin)
	
	/**
	 * iPromise的状态
	 * 0: pending, 1: fulfilled, 2: rejected
	 */
	var def = {
		status: 0,
		val: void 0
	}
	def.es = AsyncES.create(function(){
		return [def.status, def.val]
	})

	this.then = function(fulfilledFn, rejectedFn, finallyFn){
		return sub(def, fulfilledFn, rejectedFn, finallyFn)
	}
	this.catch = function(rejectedFn, finallyFn){
		return this.then(0, rejectedFn, finallyFn)
	}
	this.wait = defnWait(this)

	if (isES6GF){
		// FF下生成器函数的入参必须在创建迭代器时传递
		// 若第一次调用迭代器的next函数传递参数，则会报TypeError: attempt to send 第一个入参值 to newborn generator
		var iterator = mixin.apply(null, makeArray(arguments,1))
		var next = function(arg){
			var deferred = iPromise(function(resolve){
				resolve(arg)
			})

			return deferred.then(function(arg){
					var yieldReturn = iterator.next.call(iterator, arg)
					if(yieldReturn.done) throw Error('StopIteration')
					
					return yieldReturn.value
				}).then(next, function(e){
					iterator.throw(e)
				})
		}
		new iPromise(function(resolve){
			resolve()
		}).then(next)

		return void 0
	}
	else{
		mixin(function(val){
			if (def.status) return

			def.val = val
			def.status = 1
			def.es.trigger()	
		}, function(val){
			if (def.status) return

			def.val = val
			def.status = 2
			def.es.trigger()	
		})	
	}
}

/**
 * 创建一个状态为fulfilled的iPromise实例
 * @param  {*} val
 * @return {iPromise}
 */
iPromise.resolve = function(val){
	return new iPromise(function(resolve){
		resolve(val)
	})
}
/**
 * 创建一个状态为rejected的iPromise实例
 * @param  {*} val
 * @return {iPromise}
 */
iPromise.reject= function(reason){
	return new iPromise(function(resolve, reject){
		reject(val)
	})
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
 * @method iPromise.any/iPromise.race
 * @static
 * @param {...*} arg - 条件集合，入参形式有三种：1.(a,b,c);2.([a,b,c]);3.({a:a,b:b,c:c})
 * @return {iPromise}
 */
iPromise.any = iPromise.race = function(){
	return some.apply(null, [0].concat(makeArray(arguments)))
}
/**
 * 等待ms毫秒执行fulfilled事件处理函数
 * @method iPromise.wait
 * @static
 * @param {number} ms=0 - 等待的毫秒数
 * @param {*} arg - 作为resovle函数的入参
 * @return {iPromise}
 */
iPromise.wait = defnWait()

/**
 * 订阅iPromise状态变化事件
 * @method sub
 * @private
 * @param  {Object} def - iPromise的内部状态结构体
 * @param  {Function.<*>} fulfilledFn - 状态由0->1的事件处理函数
 * @param  {Function.<*>} rejectedFn  - 状态由0->2的事件处理函数
 * @param  {Function.<>} finallyFn - fulfilledFn或rejectedFn执行后必定会执行的函数
 * @return {iPromise}             
 */
function sub(def, fulfilledFn, rejectedFn, finallyFn){
	var o = {}
	var promise = new iPromise(function(resolve, reject){
		o.resolve = resolve
		o.reject = reject
	})	
	def.es.one(function(status, val){
		if (isFn(fulfilledFn) || isFn(rejectedFn) 
			&& isFn(finallyFn)) 
			try{
				finallyFn()
			}catch(e){}

		try{
			var ret, invoked
			if (invoked = status === 1 && isFn(fulfilledFn)){
				ret = fulfilledFn(val)
				if (isThenable(ret))
					return ret.then(o.resolve, o.reject)
			}
			else if(invoked = status === 2 && isFn(rejectedFn)){
				ret = rejectedFn(val)
				if (isThenable(ret))
					return ret.then(o.resolve, o.reject)
				status = 1
			}
			o[status === 1 ? 'resolve' : 'reject'](invoked ? ret : val)
		}	
		catch(e){
			o.reject(e)
		}
	})
	if (/*0 !== */def.status)
		def.es.trigger()

	return promise
}

/**
 * iPromise.all和iPromise.any的实现
 * @method some
 * @private
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
		,o = {}
	var deferred = iPromise(function(resolve, reject){
		o.resolve = resolve
		o.reject = reject
	})
	for (var p in args){
		++i
		results[p] = args[p]
		;(function(p){
			var deferred = results[p]
			if (results[p] && !isFn(results[p].then))
				deferred = new iPromise(function(resolve){
					resolve(results[p])
				})
			deferred.then(function(arg){
				if (isAll){
					results[p] = arg
					if (--i);else
						o.resolve(results)	
				}
				else if(!fire4Any){
					fire4Any = true
					o.resolve(arg)	
				}
			}, o.resolve)	
		}(p))
	}

	return deferred
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
			return new iPromise(function(r){
				setTimeout(function(){
					r(arg)
				}, ms)
			})
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
				methods[methodIdx](arg)
			}, ms)
		}
	}	
}