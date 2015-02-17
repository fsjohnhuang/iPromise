/*!
 * 异步事件系统
 * @author fsjohnhuang
 * @version 0.1.0
 */
var TinyES = require('./TinyES')
var setImmediate = require('./utils').setImmediate

var AsyncES = module.exports = function(evtName){
	if (!(this instanceof AsyncES)) return new AsyncES(evtName)
		
	var latch, taskQ = (function(){
		var first, last

		return {
			push: function(task){
				if (!first) first = task
				if (last) last.next = task
				last = task
			},
			drain: function(){
				while (first){
					first()	
					first = first.next
				}
				last = null 
			}
		}	
	}())

	return {create: function(/*Function<>*/getArgsOfTrigger){
		var es = new TinyES()
		return {
			one: function(cb, $this){
				es.one(evtName, cb, $this)
			},
			trigger: function(){
				taskQ.push(function(){
					es.trigger.apply(es, [evtName].concat(getArgsOfTrigger ? getArgsOfTrigger() : []))
				})
				if (!latch){
					latch = setImmediate(function(){
						taskQ.drain()	
						latch = void 0
					})
				}
			}
		}
	}}
}