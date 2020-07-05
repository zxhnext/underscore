(function (root) {
	var push = Array.prototype.push;

	var _ = function (obj) {
		if (obj instanceof _) { // 是否是_实例对象
			return obj;
		}
		// 第一次this指向window(调用_者))，返回new _(obj)，
		// new _(obj)时重新执行_函数 ，这时的this为_，所以!(this instanceof _)为false，执行下一步
		if (!(this instanceof _)) {
			return new _(obj);
		}
		this._wrapped = obj;
	}

	_.unique = function (arr, callback) {
		var ret = [];
		var target, i = 0;
		for (; i < arr.length; i++) {
			var target = callback ? callback(arr[i]) : arr[i];
			if (ret.indexOf(target) === -1) {
				ret.push(target);
			}
		}

		return ret;
	}

	//开启链接式的调用
	_.chain = function (obj) {
		// obj为_中传的参数，并非_实例
		// _([1, 2, 3, 4]).chain()这里的chain()会从_实例上拿
		// 所以obj为this._wrapped = [1, 2, 3, 4]
		// 创建了_实例
		var instance = _(obj);
		instance._chain = true;
		// 返回_实例对象
		return instance;
	}

	//辅助函数    obj   数据结果
	var result = function (instance, obj) {
		// 如果有_chain返回_实例对象，否则返回函数值
		return instance._chain ? _(obj).chain() : obj;
	}

	_.prototype.value = function () {
		return this._wrapped;
	}

	// 遍历对象的可枚举key,并返回一个数组
	_.functions = function (obj) {
		var result = [];
		var key;
		for (key in obj) {
			result.push(key);
		}
		return result;
	}


	/**
	 * @params obj 当前传入值
	 * @params iteratee 函数
	 * @params context 作用域
	 */
	_.map = function (obj, iteratee, context) {
		//生成不同功能迭代器
		var iteratee = cb(iteratee, context);
		//分辨 obj是数组对象, 还是object对象
		var keys = !_.isArray(obj) && Object.keys(obj);
		var length = (keys || obj).length;
		// 生成一个空数组
		var result = Array(length);

		for (var index = 0; index < length; index++) {
			var currentKey = keys ? keys[index] : index;
			result[index] = iteratee(obj[currentKey], index, obj);
		}

		return result;
	}

	/**
	 * @params iteratee 函数
	 * @params context 作用域对象
	 * @params count iteratee函数传入的参数个数
	 */
	var cb = function (iteratee, context, count) {
		// 如果没传，默认生成一个迭代器
		if (iteratee == null) {
			return _.identity;
		}

		if (_.isFunction(iteratee)) {
			return optimizeCb(iteratee, context, count);
		}
	}
	/**
	 * optimizeCb优化迭代器
	 * @params func iteratee函数
	 * @params context 作用域对象
	 * @params count iteratee函数传入的参数个数
	 */
	var optimizeCb = function (func, context, count) {
		// 判断context是否等于undefined
		if (context == void 0) {
			return func;
		}

		switch (count == null ? 3 : count) {
			case 1:
				return function (value) {
					return func.call(context, value);
				};
			case 3:
				return function (value, index, obj) {
					return func.call(context, value, index, obj);
				};
		}
	}

	//默认迭代器
	_.identity = function (value) {
		return value;
	}

	//类型检测
	_.isArray = function (array) {
		return toString.call(array) === "[object Array]";
	}


	_.each = function (target, callback) {
		var key, i = 0;
		if (_.isArray(target)) {
			var length = target.length;
			for (; i < length; i++) {
				callback.call(target, target[i], i);
			}
		} else {
			for (key in target) {
				callback.call(target, key, target[key]);
			}
		}
	}

	// 判断是否是"Function", "String", "Object", "Number"
	_.each(["Function", "String", "Object", "Number"], function (name) {
		_["is" + name] = function (obj) {
			return toString.call(obj) === "[object " + name + "]";
		}
	});

	//mixin  
	// 想要调用_实例上的方法，则该方法必须定义在_的prototype上，以下为扩展到原型上的方法，
	// 如果_为普通函数，则可以直接调用_上的方法
	_.mixin = function (obj) {
		// _.functions(obj)所有可扩展方法的名称的数组
		_.each(_.functions(obj), function (name) {
			var func = obj[name];
			// 该方法在_环境下执行,所以this为_实例
			_.prototype[name] = function () {
				var args = [this._wrapped];
				// 以unique为例，arguments即调用unique时传入的参数
				push.apply(args, arguments); // 合并传入_的参数与unique的参数
				// 如果调用了chain()，此时_chain返回了instance(_)实例对象，此实例对象_chain为true
				// result方法会判断_chain是否为true,从而选择返回_实例或函数值
				return result(this, func.apply(this, args));
			}
		});
	}

	_.mixin(_);
	root._ = _;
})(this);