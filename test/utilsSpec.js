describe('utils', function(){
	var expect
	before('initialize chai', function(){
		expect = chai.expect
	})

	describe('#impls', function() {
		var Animal, Bird, Chicken, impls = require('utils').impls
		beforeEach(function(){
			Animal = function(){}
			Bird = function(){}
			Chicken = {then: function(){return 1}}
		})
		it('expect chicken to be an instanceof Bird', function(){
			var chicken = impls(Chicken, Bird)
			expect(chicken).to.be.an.instanceof(Bird)
		})
		it('expect Bird to be an instanceof Function', function(){
			impls(Chicken, Bird)
			expect(Bird).to.be.an.instanceof(Function)
		})
		it('expect chicken to be an instanceof Animal', function(){
			Bird.prototype = new Animal()
			var chicken = impls(Chicken, Bird)
			expect(chicken).to.be.an.instanceof(Animal)
		})
	})
})