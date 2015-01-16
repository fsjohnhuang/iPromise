;(function(require, exports, module){
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
}(function(){}, ))