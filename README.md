iPromise v0.0.2
========

An implementation for promises/A+<br/>

##v0.0.2
**全局重构，API说明**<br/>
1. `{Deferred} [new] iPromise({Object|Function<this:null,{Function} resovle, {Function} reject, {Function} notify>})`，构造Deferred实例，入参为Object类型时则将入参的属性和方法附加到返回的Deferred实例上，若入参为函数则可在函数体内调用resolve、reject或notify方法触发调用Deferred实例的回调函数的请求。<br/>
2. `{Promise} then({Function} resolveFn?, {Function} rejectFn?, {Function} progressFn?, {Function} finally?)`，向Deferred实例添加四类回调函数。<br/>
3. `{Promise} catch({Function} rejectFn?)`，向Deferred实例添加rejected状态的回调函数，仅能执行一次。<br/>
4. `{Promise} progress({Function} progressFn?)`，向Deferred实例添加可以多次执行的回调函数<br/>
5. `{Promise} finally{Function} finallyFn?)`，向Deferred实例添加模拟finally语句的回调函数，在调用resovle和reject函数时必定会执行该函数，并且当该函数抛异常时会将当前Deferred的状态设置为rejected<br/>
6. `resolve(...[*])`<br/>
7. `reject(...[*])`<br/>
8. `notify(...[*])`<br/>

**特性**<br/>
1. iPromise包含Deferred和Promise两类操作集合，其中Promise是Deferred的子集，仅提供添加回调函数的功能。而Deferred集合还提供发起执行回调函数请求的功能。<br/>
2. 回调函数支持任意数目的入参。<br/>
3. resolveFn和rejectFn函数支持晚绑定。<br/>
````
var deferred = iPromise(function(resolve){
	resolve('hello', 'world')
})
setTimeout(function(){
	deferred.then(function(arg1, arg2){
		alert(arg1 + ' ' + arg2) // 一秒多后，显示hello world
	})
}, 1000)
````

##v0.0.1
实现基础接口API<br/>
1. `new iPromise([fn(resolve, reject)])`，构造promise实例，可传入一个带resolve函数、reject函数的入参方法。<br/>
2. `then([{Function} fulfilledHandler[, {Function} rejectedHandler]])`，重写fulfilled和rejected回调。<br/>
3. `resolve([{Any} data])`，promise实例方法，用于触发fulfilled回调。<br/>
4. `reject([{Any} data])`，promise实例方法，用于触发rejected回调。<br/>

##参考
[prmises/A+](https://promisesaplus.com/)<br/>
[prmises/A](https://www.promisejs.org/)<br/>
[JavaScript异步编程的模式](http://javascript.ruanyifeng.com/advanced/asynchronous.html)<br/>
[深入理解Promise五部曲](http://segmentfault.com/blog/kk_470661/1190000000586666)<br/>

