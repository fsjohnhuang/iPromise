;(function(exports){
	var asap = function(fn){
		setTimeout(fn, 0);
	};

	var Promise = exports.Promise = function (fn) {
      if (typeof this !== "object") throw new TypeError("Promises must be constructed via new");
      if (typeof fn !== "function") throw new TypeError("not a function");
      var state = null; // 状态，null：pending，true：fulfilled，false：rejected
      var value = null; // 当前promise的状态事件处理函数（onFulfilled或onRejected）的入参
      var deferreds = []; // 当前promise的状态事件处理函数和promise链表中下一个promise的状态转换发起函数
      var self = this;
      // 唯一的公开方法
      this.then = function(onFulfilled, onRejected) {
        // 构造新的promise实例并返回，从而形成链式操作
        return new self.constructor(function(resolve, reject) {
          var handler = new Handler(onFulfilled, onRejected, resolve, reject);
          /* 
          注意：这里利用了闭包特性，此处的handle并不是新Promise的handle函数，而是this.then所属promise的handle函数。
              因此handler将被添加到this.then所属promise的deffereds数组中。
              而onFulfilled和onRejected自然成为了this.then所属promise的状态转换事件处理函数，
              而resolve和reject依旧是新promise实例的状态转换触发函数。
          */
          handle(handler);
        });
      };
      // 保存和执行deferreds数组中的元素
      function handle(deferred) {
        if (state === null) {
          deferreds.push(deferred);
          return;
        }
        // asap的作用为将入参的操作压入event loop队列中
        asap(function() {
          /* 下面是简化后的实现方式，个人感觉会直观一些
          var cb = deferred[state ? 'onFulfilled' : 'onRejected'];
          var deferredAction = 'resolve', ret;
          try{
            ret = cb ? cb(value) : value;
          }
          catch (e){
            ret = e;
            deferredAction = 'reject';
          }
          deferred[deferredAction].call(deferred, ret);*/

          var cb = state ? deferred.onFulfilled : deferred.onRejected;
          if (cb === null) {
            (state ? deferred.resolve : deferred.reject)(value);
            return;
          }
          var ret;
          try {
            // 执行当前promise的状态转换事件处理函数
            ret = cb(value);
          } catch (e) {
            // 修改promise链表中下一个promise对象的状态为rejected
            deferred.reject(e);
            return;
          }
          // 修改promise链表中下一个promise对象的状态为fulfilled
          deferred.resolve(ret);
        });
      }
      // promise的状态转换发起函数，触发promise的状态从pending->fulfilled
      function resolve(newValue) {
        try {
          if (newValue === self) throw new TypeError("A promise cannot be resolved with itself.");
          if (newValue && (typeof newValue === "object" || typeof newValue === "function")) {
            var then = newValue.then;
            if (typeof then === "function") {
              // 将控制权移交thenable和promise对象，由它们来设置当前pormise的状态和状态转换事件处理函数的实参
              doResolve(then.bind(newValue), resolve, reject);
              return;
            }
          }
          state = true;
          value = newValue;
          finale();
        } catch (e) {
          reject(e);
        }
      }
      // promise的状态转换发起函数，触发promise的状态从pending->rejected
      function reject(newValue) {
        state = false;
        value = newValue;
        finale();
      }
      // 向链表的下一个promise移动
      function finale() {
        for (var i = 0, len = deferreds.length; i < len; i++) handle(deferreds[i]);
        deferreds = null;
      }
      // 执行构造函数的工厂方法，由工厂方法触发promise的状态转换
      doResolve(fn, resolve, reject);
    }
    // 构造promise的链表逻辑结构
    function Handler(onFulfilled, onRejected, resolve, reject) {
      this.onFulfilled = typeof onFulfilled === "function" ? onFulfilled : null;
      this.onRejected = typeof onRejected === "function" ? onRejected : null;
      this.resolve = resolve;
      this.reject = reject;
    }
    // 对状态转换事件处理函数进行封装后，再传给执行函数
    function doResolve(fn, onFulfilled, onRejected) {
      // done作为开关以防止fn内同时调用resolve和reject方法
      var done = false;
      try {
        fn(function(value) {
          if (done) return;
          done = true;
          onFulfilled(value);
        }, function(reason) {
          if (done) return;
          done = true;
          onRejected(reason);
        });
      } catch (ex) {
        if (done) return;
        done = true;
        onRejected(ex);
      }
    }

    // 将非thenable对象构造为thenable对象
    // 其then方法则返回一个真正的Promise对象
    function ValuePromise(value) {
      this.then = function(onFulfilled) {
        if (typeof onFulfilled !== "function") return this;
        return new Promise(function(resolve, reject) {
          asap(function() {
            try {
              resolve(onFulfilled(value));
            } catch (ex) {
              reject(ex);
            }
          });
        });
      };
    }
    /*
     也可以将非thenable对象构造为Promise对象
    function ValuePromise(value){
      return new Promise(function(resolve){
        resolve(value);
      });
    }*/
    ValuePromise.prototype = Promise.prototype;
    var TRUE = new ValuePromise(true);
    var FALSE = new ValuePromise(false);
    var NULL = new ValuePromise(null);
    var UNDEFINED = new ValuePromise(undefined);
    var ZERO = new ValuePromise(0);
    var EMPTYSTRING = new ValuePromise("");
    Promise.resolve = function(value) {
      if (value instanceof Promise) return value;
      if (value === null) return NULL;
      if (value === undefined) return UNDEFINED;
      if (value === true) return TRUE;
      if (value === false) return FALSE;
      if (value === 0) return ZERO;
      if (value === "") return EMPTYSTRING;
      if (typeof value === "object" || typeof value === "function") {
        try {
          var then = value.then;
          if (typeof then === "function") {
            return new Promise(then.bind(value));
          }
        } catch (ex) {
          return new Promise(function(resolve, reject) {
            reject(ex);
          });
        }
      }
      return new ValuePromise(value);
    };
    Promise.all = function(arr) {
      var args = Array.prototype.slice.call(arr);
      return new Promise(function(resolve, reject) {
        if (args.length === 0) return resolve([]);
        var remaining = args.length;
        function res(i, val) {
          try {
            if (val && (typeof val === "object" || typeof val === "function")) {
              var then = val.then;
              if (typeof then === "function") {
                then.call(val, function(val) {
                  // 对于thenable和promise对象则订阅onFulfilled事件获取处理结果值
                  res(i, val);
                }, reject);
                return;
              }
            }
            args[i] = val;
            // 检测是否所有入参都已返回值
            if (--remaining === 0) {
              resolve(args);
            }
          } catch (ex) {
            reject(ex);
          }
        }
        for (var i = 0; i < args.length; i++) {
          res(i, args[i]);
        }
      });
    };
    Promise.reject = function(value) {
      return new Promise(function(resolve, reject) {
        reject(value);
      });
    };
    Promise.race = function(values) {
      return new Promise(function(resolve, reject) {
        values.forEach(function(value) {
          // 将数组元素转换为promise对象
          // 由resolve函数内部的标识位done来保证onFulfilled函数仅执行过一次
          Promise.resolve(value).then(resolve, reject);
        });
      });
    };

    /* 也可以通过这样形式实现
    Promise.race = function(values){
      return new Promise(function(resolve, reject){
        var over = 0;
        for (var i = 0, len = values.length; i < len && !over; ++i){
          var val = values[i];
          if (val && typeof val.then === 'function'){
            val.then(function(res){
              !over++ && resolve(res);
            }, reject);
          }
          else{
            !over++ && resolve(val);
          }
        }
      });
    };*/
    Promise.prototype["catch"] = function(onRejected) {
      return this.then(null, onRejected);
    };
}(window));