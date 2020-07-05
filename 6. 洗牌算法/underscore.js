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
			case 4:
				return function (memo, value, index, obj) {
					return func.call(context, memo, value, index, obj);
				};
		}
	}

	//默认迭代器
	_.identity = function (value) {
		return value;
	}

	// rest 参数
	_.restArguments = function (func) {
		//rest参数位置
		var startIndex = func.length - 1; //1
		return function () {
			var length = arguments.length - startIndex,
				rest = Array(length),
				index = 0;
			// rest数组中的成员  rest==[2,3,4]
			for (; index < length; index++) {
				rest[index] = arguments[index + startIndex]; //1
			}
			//非rest参数成员的值一一对应  args  ===2  []
			var args = Array(startIndex + 1);
			for (index = 0; index < startIndex; index++) {
				args[index] = arguments[index]; //args [1]
			}

			args[startIndex] = rest; //args [1,[2,3,4]]
			return func.apply(this, args);
		}
	}

	var Ctor = function () {};

	//Object.create polyfill   Object.create(object)   baseCreate(object)
	_.baseCreate = function (prototype) {
		if (!_.isObject(prototype)) return {};
		if (Object.create) return Object.create(prototype);
		Ctor.prototype = prototype;
		var result = new Ctor;
		Ctor.prototype = null;
		return result;
	};

	/**
	 * @params obj 当前作用对象
	 * @params iteratee 迭代器函数
	 * @params memo 初始值
	 * @params init 是否有初始值
	 */
	var createReduce = function (dir) {
		//累加
		var reduce = function (obj, iteratee, memo, init) {
			var keys = !_.isArray(obj) && Object.keys(obj),
				length = (keys || obj).length,
				index = dir > 0 ? 0 : length - 1;

			// 如果不传memo，取第0项或最后一项值
			if (!init) {
				memo = obj[keys ? keys[index] : index];
				index += dir; // 此时下标加+1/-1
			};
			for (; index >= 0 && index < length; index += dir) {
				var currnteKey = keys ? keys[index] : index;
				// memo=>上一次的值 obj[currnteKey]=>当前对象值 currentKey=>当前对象下标 obj=>当前对象
				memo = iteratee(memo, obj[currnteKey], currnteKey, obj)
			}
			return memo;
		}
		//memo  最终能累加的结果     每一次累加的过程
		return function (obj, iteratee, memo, context) {
			var init = arguments.length >= 3;
			return reduce(obj, optimizeCb(iteratee, context, 4), memo, init);
		}
	}
	_.reduce = createReduce(1); //1 || -1  1代表从首开始，-1代表从末位开始

	/**
	 * predicate 真值检测(重点: 返回值)
	 * @params obj 当前作用对象
	 * @params iteratee 迭代器函数
	 * @params context 上下文对象
	 */
	_.filter = _.select = function (obj, predicate, context) {
		var results = [];
		predicate = cb(predicate, context);
		_.each(obj, function (value, index, list) {
			if (predicate(value, index, list)) results.push(value);
		});
		return results;
	};

	// (dir === 1 => 从前往后找)  (dir === -1 => 从后往前找) 
	function createPredicateIndexFinder(dir) {
		return function (array, predicate, context) {
			predicate = cb(predicate, context); // _.isNaN
			var length = array.length;
			// 根据 dir 变量来确定数组遍历的起始位置
			var index = dir > 0 ? 0 : length - 1;

			for (; index >= 0 && index < length; index += dir) {
				// 找到第一个符合条件的元素
				// 并返回下标值
				if (predicate(array[index], index, array)) //true
					return index;
			}
			return -1;
		};
	}

	_.isNaN = function (obj) { // NaN
		return _.isNumber(obj) && obj !== obj;
	};

	_.findIndex = createPredicateIndexFinder(1);
	_.findLastIndex = createPredicateIndexFinder(-1);

	/**
	 * predicate 真值检测(重点: 返回值)
	 * @params array 数组对象
	 * @params obj 目标值
	 * @params iteratee 迭代器函数
	 * @params context 上下文对象
	 */
	_.sortedIndex = function (array, obj, iteratee, context) {
		// 重点:cb函数 if (iteratee == null) {return function(value){return value;}}
		iteratee = cb(iteratee, context, 1);
		var value = iteratee(obj);
		var low = 0,
			high = array.length;
		// 二分查找
		while (low < high) { //4  4 
			var mid = Math.floor((low + high) / 2); //4
			if (iteratee(array[mid]) < value) //  5 < 5
				low = mid + 1; //4
			else
				high = mid; //4
		}

		return low; //4
	};

	/**
	 * predicate 真值检测(重点: 返回值)
	 * @params dir 1=>正向查找 -1=>反向查找
	 * @params predicateFind 处理特殊情况 如果要查找的元素是 NaN 类型 NaN !== NaN
	 * @params sortedIndex 二分查找
	 */
	function createIndexFinder(dir, predicateFind, sortedIndex) {
		// API 调用形式
		// _.indexOf(array, value, [isSorted])
		// array=>数组对象 item=>要查询的值 idx=>数组是否经过排序(Boolean)
		return function (array, item, idx) {
			var i = 0,
				length = array.length;

			// 第三个参数true用二分查找优化 否则 遍历查找
			if (sortedIndex && _.isBoolean(idx) && length) {
				// 能用二分查找加速的条件
				// 用 _.sortedIndex 找到有序数组中 item 正好插入的位置
				idx = sortedIndex(array, item); // 返回下标值
				return array[idx] === item ? idx : -1;
			}

			//特殊情况 如果要查找的元素是 NaN 类型  NaN !== NaN
			if (item !== item) {
				// 传入数组，_isNaN函数
				idx = predicateFind(slice.call(array, i, length), _.isNaN);
				return idx >= 0 ? idx + i : -1;
			}

			// 非上述情况正常遍历
			for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
				if (array[idx] === item) return idx;
			}

			return -1;
		};
	}

	//_.findIndex  特殊情况下的处理方案  NAN  
	//_.sortedIndex 针对排序的数组做二分查找  优化性能
	_.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
	_.lastIndexOf = createIndexFinder(-1, _.findLastIndex);


	/**
	 * 返回一个[min, max] 范围内的任意整数
	 */
	_.random = function (min, max) {
		if (max == null) {
			max = min;
			min = 0;
		}
		// 3-6  3    0-1*4  !0 !4
		return min + Math.floor(Math.random() * (max - min + 1));
	};

	/**
	 * 创建一个数组或对象副本
	 */
	_.clone = function (obj) {
		return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
	};

	/**
	 * 返回乱序之后的数组副本
	 */
	_.shuffle = function (array) {
		// array.length
		// 第二个参数为正无穷大，_.sample函数内部会自行判断，获取array长度为第二个参数
		return _.sample(array, Infinity);
	}

	/**
	 * 抽样函数
	 * @params array 牌堆
	 * @params n 抽样数量
	 */
	_.sample = function (array, n) {
		if (n == null) {
			return array[_.random(array.length - 1)];
		}
		var sample = _.clone(array);
		var length = sample.length;
		var last = length - 1;
		// 防止样本值数量小于抽取值
		n = Math.max(Math.min(n, length), 0);
		// 洗牌
		for (var index = 0; index < n; index++) {
			//随机数   index  n
			var rand = _.random(index, last);
			var temp = sample[index];
			sample[index] = sample[rand]; //交换
			sample[rand] = temp; //交换
		}
		return sample.slice(0, n);
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
	_.each(["Function", "String", "Object", "Number", "Boolean"], function (name) {
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