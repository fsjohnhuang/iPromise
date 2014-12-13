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
	 * Deferred实例工厂
	 * Deferred实例实际上就是对一堆回调函数的管理
	 */
	$._Deferred = function(){
		// Deferred实例私有属性
		var callbacks = []; // 回调函数队列
		/**
		 * 状态标识
		 * fired和firing，均用于标识状态"fired"
		 *     fired还用于保存调用回调函数队列元素时的this指针和入参，内容格式为：[ctx, args]
		 *     firing表示是否正在执行回调函数, 防止并发执行resovleWith函数
		 * cancelled，用于标识状态"cancelled"
		 */
		var	fired,
			firing,
			cancelled;

		// Deferred实例
		var	deferred  = {
				// 添加回调函数到队列
				done: function(/* args{0,} */) {
					if ( !cancelled ) {
						var args = arguments
							,length
							,elem
							,type
							,_fired
						// 若当前Deferred实例状态为"fired"（曾经调用过resolveWith或resolve方法）
						// 则使用第一次调用resolveWith或resolve的参数作为入参执行新添加的回调函数
						if (fired) {
							_fired = fired;
							// 将Deferred实例的状态重置为"initialized"，后面通过resolveWith函数实现"initialized"->"fired"的状态转换
							fired = 0;
						}
						for (var i = 0, length = args.length; i < length; i++) {
							elem = args[i]
							type = $.type(elem)
							if (type === "array") {
								// 若该入参为数组则递归添加回调函数
								deferred.done.apply(deferred, elem)
							} else if (type === "function") {
								// 添加回调函数到队列
								callbacks.push(elem)
							}
						}
						if (_fired) {
							// 实现"initialized"->"fired"的状态转换
							// 注意：递归添加回调函数时并不会执行该代码
							deferred.resolveWith(_fired[0], _fired[1])
						}
					}
					// 返回当前Deferred对象，形成链式操作
					return this
				},
				/**
				 * 发起实现"initialized"->"fired"的状态转换请求
				 */
				resolveWith: function(context, /* args{0,} */) {
					if (!cancelled && !fired && !firing) {
						firing = 1 // 状态转换"initialized"->"fired"
						try {
							while(callbacks[0]) {
								// 以resolveWith的参数作为入参同步调用所有回调函数
								callbacks.shift().apply(context, args)
							}
						}
						finally {
							fired = [context, args] // 状态转换"initialized"->"fired"
							firing = 0
						}
					}
					return this
				},
				resolve: function() {
					// 当this为deferred时采用Promise实例
					// 当this为failDeferred时采用Deferred实例
					deferred.resolveWith($.isFunction(this.promise) ? this.promise() : this, arguments)
					return this
				},
				isResolved: function() {
					return !!( firing || fired );
				},
				/**
				 * 私有方法
				 * 将当前Deferred对象的状态设置为"cancelled"，并清空回调函数队列
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
	 * 返回EnhancedDeferred类型实例（加工后的Deferred实例）
	 */
	$.Deferred = function(func) {
		/**
		 * EnhancedDeferred实例有两个Deferred实例构成
		 * 其中deferred代表成功回调函数，failDeferred代表失败回调函数
		 * 好玩之处：EnhancedDeferred实例并不是由新类型构建而成，
		 *           而是以deferred实例为基础，并将failDeferred融入deferred的扩展方法中构建所得
		 */
		var deferred = jQuery._Deferred(), failDeferred = jQuery._Deferred(), promise;
		
		// 将failDeferred融入deferred的扩展方法中
		deferred.fail = failDeferred.done
		deferred.rejectWith = failDeferred.resolveWith
		deferred.reject = failDeferred.resolve
		deferred.isRejected = failDeferred.isResolved

		// 辅助方法，一次性添加成功/失败处理函数到各自的Deferred实例的回调函数队列中
		deferred.then = function(doneCallbacks, failCallbacks) {
				deferred.done(doneCallbacks).fail(failCallbacks)
				return this
			}
		
		// 向入参obj添加Deferred实例的方法，使其成为Promise实例
		// 精妙之处：由于这些方法内部均通过闭包特性操作EnhancedDeferred实例的私有属性和方法（而不是通过this指针）
		//           因此即使this指针改变为其他对象依然有效。
		//           也就是promise函数不会产生新的Deferred对象，而是作为另一个操作原EnhancedDeferred实例的视图。
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
		
		// 当调用resolve后，failDeferred的状态从"initialized"转换为"cancelled"
		// 当调用reject后，deferred的状态从"initialized"转换为"cancelled"
		// 因此resolve和reject仅能调用其中一个，同时调用和重复调用均无效
		deferred.then(failDeferred.cancel, deferred.cancel)
		// 将cancel函数转换为私有函数
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
				// 递归产生多个EnhancedDeferred实例
				$.when(element).then(
						function() {
							resolveArray[index] = arguments.length > 1 
									? slice.call(arguments, 0) 
									: arguments[0]
							if (!--length) {
								// 当入参均有返回值时，则修改顶层EnhancedDeferred实例状态为"resolved"
								deferred.resolveWith(promise, resolveArray);
							}
						}
						// 修改顶层EnhancedDeferred实例状态为"rejected"
						, deferred.reject);
			});
		} else if (deferred !== object) {
			// 当object不是Deferred实例或Promise实例时，将当前的EnhancedDeferred实例状态设置为"resolved"
			deferred.resolve(object);
		}
		// 将设置当前EnhancedDeferred实例状态的操作，交还给object自身
		return promise;
	};
}(jQuery={}))