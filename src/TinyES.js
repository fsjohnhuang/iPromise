/*!
 * 迷你事件系统
 * @author fsjohnhuang
 * @version 0.1.0
 */

var TinyES = module.exports = function(){
	var evtQ = {}		
	var sub = function(evt){
		if (!evtQ[evt.name]) evtQ[evt.name] = []
		evtQ[evt.name].push(evt)
	}

	this.one = function(name, cb, $this){
		sub({
			name: name,
			times: 1,
			cb: function(){
				cb.apply($this, arguments)
			}
		})
	}
	this.trigger = function(name /*, {...*} args*/){
		if (!evtQ[name]) return
		var resubs = [], evt = evtQ[name].pop()
		while (evt){
			evt.cb.apply(null, [].slice.call(arguments, 1))
			if (evt.times !== +evt.times || --evt.times > 0) resubs.push(evt)
			evt = evtQ[name].pop()
		}
		evtQ[name] = resubs
	}
}