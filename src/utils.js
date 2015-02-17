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
