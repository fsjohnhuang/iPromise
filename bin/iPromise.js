!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.iPromise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * 异步事件系统
 * @author fsjohnhuang
 * @version 0.1.0
 */
var TinyES = require('./TinyES')
var setImmediate = require('./utils').setImmediate

var AsyncES = module.exports = function(evtName){
	if (!(this instanceof AsyncES)) return new AsyncES(evtName)
		
	var latch, taskQ = (function(){
		var first, last

		return {
			push: function(task){
				if (!first) first = task
				if (last) last.next = task
				last = task
			},
			drain: function(){
				while (first){
					first()	
					first = first.next
				}
				last = null 
			}
		}	
	}())

	return {create: function(/*Function<>*/getArgsOfTrigger){
		var es = new TinyES()
		return {
			one: function(cb, $this){
				es.one(evtName, cb, $this)
			},
			trigger: function(){
				taskQ.push(function(){
					es.trigger.apply(es, [evtName].concat(getArgsOfTrigger ? getArgsOfTrigger() : []))
				})
				if (!latch){
					latch = setImmediate(function(){
						taskQ.drain()	
						latch = void 0
					})
				}
			}
		}
	}}
}
},{"./TinyES":2,"./utils":4}],2:[function(require,module,exports){
/*!
 * 迷你事件系统
 * @author fsjohnhuang
 * @version 0.1.0
 */

var TinyES = module.exports = function(){
	var evtQ = {}		
	var sub = function(evt){
		if (!evtQ[evt.name]) evtQ[evt.name] = []
		evtQ[evt.name].push(evt)
	}

	this.one = function(name, cb, $this){
		sub({
			name: name,
			times: 1,
			cb: function(){
				cb.apply($this, arguments)
			}
		})
	}
	this.trigger = function(name /*, {...*} args*/){
		if (!evtQ[name]) return
		var resubs = [], evt = evtQ[name].pop()
		while (evt){
			evt.cb.apply(null, [].slice.call(arguments, 1))
			if (evt.times !== +evt.times || --evt.times > 0) resubs.push(evt)
			evt = evtQ[name].pop()
		}
		evtQ[name] = resubs
	}
}
},{}],3:[function(require,module,exports){
/*!
 * An implementation for Promises/A+
 * @author fsjohnhuang
 * @version v0.7.1
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
			def.val = val
			def.status = 1
			def.es.trigger()	
		}, function(val){
			def.val = val
			def.status = 2
			def.es.trigger()	
		})	
	}
}

iPromise.resolve = function(val){
	return new iPromise(function(resolve){
		resolve(val)
	})
}
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
	for(p in args) ++i

	var fire4Any = false
		,o = {}
	var deferred = iPromise(function(resolve, reject){
		o.resolve = resolve
		o.reject = reject
	})
	for (var p in args){
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
},{"./AsyncES":1,"./utils":4}],4:[function(require,module,exports){
var version = '0.1.1'

var isFn = exports['isFn'] = function(o){
	return typeof o === 'function'
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
var setImmediate = exports['setImmediate'] = typeof window !== 'undefined' && window.setImmediate || function(fn){
	var args = [].slice.call(arguments, 1)	
	return setTimeout(function(){
		fn.apply(this, args)
	}, 0)
}

/**
 * 判断是否为thenable对象
 * @param  {*} o - 待判断的对象
 * @return {boolean}
 */
var isThenable = exports['isThenable'] = function(o){
	return /object|function/.test(typeof o) && 'then' in o && isFn(o.then)
} 

},{}]},{},[3])(3)
});