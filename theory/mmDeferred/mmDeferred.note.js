define("mmDeferred", ["avalon"], function(avalon) {
    var noop = function() {
    }
    function Deferred(mixin) {
        var state = "pending"
            // 标识是否已经添加了回调函数
            , dirty = false
        function ok(x) {
            state = "fulfilled"
            return x
        }
        function ng(e) {
            state = "rejected"
            // 将异常往后传递
            throw e
        }
        // Deferred实例
        var dfd = {
            callback: {
                resolve: ok,
                reject: ng,
                notify: noop,
                ensure: noop
            },
            dirty: function() {
                return dirty
            },
            state: function() {
                return state
            },
            promise: {
                then: function() {
                    return _post.apply(null, arguments)
                },
                otherwise: function(onReject) {
                    return _post(0, onReject)
                },
                ensure: function(onEnsure) {
                    return _post(0, 0, 0, onEnsure)
                },
                _next: null
            }
        }
        if (typeof mixin === "function") {
            mixin(dfd.promise)
        } else if (mixin && typeof mixin === "object") {
            for (var i in mixin) {
                if (!dfd.promise[i]) {
                    dfd.promise[i] = mixin[i]
                }
            }
        }


        "resolve,reject,notify".replace(/\w+/g, function(method) {
            dfd[method] = function() {
                var that = this, args = arguments
                if (that.dirty()) {
                    // 若已经添加了回调函数，则马上同步调用
                    _fire.call(that, method, args)
                } else {
                    // 若未添加回调函数，则发起异步调用，让当前代码块的后续部分有足够的时间添加回调函数
                    Deferred.nextTick(function() {
                        _fire.call(that, method, args)
                    })
                }
            }
        })

        return dfd

        /** 精彩之处：
         * 由于JS会将变量声明自动提升(hoist)到代码块的头部
         * 因此这里将私有方法写在return语句之后从而更好地格式化代码结构
         */

        // 添加回调函数到当前Deferred实例上
        function _post() {
            var index = -1, fns = arguments;
            "resolve,reject,notify,ensure".replace(/\w+/g, function(method) {
                var fn = fns[++index];
                if (typeof fn === "function") {
                    dirty = true
                    if (method === "resolve" || method === "reject") {
                        // 将修改Deferred实例状态的功能封装到回调函数中
                        // 也就是先调用回到函数再修改实例状态
                        dfd.callback[method] = function() {
                            try {
                                var value = fn.apply(this, arguments)
                                state = "fulfilled"
                                return value
                            } catch (err) {
                                state = "rejected"
                                return err
                            }
                        }
                    } else {
                        dfd.callback[method] = fn;
                    }
                }
            })
            // 创建链表的下一个Deferred实例
            var deferred = dfd.promise._next = Deferred(mixin)
            return deferred.promise;
        }

        function _fire(method, array) {
            var next = "resolve", value
            if (this.state() === "pending" || method === "notify") {
                var fn = this.callback[method]
                try {
                    value = fn.apply(this, array);
                } catch (e) {//处理notify的异常
                    value = e
                }
                if (this.state() === "rejected") {
                    next = "reject"
                } else if (method === "notify") {
                    next = "notify"
                }
                array = [value]
            }
            var ensure = this.callback.ensure
            if (noop !== ensure) {
                try {
                    ensure.call(this)//模拟finally
                } catch (e) {
                    next = "reject";
                    array = [e];
                }
            }
            var nextDeferred = this.promise._next
            if (Deferred.isPromise(value)) {
                // 如果回调函数返回值为Deferred实例，那么就将该实例插入nextDeferred之前
                value._next = nextDeferred
            } else {
                if (nextDeferred) {
                    _fire.call(nextDeferred, next, array);
                }
            }
        }
    }

    window.Deferred = Deferred;
    Deferred.isPromise = function(obj) {
        return !!(obj && typeof obj.then === "function");
    };

    function some(any, promises) {
        var deferred = Deferred(), n = 0, result = [], end
        function loop(promise, index) {
            promise.then(function(ret) {
                if (!end) {
                    result[index] = ret//保证回调的顺序
                    n++;
                    if (any || n >= promises.length) {
                        deferred.resolve(any ? ret : result);
                        end = true
                    }
                }
            }, function(e) {
                end = true
                deferred.reject(e);
            })
        }
        for (var i = 0, l = promises.length; i < l; i++) {
            loop(promises[i], i)
        }
        return deferred.promise;
    }
    Deferred.all = function() {
        return some(false, arguments)
    }
    Deferred.any = function() {
        return some(true, arguments)
    }
    Deferred.nextTick = avalon.nextTick
    return Deferred
})

