;(function($){
	// 类Deferred对象，只能添加回调函数和查看Deferred对象状态，但无法修改Deferred对象的状态
	var promiseMethods = "then done fail isResolved isRejected promise".split(" ")
	var toString = Object.prototype.toString, class2type = {}
	for (var i = 0, types = "Boolean Number String Function Array Date RegExp Object".split(" "), len = types; i < len; ++i){
		var name = types[i]
		class2type["[object " + name + "]"] = name.toLowerCase()
	}
	$.type = function(obj){
		return obj == null ?
				String(obj) :
				class2type[toString.call(obj)] || "object"
	}
	$.isFunction = function(obj){
		return $.type(obj) === 'function'
	}
	/**
	 * Deferred对象工厂
	 */
	$._Deferred = function(){
		// Deferred对象私有属性
		var callbacks = [], // 回调函数队列
			fired, // [ctx, args] 回调函数队列元素使用的this指针和入参
			firing,// 布尔值表示是否正在执行回调函数, 防止并发执行resovleWith函数
			cancelled; // 

		// Deferred对象
		var	deferred  = {
				// 添加回调函数到队列
				done: function(/* args{0,} */) {
					if ( !cancelled ) {
						var args = arguments
							,length
							,elem
							,type
							,_fired
						// 若当前Deferred对象此时已经被调用了resolveWith或resolve
						// 则使用resolveWith或resolve的入参重新调用resolveWith方法，从而执行回调函数队列中的函数
						if (fired) {
							_fired = fired;
							// 由于resolveWith以私有属性fire作为功能开关（0==false为功能开启），因此此处设置为0
							fired = 0;
						}
						for (var i = 0, length = args.length; i < length; i++) {
							elem = args[i]
							type = $.type(elem)
							if (type=== "array") {
								// 若该入参为数组则递归添加回调函数
								deferred.done.apply(deferred, elem)
							} else if (type === "function") {
								// 添加回调函数到队列
								callbacks.push(elem)
							}
						}
						if (_fired) {
							// 马上执行刚才添加回调函数
							// 注意：递归添加回调函数时并不会执行该代码
							deferred.resolveWith(_fired[0], _fired[1])
						}
					}
					// 返回当前Deferred对象，形成链式操作
					return this
				},
				/**
				 * 发起执行回调函数队列的函数请求
				 */
				resolveWith: function(context, /* args{0,} */) {
					if (!cancelled && !fired && !firing) {
						firing = 1
						try {
							while(callbacks[0]) {
								// 同步调用
								// resolveWith的入参作为所有回调函数的入参
								callbacks.shift().apply(context, args)
							}
						}
						finally {
							fired = [context, args]
							firing = 0
						}
					}
					return this
				},
				resolve: function() {
					// 当this为deferred时采用this.promise()
					// 当this为failDeferred时采用this
					deferred.resolveWith($.isFunction(this.promise) ? this.promise() : this, arguments)
					return this
				},
				isResolved: function() {
					return !!( firing || fired );
				},
				/**
				 * 私有方法
				 * 将当前Deferred对象的状态设置为"取消"，并清空回调函数队列
				 */
				cancel: function() {
					cancelled = 1;
					callbacks = [];
					return this;
				}
			};

		return deferred;
	}
	
	/**
	 * 用户使用的Deferred API
	 * 返回加工后的Deferred对象
	 */
	$.Deferred = function(func) {
		var deferred = jQuery._Deferred(), failDeferred = jQuery._Deferred(), promise;
		
		deferred.fail = failDeferred.done
		deferred.then = function(doneCallbacks, failCallbacks) {
				deferred.done(doneCallbacks).fail(failCallbacks)
				return this
			}
		deferred.rejectWith = failDeferred.resolveWith
		deferred.reject = failDeferred.resolve
		deferred.isRejected = failDeferred.isResolved
		
		// 向入参obj添加Deferred对象的方法，使其成为类Deferred对象
		// 精妙之处：由于这些方法内部均通过闭包特性操作Deferred对象的私有属性和方法（而不是通过this指针）
		//         因此即使this指针改变为其他对象依然有效。也就是promise函数不会产生新的Deferred对象，而是作为另一个操作原Deferred对象的入口
		deferred.promise = function(obj, i /* internal */) {
				if (obj == null) {
					if (promise) return promise
					promise = obj = {}
				}
				i = promiseMethods.length
				while (i--) {
					obj[promiseMethods[i]] = deferred[promiseMethods[i]]
				}
				return obj
			}
		}
		
		// 当调用resolve后，failDeferred则会作废
		// 当调用reject后，deferred则会作废
		// 因此resolve和reject仅能调用其中一个，同时调用和重复调用均无效
		deferred.then(failDeferred.cancel, deferred.cancel)
		// 将cancel转换为私有函数
		delete deferred.cancel
		// 调用工厂方法
		if (func) {
			func.call(deferred, deferred)
		}
		return deferred
	}
	
	$.when = function(object) {
		var args = arguments, length = args.length, deferred = length <= 1
				&& object && $.isFunction(object.promise) ? object
				: jQuery.Deferred(), promise = deferred.promise(), resolveArray;
		if (length > 1) {
			resolveArray = new Array(length);
			$.each(args, function(index, element) {
				$.when(element).then(
						function() {
							resolveArray[index] = arguments.length > 1 
									? slice.call(arguments, 0) 
									: arguments[0]
							if (!--length) {
								// 当入参均有返回值时，则修改顶层Deferred对象状态为fired
								deferred.resolveWith(promise, resolveArray);
							}
						}, deferred.reject);
			});
		} else if (deferred !== object) {
			// 当object不是Deferred对象或类Deferred对象时，将当前的Deferred对象状态设置为fired
			deferred.resolve(object);
		}
		// 将设置当前Deferred对象状态的操作，交还给(类)Deferred对象object自身
		return promise;
	};
}(jQuery={}))