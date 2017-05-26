Backbone.Model
A、 核心对象
	a、 attributes  _previousAttributes  changed
		一、 attributes
		二、 _previousAttributes
		三、 changed
	b、 _events
		一、 change
		二、 change:[attribute]
		三、 destroy
		四、 invalid
		五、 request
	c、 _changing  _pending
	d、 idAttribute: 'id'
	e、 this.validationError: null
		值为false之类的都是正常的,值为true则为验证不通过
	f、 this.collection
		这个的用途其实就只有一个,就是在该实例化对象生成时,直接说明它是属于哪个组合的
B、 核心功能
	a、 核心功能一: change  change:[attribute]
	b、 核心功能二: save  fetch  destroy
		一、 this.save() 代码其实是用 Backbone.sync(method, model, options) 来执行的 
			1. 使用可能
				(1) car1.save();
				(2) car1.save("user", "xbl2");
				(3) car1.save("user", "xbl3", {});
			1. 核心代码在于:var xhr = this.sync(method, this, options);
			1. 根据三个参数生成真正能用的 attrs options
				var attrs;
	            if(key == null || typeof key === "object") {
	                attrs = key;
	                options = val;
	            }else {
	                attrs = {};
	                attrs[key] = val;
	            }
	        1. 扩展 options = _.extend({parse: true, validate: true}, options);
			2. method 共有五种可能
				var methodMap = {
					'create': 'POST',
					'update': 'PUT',
					'patch': 'PATCH',
					'delete': 'DELETE',
					'read': 'GET'
				};
			4. 生成ajax的 method 方法
			3. 生成 options.success
				var success = options.success;
		        options.success = function(resp) {
		           success && success.apply(this, arguments); 
		        };
		    5. 在 options.success 方法中,只有一个参数,就是异步的返回值
		    	(1) 若在 this.save("user", "xbl", {success: function() {}}) 
		    		的 options 里存在 success, 则执行 success && success.apply(this, arguments); 
		    	(2) 将异步返回的数据使用 model.set() 设置
		    		model.set(resp);
		    	(3) 模型触发sync事件 model.trigger("sync")
		    		model.trigger("sync", model, resp, options);
		    6. options 参数分析
		    	(1) options.context
		    	(2) options.success
		    	(3) options.parse
		    	(4) options.wait
		    		应该说,这个的意义就是在于异步前还是异步后调用 model.set() 来改变属性以触发相应的回调;
		    		而这里的改变属性,当然是this.save(key,val)里新增的attrs;
		    		但这里有一个问题,就是 backbone.sync 里 params.data 是取model.attributes的
		    		也就是说其实不管wait为true还是false,到调用this.sync时,新增或修改的attrs必须被
		    		保存到model.attributes里去,否则无法正确获取 params.data;
		    		而且,当wait与attrs有值时,this.set()在异步前和异步后都会被调用
		    	(5) options.attrs
		    		在 Backbone.sync 方法中
		    		params.data = JSON.stringify(options.attrs || model.toJSON(options));
		    	(6) options.patch 
		    		用于选择 method,this.save()中的method共有三种可能:create  path  update
		    		(1 如果this.isNew()为true,则method取create
		    		(2 如果this.isNew()为false,则method有二种可能(patch,update)
		    		var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
		二、 this.destroy(options)
			1. 到底这个destroy都干了些什么
			1. options 分析
				(1) options.success
				(2) options.context
				(3) options.wait
			2. 生成 options.success
			3. 核心代码 var xhr = this.sync(method, params, options);
				method = "delete";
				params = this;//即model
				但是如果不是 this.isNew() 它并不发起异步
			4. this.isNew() 分析
				其实就是判断 this.attributes 下是否有 idArrributes(默认值为"id") 的属性
				如果this.attributes.id有值,则不是new,返回false
				如果this.attributes.id无值,则是new,返回true
			5. 要发起异步,必须是 this.attributes.id 有值
			6. 若不发起异步,又该如何处理
				直接执行 options.success(); 但要稍需模拟下异步延时
			7. 真正执行 this.destroy() 的代码,其实是这一段
				var destroy = function() {
	                model.stopListening();
	                model.trigger("destroy", model, model.collection, options);
	            };
		三、 this.fetch(options)
			1. 到底这个 fetch 干的是啥工作
				(1) 获取服务器上的 model.attributes 的值,然后设置到 this.attributes
			1. options 分析
				(1) options.success
				(3) options.context
				(2) options.parse
			3. 生成能用的 options
				options = _.extend({parse: true}, options);
			4. 生成 options.success
				var success = options.success;
	            options.success = function(resp) {
	            };
	        5. 发起异步
	        	this.sync("read", this, options);
	        6. 成功回调
	        	(1) 设置返回的属性
	        		model.set(resp, options);
	        	(2) 如果 model.set(resp, options); 设置失败(验证失败)
	        		其实 model.set() 基本上都是返回 this
	        		但有一个特殊情况,就是没有通过 this._validate()验证,
	        		这种情况下是返回false而不是this
	        		(1 验证成功
	        			执行this.fetch()处options处的success回调
	        			success && success.call(options.context, model, resp, options);
                		model.trigger("sync", model, resp, options);
	        		(2 验证失败
	        			不执行success和不触发sync	
	    四、 辅助
	    	1. model 的url到底如何设置?
	    		(1) 在类中声明
		    		var Car = Backbone.Model.extend({
						"url": "data/saveRole.json",
						"defaults": {
							name: "小车"
						}
					});		
				(2) 在对象中声明
					(1 car1.url = "data/saveRole.json";
					(2 car1.urlRoot = "data/saveRole.json";
						这种情况有点特殊,真正的路径其实是
						/data/saveRole.json/101?{"name":"小车","id":101,"user":"xbl"}
				(3) 如果当前对象取不到值,则考虑到 book.collection 里去取
			2. 三个函数中的 options
				(1) options.context
					用于 options.success 回调中的 this
				(2) options.success
					var success = options.success;
		            options.success = function(resp) {
		            	success && success.apply(options.context, model, resp, options);
		            };
		        (3) options.parse  true/false
		        	(1 options.parse = true;
		        		var attrs = this.parse(resp, options);
		        		this.set(attrs, options);
		        	(2 options.parse = false;
		        		则不执行 var attrs = this.parse(resp, options);
		        (4) options.wait  true/false
					是否立即执行  var destroy = function() {}; 功能
					(1 options.wait = true;
						destroy() 在异步成功回调处执行(即在success处执行)
					(2 options.wait = false;
						destroy() 在发异步成功后马上执行(即不在success处执行)
C、 辅助功能
	a、 辅助功能一: destroy
	b、 辅助功能一: invalid
	c、 辅助功能一: defaults 设置
D、 核心api
	a、 构造器初始化
		一、 this.cid 赋值 
			this.cid = _.uniqueId(this.cidPrefix);
		二、 this.initialize 初始化函数执行
			this.initialize.apply(this, arguments);
		三、 this.attributes 置为空值
			this.attributes = {};
		四、 取出参数里的 attributes 的值到 attrs
			var attrs = attributes || {};
		五、 取出 this.__proto__.defaults 里的 attributes 的值
			var defaults = _.result(this, 'defaults');
		六、 将 defaults 扩展到 attrs 中去
			attrs = _.extend({}, defaults, attrs);
		七、 调用 this.set(attrs, options);
			启动 attrs 值的设置
		八、 将 this.changed 值设为空值,而且需要在 this.set方法调用之后
			this.changed = {};
		九、 options.collection
		十、 options.parse
	b、 this.set(key, value, [options])   this.set(attributes, [options])
		一、 使用情况
			1. car.set("name", "xbl");
			2. car.set("name", "xbl", {})
			3. car.set({"name": "xbl"})
			4. car.set({"name": "xbl"}, {})
		二、 功能分析
			1. 需触发 car.on("change")绑定的事件
			2. 需触发 car.on("change:name")绑定的事件
			3. 生成新的 this.attributes
			4. 生成新的 this.changed
			5. 生成新的 this._previousAttributes
			6. 如果新的key是id的值,则更新 this.id
			7. this.set()的返回值有二个可能,大多数情况只返回this,但是有一个特殊情况,就是没有通过
				this._validate()验证,这种情况下其实是返回false
		三、 源码分析
			1. 取出key value,封装成 attrs
				取出 options
				var attrs;
	            if(typeof key === "object") {
	                attrs = key;
	                options = val;
	            }else {
	                attrs = {};
	                attrs[key] = val;
	            }
	            options = options || {};
			2. 将 this.attributes 的值克隆一份并赋给 this._previousAttributes
				this._previousAttributes = _.clone(this.attributes);
			3. 将 this.changed 值置空 this.changed = {};
				在遍历 attrs 时设置this.attributes值时,若这对key-value的值跟this._previousAttributes
				中的不一样,则将该对key-value加入到this.changed中去
            	//this.changed 增删
                if(!_.isEqual(prev[attr], val)) {
                    changed[attr] = val;
                }else {
                    delete changed[attr];
                }
            4. 更新 this.attributes 值
            5. 是否更新 this.id 值
            	if(this.idAttribute in attrs) {
	                this.id = this.get(this.idAttribute);
	            }
	        6. 触发change:[attribute]事件-可能多次
	        	for(var i = 0, j = changes.length; i < j; i++) {
	                this.trigger("change:" + changes[i], this, current[changes[i]], options);
	            }
	        7. 触发change事件-单次
				this.trigger("change", this, options);
			8. options 分析
				(1) options.unset
					car1.set({user: "xbl3"}, {unset: true});
					则 {user: "xbl3"} 的设值就不会再取"xbl3",直接 delete this.attributes['user']
					当然,this.attributes 中的其它key-value值不会变化
					this.changed依旧会变化
				(2) options.silent
					若 options 中 silent 的值设为 true
					car1.set({user: "xbl3", name: "宝马3"}, {silent: true});
					则 change 与 change:[attribute] 事件不触发
				(3) options.validate
					这个是用来判断是否启动 this._validate() 验证的二个条件之一
					要 options.validate = true; 和 this.validate = function() {};
					才会启动验证
				(4) options.collection
				(5) options.parse
				(6) options.wait
				(7) options.success
				(8) options.patch
	c、 this._validate(attrs, options);  
		1. 这个函数在三个地方会被调用
			this.isValid(options);
			this.set(key, value, [options]);
			this.save();
		2. 这个函数的功能是调用 car.validate = function() {};的验证函数
			若这个函数car.validate返回true,则通过验证,并且触发this.trigger('invalid')验证事件
		3. 启动验证的条件有二个
			一个是 options.validate = true;一个是this.validate 是一个函数
		4. 如果通过验证,那么该函数会返回 false,不通过验证,则会返回true
		5. 有一点一定要特别注意: this.validate 返回 false 才能通过验证
			若返回 true,则 this.set之类的都是不能执行的
E、 辅助api
	a、 this.changedAttributes(diff);//diff为一个要比较的attributes,如{user: "xbl2"}
		一、 若 diff 值为空
			若this.changed有值,则克隆一份this.changed并返回
			return _.clone(this.changed)
			若this.changed无值,则return false
		二、 若 diff 值不为空
			则比较 diff 与 this.attributes 的不同,并将不同的返回
	b、 this.previous(attr); 如 this.previous("user");
		上一次 attr 的值是多少
		return this._previousAttributes[attr];
	c、 this.escape(attr) 转义
		将 "<span>xbl</span>" 的attriubtes 转化为 &lt;span&gt;xbl&lt;/span&gt;
	d、 this.parse(resp, options)
		当设置项parse为真的时候，初始化/set/unset/fetch/save
		等数据操作中会对目标数据进行一个解析返回解析后的对象，此方法为空方法，需要重写覆盖
		为什么需要这个方法呢?
		因为像save,fetch返回的数据,未必都是JSON格式的,它有可能是字符串格式的,此时就可通过重写
		this.parse()方法获取 this.set(attrs) 中attrs的参数
	e、 this.url()
		一、 这玩样是获取url用的,但是要有前提,就是不许设置this.url的值
		二、 这玩样其实是要跟 car1.urlRoot = "data/saveRole.json";使用的
			这样获取的url其实是像这样的：data/saveRole.json/101
			就是会带上/idAttribute


F、 Backbone.sync(method, model, options)
	a、 根据 method 取出 type
		var methodMap = {
			'create': 'POST',
			'update': 'PUT',
			'patch': 'PATCH',
			'delete': 'DELETE',
			'read': 'GET'
		};
	b、 生成 params = {};
		一、 params.type = type;
		一、 params.dataType = "json";
		一、 params.url = _.result(model, 'url')
		一、 params.data = model.toJSON(model.attributes);
		一、 options.beforeSend
			var beforeSend = options.beforeSend;
	        options.beforeSend = function() {
	            beforeSend && beforeSend.apply(this, arguments);
	        };
		一、 options.error
			var error = options.error;
	        options.error = function() {
	           error && error.apply(this, arguments); 
	        };
		一、 params.contentType
