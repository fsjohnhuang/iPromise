(function( jQuery ) {

// String to Object flags format cache
var flagsCache = {};

// Convert String-formatted flags into Object-formatted ones and store in cache
function createFlags( flags ) {
	var object = flagsCache[ flags ] = {},
		i, length;
	flags = flags.split( /\s+/ );
	for ( i = 0, length = flags.length; i < length; i++ ) {
		object[ flags[i] ] = true;
	}
	return object;
}

 /** 特性说明
  * once: 启动仅遍历执行回调函数队列一次特性，遍历结束后废弃该管理器
  * memory: 启动回调函数晚绑定特性
  * unique: 启动回调函数唯一性特性
  * stopOnFalse: 启动回调函数返回false，则废弃该管理器
  */
jQuery.Callbacks = function( flags ) {
	// 特性标识
	flags = flags ? ( flagsCache[ flags ] || createFlags( flags ) ) : {};

	var // 回调函数队列
		list = [],
		// 请求队列（不要被变量名欺骗，不是栈结构而是队列结构），用于暂存发起遍历执行回调函数队列的请求，元素数据结构为[ctx, args]
		stack = [],
		// 标识是否支持回调函数晚绑定, 不支持则为true，支持则为[ctx, args]
		memory,
		// 表示是否正在遍历回调函数队列
		firing,
		// 初始化回调函数队列遍历的起始索引
		firingStart,
		// 回调函数队列遍历的上限
		firingLength,
		// 回调函数队列遍历的起始索引
		firingIndex,
		// 私有方法：添加回调函数到队列
		add = function( args ) {
			var i,
				length,
				elem,
				type;
			for (i = 0, length = args.length; i < length; i++) {
				elem = args[i];
				type = jQuery.type(elem);
				if (type === "array") {
					// 递归添加到回调函数队列
					add(elem);
				} else if (type === "function") {
					// 开启唯一性特性，且队列中已经有相同的函数则不入队
					if (!flags.unique || !self.has( elem )) {
						list.push(elem);
					}
				}
			}
		},
		// 私有方法：遍历队列执行队列中的函数
		fire = function(context, args) {
			args = args || [];
			// 标识是否支持回调函数晚绑定, 不支持则为true，支持则为[ctx, args]
			memory = !flags.memory || [context, args];
			firing = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			// 由于在循环期间有可能管理器会被废弃，因此需要在循环条件中检查list的有效性
			for (;list && firingIndex < firingLength; firingIndex++) {
				if (list[firingIndex].apply(context, args) === false && flags.stopOnFalse) {
					memory = true; // 标识中止遍历队列操作，效果和不支持回调函数晚绑定一致
					break;
				}
			}
			firing = false;
			if (list) {
				if (!flags.once) {
					if (stack && stack.length) {
						// 关闭仅遍历一次回调函数队列特性时
						// 请求队列首元素出队，再次遍历执行回调函数队列
						memory = stack.shift();
						self.fireWith(memory[0], memory[1]);
					}
				} else if (memory === true) {
					// 当开启仅遍历一次回调函数队列特性，且发生了中止遍历队列操作或不支持回调函数晚绑定，
					// 则废弃当前回调函数队列管理器
					self.disable();
				} else {
					list = [];
				}
			}
		},
		// 回调函数队列管理器
		self = {
			// 添加回调函数到队列中
			add: function() {
				if (list) {
					var length = list.length;
					// 如果正在遍历执行回调函数队列，那么添加函数到队列后马上更新遍历上限，从而执行新加入的回调函数
					add(arguments);
					if (firing) {
						firingLength = list.length;
					} else if (memory && memory !== true) {
						// 遍历执行回调函数已结束，并且支持函数晚绑定则从上次遍历结束时的索引位开始继续遍历回调函数队列
						firingStart = length;
						fire(memory[0], memory[1]);
					}
				}
				return this;
			},
			// 从队列中删除回调函数
			remove: function() {
				if (list) {
					var args = arguments,
						argIndex = 0,
						argLength = args.length;
					for (; argIndex < argLength; argIndex++) {
						for ( var i = 0; i < list.length; i++) {
							if (args[argIndex] === list[i]) {
								// 由于删除队列的一个元素，因此若此时正在遍历执行回调函数队列，
								// 则需要调整当前遍历索引和遍历上限
								if (firing) {
									if (i <= firingLength) {
										firingLength--;
										if (i <= firingIndex) {
											firingIndex--;
										}
									}
								}
								// 删除回调函数
								list.splice(i--, 1);
								// 如果开启了回调函数唯一性的特性，则只需删除一次就够了
								if (flags.unique) {
									break;
								}
							}
						}
					}
				}
				return this;
			},
			// 对回调函数作唯一性检查
			has: function( fn ) {
				if ( list ) {
					var i = 0,
						length = list.length;
					for ( ; i < length; i++ ) {
						if ( fn === list[ i ] ) {
							return true;
						}
					}
				}
				return false;
			},
			// 清空回调函数队列
			empty: function() {
				list = [];
				return this;
			},
			// 废除该回调函数队列
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// 状态：是否已废弃
			disabled: function() {
				return !list;
			},
			// 不在处理遍历执行回调函数队列的请求
			lock: function() {
				// 不再处理遍历执行回调函数队列的请求
				stack = undefined;
				if (!memory || memory === true) {
					// 当未遍历过回调函数队列
					// 或关闭晚绑定特性则马上废弃该管理器
					self.disable();
				}
				return this;
			},
			// 状态：是否已被锁定
			locked: function() {
				return !stack;
			},
			// 发起遍历队列执行队列函数的请求
			fireWith: function(context,args) {
				if (stack) {
					if (firing) {
						if (!flags.once) {
							// 若正在遍历队列，并且关闭仅遍历一次队列的特性时，将此请求入队
							stack.push([context, args]);
						}
					} else if (!flags.once || !memory) {
						// 关闭仅遍历一次队列的特性
						// 或从未遍历过回调函数队列时，执行遍历过回调函数队列操作
						fire(context, args);
					}
				}
				return this;
			},
			// 发起遍历队列执行队列函数的请求
			fire: function() {
				self.fireWith(this, arguments);
				return this;
			},
			// 状态：是否已遍历过回调函数队列
			fired: function() {
				return !!memory;
			}
		};

	return self;
};
})( jQuery );
