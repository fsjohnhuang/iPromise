iPromise v0.7.0
========

An implementation for promises/A+<br/>

###In This Documentation
1. Getting Started
2. Usage
3. API

## Getting Started
###1.Include iPromise on your site.
Compiled and production-ready code can be found in the `dist` directory.Then `src` directory contains development code. Unit tests are located in the `test` directory.
````
<script src="dist/js/iPromise.js"></script>
````
## Usage
###1.Sample1
````
<script>
  iPromise(function(resolve, reject){
    setTimeout(1000, resolve, 'hello world')
  }).then(function(val){
    console.log(val) // 'hello world'
  })
</script>
````
###2.Sample2
````
<script>
  iPromise.
</script>
````
## API
###Constructor
####`iPromise(mixin, arg)`
**@description** Create new iPromise object.<br/>
**@param** {(Function.<Function fulfilledFn,Function rejectedFn>|GeneratorFunction)} [mixin] - Factory function to change the status of iPromise object. Or a Generator Function(feature by ES6).<br/>
**@param** {...\*} arg - It would be work when `mixin` is an instanceof GeneratorFunction.<br/>
**@return** {?iPromise} - The returns would be undefined when `mixin` is an instanceof GeneratorFunction.<br/>
````
/* without mixin */
var p1 = iPromise()

/* mixin is function */
var p2 = iPromise(function(resolve, reject){
  setTimeout(function(){
    resolve('hello', 'world', '!')
  }, 5000)
})

/* mixin is generator function */
iPromise(function *(name, city){
  console.log('Welcome to ' + city)

  var msg
  try{
    msg = yield wrapMsg(name)
  }
  catch(e){
    msg = 'Hi, ' + name
  }
  console.log(msg)
}, 'fsjohnhuang', 'fs')
````
###Instance Methods
####`iPromise#then(fulfilledFn, rejectedFn, finallyFn)`
**@description** Subscribes the iPromise object's status changed event.<br/>
**@param** {Function.<\*>} fulfilledFn - It would be called when iPromise object's status is from pending to fulfilled<br/>
**@param** {Function.<\*>} rejectedFn - It would be called when iPromise object's status is from pending to rejected<br/>
**@param** {Function.<\*>} finallyFn - It would be called when iPromise object's status is changed and has subscribed fulfilled or rejected status changing event<br/>
**@return** {iPromise} - The subset of iPromise object which contains `iPromise#then`, `iPromise#catch` and `iPromise#wait` only.<br/>
####`iPromise#catch(rejectedFn, finallyFn)`
**@description** Subscribes the iPromise object's status changed event which is from pending to rejected.<br/>
**@param** {Function.<\*>} rejectedFn - It would be called when iPromise object's status is from pending to rejected<br/>
**@param** {Function.<\*>} finallyFn - It would be called when iPromise object's status is changed and has subscribed rejected status changing event<br/>
**@return** {iPromise} - The subset of iPromise object which contains `iPromise#then`, `iPromise#catch` and `iPromise#wait` only.<br/>
####`iPromise#resolve(arg)`
**@description** Change the status of iPromise object from pending to fulfilled.<br/>
**@param** {...\*} arg - It would be as the arguments of fulfilled callback function which is invoked first.<br/>
````
/* arg is such as ({*} arg) */
iPromise()
  .then(function(arg){
    console.log(arg)
  })
  .resolve(1)
/* arg is such as (arg1, arg2[, argn]*) */
iPromise()
  .then(function(arg){
    console.log(arg[0] + arg[1])
  })
  .resolve(1, 2)
````
####`iPromise#reject(arg)`
**@description** Change the status of iPromise object from pending to rejected.<br/>
**@param** {...\*} arg - It would be as the arguments of rejected callback function which is invoked first.<br/>
````
/* arg is such as ({*} arg) */
iPromise()
  .then(null, function(arg){
    console.log(arg)
  })
  .reject(1)
/* arg is such as (arg1, arg2[, argn]*) */
iPromise()
  .catch(function(arg){
    console.log(arg[0] + arg[1])
  })
  .reject(1, 2)
````
####`iPromise#wait(ms)`
**@description** Invokes the next callback function after ms milliseconds without changing the status of iPromise object.<br/>
**@param** {number} ms - The time to wait.<br/>
**@return** {iPromise} - The subset of iPromise object which contains `iPromise#then`, `iPromise#catch` and `iPromise#wait` only.<br/>
````
iPromise()
  .then(function(arg){
    return +new Date()
  })
  .wait(1000)
  .then(function(arg){
    console.log((+new Date()) - arg > 1000) // true
  }).resolve()
````
###Function Properties
####`iPromise.all(condition)`
####`iPromise.any(condition)`
####`iPromise.wait(ms, arg)`

**@description** 
**@param** 
**@return** 

##Changelog
###v0.7.0
**全局重构**<br/>
**新增**<br/>
1. utils模块，将原来位于iPromise模块中的辅助函数迁移到utils模块中。<br/>
**修改**<b/>
1. `then({Function} fulfilledFn,{Function} rejectedFn,{Function} progressFn,{Function} finallyFn)`-->`then({Function} fulfilledFn,{Function} rejectedFn,{Function} finallyFn)`<br/>
2. `catch({Function} rejectedFn)`-->`catch({Function} rejectedFn,{Function} finallyFn)`<br/>
3. `iPromise.wait({Number} ms)`-->`iPromise.wait({Number} ms/*, ...args*/)`<br/>
**删除**<br/>
1. `notify()`<br/>
2. `finally()`<br/>

###v0.6.1
添加mocha、chai作为单元测试套件<br/>
添加blanket作为覆盖率测试库<br/>
添加npm作为依赖管理工具<br/>

###v0.6.0
**bug修复**<br/>
1. \#20141217 `iPromise({Function} mixin)`，没有捕获mixin内部抛出同步异常->捕获mixin内部抛出同步异常，并将异常信息作为入参调用deferred实例的reject函数。<br/>
2. `iPromise({Function|Object} mixin?)`，若mixin为Object，则返回的为deferred实例，若mixin为Function，则返回的是Promise实例。<br/>
**新特性**<br/>
1. `iPromise`构造器接受ES6的Generator Function。并返回undefined<br/>
````
var getData = function(dataSrc){
  return iPromise(function(r){
  	setTimeout(function(){
  		r(dataSrc + ' has loaded')
  	}, 1000)
  })
}
var getTpl = function(tplSrc){
  return iPromise(function(r){
  	setTimeout(function(){
  		r(tplStr + ' has loaded')
  	}, 2000)
  })
}
var render = function(data, tpl){
	throw new Error('OMG!')
}
iPromise(function *(dataSrc, tplSrc){
  try{
  	var data = yield getData(dataSrc)
  	var tpl = yield getTpl(tplSrc)
  	render(data, tpl)
  }
  catch(e){
  	console.log(e)
  }
  console.log('over!')
}, 'dummyData.json', 'dummyTpl.json')
/* 结果如下 */
// 等待1秒多显示 dummyData.json has loaded
// 等待2秒多显示 dummyTpl.json has loaded
// 显示 Error: OMG!
//     Stack trace:
//     test10/render/</<@file:///home/fsjohnhuang/repos/iPromise/test/v0.0.2.html:190:6
// 显示 over!
````

###v0.5.0
**新特性**<br/>
1. 新增`{Promise} wait({number} ms)`和`{Promise} iPromise.wait({number} ms)`，等待ms毫秒在执行后续的回调函数，此方法不会改变Deferred实例状态和责任链传递的值。<br/>

###v0.4.0
**bug修复**<br/>
1. \#20141215 可重复添加回调函数->仅能添加一次回调函数<br/>

**新特性**<br/>
1. 新增API`iPromise.all([Object|Array}|...[*])`, 当所有入参均成功返回值时则执行成功回调函数<br/>
````
var thenable = {
  then: function(r){
  	setTimeout(function(){
  		r('hi', 'there')
  	}, 1000)
  }
}
var name = 'fsjohnhuang'
var promise1 = iPromise(function(r){
  	setTimeout(function(){
  		r('I\'m')
  	}, 2000)
})
iPromise.all(thenable, name, promise1).then(function(arg){
	alert(arg[0][0] + ' ' + arg[0][1] + ',' + arg[2] + ' ' + arg[1]) // 两秒多后显示hi there,I'm fsjohnhuang
})
iPromise.all([thenable, name, promise1]).then(function(arg){
	alert(arg[0][0] + ' ' + arg[0][1] + ',' + arg[2] + ' ' + arg[1]) // 两秒多后显示hi there,I'm fsjohnhuang
})
iPromise.all({a:thenable, b:name, c:promise1}).then(function(arg){
	alert(arg.a[0] + ' ' + arg.a[1] + ',' + arg.c + ' ' + arg.b) // 两秒多后显示hi there,I'm fsjohnhuang
})
````
2. 新增API`iPromise.any([Object|Array}|...[*])`，当有一个入参成功返回时则执行成功回调函数<br/>
````
var thenable = {
  then: function(r){
  	setTimeout(function(){
  		r('hi', 'there')
  	}, 1000)
  }
}
var name = 'fsjohnhuang'
var promise1 = iPromise(function(r){
  	setTimeout(function(){
  		r('I\'m')
  	}, 2000)
})
iPromise.all(thenable, name, promise1).then(function(arg){
	alert(arg) // 显示fsjohnhuang
})
iPromise.all([thenable, name, promise1]).then(function(arg){
	alert(arg) // 显示fsjohnhuang
})
iPromise.all({a:thenable, b:name, c:promise1}).then(function(arg){
	alert(arg) // 显示fsjohnhuang
})
````


###v0.3.0
**新特性**<Br/>
1. 支持上一个resolveFn或rejectFn函数返回值为Promise对象时，晚绑定的resolveFn或rejectFn均可以该Promise对象作为入参被执行。<br/>
````
var deferred = iPromise(function(resolve){
	resolve()
})
var promise = deferred.then(function(){
	return new iPromise(function(resolve){
		resolve('hello', 'world')
	})	
})
// 一秒多后显示hello world
setTimeout(function(){
	promise.then(function(arg1, arg2){
		alert(arg1 + ' ' + arg2)	
	})	
}, 1000)
````
2. 支持上一个resolveFn或rejectFn函数返回值为thenable对象时，晚绑定的resolveFn或rejectFn均可以该Promise对象作为入参被执行。<br/>
````
var deferred = iPromise(function(resolve){
	resolve()
})
var promise = deferred.then(function(){
	var thenable = {
		then: function(resolve){
			resolve('hello', 'world')
		}
	}	
	return thenable
})
// 一秒多后显示hello world
setTimeout(function(){
	promise.then(function(arg1, arg2){
		alert(arg1 + ' ' + arg2)	
	})	
}, 1000)
````


###v0.2.0
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

###v0.1.0
实现基础接口API<br/>
1. `new iPromise([fn(resolve, reject)])`，构造promise实例，可传入一个带resolve函数、reject函数的入参方法。<br/>
2. `then([{Function} fulfilledHandler[, {Function} rejectedHandler]])`，重写fulfilled和rejected回调。<br/>
3. `resolve([{Any} data])`，promise实例方法，用于触发fulfilled回调。<br/>
4. `reject([{Any} data])`，promise实例方法，用于触发rejected回调。<br/>

##Referrence
[prmises/A+](https://promisesaplus.com/)<br/>
[prmises/A](https://www.promisejs.org/)<br/>
[JavaScript异步编程的模式](http://javascript.ruanyifeng.com/advanced/asynchronous.html)<br/>
[深入理解Promise五部曲](http://segmentfault.com/blog/kk_470661/1190000000586666)<br/>

