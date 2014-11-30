iPromise v0.0.1
========

An implementation for promises/A+<br/>

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

