function Deferred () { return (this instanceof Deferred) ? this.init() : new Deferred() }
// 默认的成功事件处理函数
Deferred.ok = function (x) { return x };
// 默认的失败事件处理函数
Deferred.ng = function (x) { throw  x };
Deferred.prototype = {
	_id : 0xe38286e381ae,
	// 初始化函数
	init : function () {
		this._next    = null;
		this.callback = {
			ok: Deferred.ok,
			ng: Deferred.ng
		};
		return this;
	},
	next  : function (fun) { return this._post("ok", fun) },
	error : function (fun) { return this._post("ng", fun) },
	call  : function (val) { return this._fire("ok", val) },
	fail  : function (err) { return this._fire("ng", err) },
	cancel : function () {
		(this.canceller || function () {}).apply(this);
		return this.init();
	},
	_post : function (okng, fun) {
		// 创建一个新的Deferred实例，插入Deferred链表尾，并将事件处理函数绑定到新的Deferred上
		this._next =  new Deferred();
		this._next.callback[okng] = fun;
		return this._next;
	},
	_fire : function (okng, value) {
		var next = "ok";
		try {
			// 调用当前Deferred实例的事件处理函数
			value = this.callback[okng].call(this, value);
		} catch (e) {
			next  = "ng";
			value = e;
			if (Deferred.onerror) Deferred.onerror(e);
		}
		if (Deferred.isDeferred(value)) {
			// 若事件处理函数返回一个新Deferred实例，则将新Deferred实例的链表指针指向当前Deferred实例的链表指针指向，
	　　　　// 这样新Deferred实例的事件处理函数就会先与原链表中其他Deferred实例的事件处理函数被调用。
			value._next = this._next;
		} else {
			if (this._next) this._next._fire(next, value);
		}
		return this;
	}
};
Deferred.isDeferred = function (obj) {
	return !!(obj && obj._id === Deferred.prototype._id);
};
Deferred.next_default = function (fun) {
	var d = new Deferred();
	var id = setTimeout(function () { d.call() }, 0);
	d.canceller = function () { clearTimeout(id) };
	if (fun) d.callback.ok = fun;
	return d;
};
Deferred.next_faster_way_readystatechange = ((typeof window === 'object') && (location.protocol == "http:") && !window.opera && /\bMSIE\b/.test(navigator.userAgent)) && function (fun) {
	var d = new Deferred();
	var t = new Date().getTime();
	/* 原理：
	    	由于浏览器对并发请求数作出限制（IE5.5~8为2~3,IE9+和现代浏览器为6），
	     	因此当并发请求数大于上限时，会让请求的发起操作排队执行，导致延时更严重了。
	   实现手段：
			以150毫秒为一个周期，每个周期以通过setTimeout发起的异步执行作为起始，
			周期内的其他异步执行操作均通过script请求实现。
			（若该方法将在短时间内被频繁调用，可以将周期频率再设高一些，如100毫秒）
	*/
	if (t - arguments.callee._prev_timeout_called < 150) {
		var cancel = false;
		var script = document.createElement("script");
		script.type = "text/javascript";
		// 采用无效的data uri sheme马上触发readystate变化
		script.src  = "data:text/javascript,";
		script.onreadystatechange = function () {
			// 由于在一次请求过程中script的readystate会变化多次，因此通过cancel标识来保证仅调用一次call方法
			if (!cancel) {
				d.canceller();
				d.call();
			}
		};
		d.canceller = function () {
			if (!cancel) {
				cancel = true;
				script.onreadystatechange = null;
				document.body.removeChild(script);
			}
		};
		// 不同于img元素，script元素需要添加到dom树中才会发起请求
		document.body.appendChild(script);
	} else {
		arguments.callee._prev_timeout_called = t;
		var id = setTimeout(function () { d.call() }, 0);
		d.canceller = function () { clearTimeout(id) };
	}
	if (fun) d.callback.ok = fun;
	return d;
};
Deferred.next_faster_way_Image = ((typeof window === 'object') && (typeof(Image) != "undefined") && !window.opera && document.addEventListener) && function (fun) {
	var d = new Deferred();
	var img = new Image();
	var handler = function () {
		d.canceller();
		d.call();
	};
	img.addEventListener("load", handler, false);
	img.addEventListener("error", handler, false);
	d.canceller = function () {
		img.removeEventListener("load", handler, false);
		img.removeEventListener("error", handler, false);
	};
	// 请求一个无效data uri scheme导致马上触发load或error事件
	// 注意：先绑定事件处理函数，再设置图片的src是个良好的习惯。因为设置img.src属性后就会马上发起请求，假如读的是缓存那有可能还未绑定事件处理函数，事件已经被触发了。
	img.src = "data:image/png," + Math.random();
	if (fun) d.callback.ok = fun;
	return d;
};
Deferred.next_tick = (typeof process === 'object' && typeof process.nextTick === 'function') && function (fun) {
	var d = new Deferred();
	process.nextTick(function() { d.call() });
	if (fun) d.callback.ok = fun;
	return d;
};
Deferred.next = 
	Deferred.next_faster_way_readystatechange ||
	Deferred.next_faster_way_Image ||
	Deferred.next_tick ||
	Deferred.next_default;

Deferred.chain = function () {
	var chain = Deferred.next();
	// 生成Deferred实例链表，链表长度等于arguemtns.length
	for (var i = 0, len = arguments.length; i < len; i++) (function (obj) {
		switch (typeof obj) {
			case "function":
				var name = null;
				// 通过函数名决定是订阅成功还是失败事件
				try {
					name = obj.toString().match(/^\s*function\s+([^\s()]+)/)[1];
				} catch (e) { }
				if (name != "error") {
					chain = chain.next(obj);
				} else {
					chain = chain.error(obj);
				}
				break;
			case "object":
				// 这里的object包含形如{0:function(){}, 1: Deferred实例}、Deferred实例
				chain = chain.next(function() { return Deferred.parallel(obj) });
				break;
			default:
				throw "unknown type in process chains";
		}
	})(arguments[i]);
	return chain;
};

Deferred.wait = function (n) {
	var d = new Deferred(), t = new Date();
	var id = setTimeout(function () {
		 // 入参为实际等待毫秒数，由于各浏览器的setTimeout均有一个最小精准度参数（IE9+和现代浏览器为4msec，IE5.5~8为15.4msec），因此实际等待的时间一定被希望的长
		d.call((new Date()).getTime() - t.getTime());
	}, n * 1000);
	d.canceller = function () { clearTimeout(id) };
	return d;
};

Deferred.call = function (fun) {
	var args = Array.prototype.slice.call(arguments, 1);
	return Deferred.next(function () {
		return fun.apply(this, args);
	});
};

Deferred.parallel = function (dl) {
	// 对入参作处理
	var isArray = false;
	if (arguments.length > 1) {
		dl = Array.prototype.slice.call(arguments);
		isArray = true;
	} else if (Array.isArray && Array.isArray(dl) || typeof dl.length == "number") {
		isArray = true;
	}

	var ret = new Deferred(), values = {}, num = 0;
	for (var i in dl) if (dl.hasOwnProperty(i)) (function (d, i) {
		// 若d为函数类型，则封装为Deferred实例
		// 若d既不是函数类型，也不是Deferred实例则报错哦！
		if (typeof d == "function") 
			dl[i] = d = Deferred.next(d);
		d.next(function (v) {
			values[i] = v;
			if (--num <= 0) {
				// 凑够数就触发事件处理函数
				if (isArray) {
					values.length = dl.length;
					values = Array.prototype.slice.call(values, 0);
				}
				ret.call(values);
			}
		}).error(function (e) {
			ret.fail(e);
		});
		num++;
	})(dl[i], i);

	// 当dl为空时触发Deferred实例的成功事件
	if (!num) Deferred.next(function () { ret.call() });
	ret.canceller = function () {
		for (var i in dl) if (dl.hasOwnProperty(i)) {
			dl[i].cancel();
		}
	};
	return ret;
};

Deferred.earlier = function (dl) {
	// 对入参作处理
	var isArray = false;
	if (arguments.length > 1) {
		dl = Array.prototype.slice.call(arguments);
		isArray = true;
	} else if (Array.isArray && Array.isArray(dl) || typeof dl.length == "number") {
		isArray = true;
	}
	var ret = new Deferred(), values = {}, num = 0;
	for (var i in dl) if (dl.hasOwnProperty(i)) (function (d, i) {
		// d只能是Deferred实例，否则抛异常
		d.next(function (v) {
			values[i] = v;
			// 一个Deferred实例触发成功事件则终止其他Deferred实例触发成功事件了
			if (isArray) {
				values.length = dl.length;
				values = Array.prototype.slice.call(values, 0);
			}
			ret.call(values);
			ret.canceller();
		}).error(function (e) {
			ret.fail(e);
		});
		num++;
	})(dl[i], i);

	// 当dl为空时触发Deferred实例的成功事件
	if (!num) Deferred.next(function () { ret.call() });
	ret.canceller = function () {
		for (var i in dl) if (dl.hasOwnProperty(i)) {
			dl[i].cancel();
		}
	};
	return ret;
};


Deferred.loop = function (n, fun) {
	// 入参n类似于Python中range的效果
	// 组装循环的配置信息
	var o = {
		begin : n.begin || 0,
		end   : (typeof n.end == "number") ? n.end : n - 1,
		step  : n.step  || 1,
		last  : false,
		prev  : null
	};
	var ret, step = o.step;
	return Deferred.next(function () {
		function _loop (i) {
			if (i <= o.end) {
				if ((i + step) > o.end) {
					o.last = true;
					o.step = o.end - i + 1;
				}
				o.prev = ret;
				ret = fun.call(this, i, o);
				if (Deferred.isDeferred(ret)) {
					return ret.next(function (r) {
						ret = r;
						return Deferred.call(_loop, i + step);
					});
				} else {
					return Deferred.call(_loop, i + step);
				}
			} else {
				return ret;
			}
		}
		return (o.begin <= o.end) ? Deferred.call(_loop, o.begin) : null;
	});
};

Deferred.repeat = function (n, fun) {
	var i = 0, end = {}, ret = null;
	return Deferred.next(function () {
		var t = (new Date()).getTime();
		// 当fun的执行耗时小于20毫秒，则马上继续执行下一次的fun；
		// 若fun的执行耗时大于20毫秒，则将UI线程控制权交出，并将异步执行下一次的fun。
		// 从而降低因循环执行耗时操作使页面卡住的风险。
		do {
			if (i >= n) return null;
			ret = fun(i++);
		} while ((new Date()).getTime() - t < 20);
		return Deferred.call(arguments.callee);
	});
};

Deferred.register = function (name, fun) {
	this.prototype[name] = function () {
		var a = arguments;
		return this.next(function () {
			return fun.apply(this, a);
		});
	};
};

Deferred.register("loop", Deferred.loop);
Deferred.register("wait", Deferred.wait);

Deferred.connect = function (funo, options) {
	var target, // 目标函数所属的对象
		func, // 目标函数
		obj; // 配置项
	if (typeof arguments[1] == "string") {
		target = arguments[0];
		func   = target[arguments[1]];
		obj    = arguments[2] || {};
	} else {
		func   = arguments[0];
		obj    = arguments[1] || {};
		target = obj.target;
	}

	// 预设定的入参
	var partialArgs       = obj.args ? Array.prototype.slice.call(obj.args, 0) : [];
	// 指出成功事件的回调处理函数位于原函数的入参索引
	var callbackArgIndex  = isFinite(obj.ok) ? obj.ok : obj.args ? obj.args.length : undefined;
	// 指出失败事件的回调处理函数位于原函数的入参索引
	var errorbackArgIndex = obj.ng;

	return function () {
		// 改造成功事件处理函数，将预设入参和实际入参作为成功事件处理函数的入参
		var d = new Deferred().next(function (args) {
			var next = this._next.callback.ok;
			this._next.callback.ok = function () {
				return next.apply(this, args.args);
			};
		});

		// 合并预设入参和实际入参
		var args = partialArgs.concat(Array.prototype.slice.call(arguments, 0));
		// 打造func的成功事件处理函数，内部将触发d的成功事件
		if (!(isFinite(callbackArgIndex) && callbackArgIndex !== null)) {
			callbackArgIndex = args.length;
		}
		var callback = function () { d.call(new Deferred.Arguments(arguments)) };
		args.splice(callbackArgIndex, 0, callback);

		// 打造func的失败事件处理函数，内部将触发d的失败事件
		if (isFinite(errorbackArgIndex) && errorbackArgIndex !== null) {
			var errorback = function () { d.fail(arguments) };
			args.splice(errorbackArgIndex, 0, errorback);
		}
		// 相当于setTimeout(function(){ func.apply(target, args) })
		Deferred.next(function () { func.apply(target, args) });
		return d;
	};
};
Deferred.Arguments = function (args) { this.args = Array.prototype.slice.call(args, 0) };
Deferred.retry = function (retryCount, funcDeferred, options) {
	if (!options) options = {};

	var wait = options.wait || 0; // 尝试的间隔时间，存在最小时间精度所导致的延时问题
	var d = new Deferred();
	var retry = function () {
		// 有funcDeferred内部触发事件
		var m = funcDeferred(retryCount);
		m.next(function (mes) {
				d.call(mes);
			}).
			error(function (e) {
				if (--retryCount <= 0) {
					d.fail(['retry failed', e]);
				} else {
					setTimeout(retry, wait * 1000);
				}
			});
	};
	// 异步执行retry方法
	setTimeout(retry, 0);
	return d;
};

Deferred.methods = ["parallel", "wait", "next", "call", "loop", "repeat", "chain"];
Deferred.define = function (obj, list) {
	if (!list) list = Deferred.methods;
	// 以全局对象作为默认的入潜目标
    // 由于带代码运行在sloppy模式，因此函数内的this指针指向全局对象。若运行在strict模式，则this指针值为undefined。
    // 即使被以strict模式运行的程序调用，本段程序依然以sloppy模式运行使用
	if (!obj)  obj  = (function getGlobal () { return this })();
	for (var i = 0; i < list.length; i++) {
		var n = list[i];
		obj[n] = Deferred[n];
	}
	return Deferred;
};

this.Deferred = Deferred;
