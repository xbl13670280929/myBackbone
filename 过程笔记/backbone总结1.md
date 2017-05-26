backbone总结
A.  前序
	a.  变量 Backbone 是一个JSON对象,而不是函数;
B.  Backbone 源码结构
	a.  结构1
		(function(factory) {
			factory();
		})(function() {});
	b.  结构2
		(function(factory) {
			var root = window || global;
			root.Backbone = factory(root, {}, _, $);
		})(function(root, Backbone, _, $) {});
	c.  三种使用情形
		(function(factory) {
			var root = window || global;
			if(AMD--异步) {
				root.Backbone = factory(root, exports);
			}else if(CommonJS--同步) {
				factory(root, exports, _, $);
			}else {//浏览器端
				root.Backbone = factory(root, exports);
			}
		})(function(root, Backbone, _, $) {});
C.  Backbone 对象属性功能群介绍
	a.  Events
		1.  复制
			var eObj = _.clone(Backbone.Events);  
		2.  绑定,触发,解绑;
			eObj.on("aa", function(x, y) {}, {a: 1});
			eObj.trigger("aa", 2, 1);
			eObj.off([name], [callback], [context]);
		3.  监听,解除监听
			(1) 监听
				obj1.listenTo(obj2, name, callback);
				== obj2.on(name, callback, obj1);
			(2) 解除监听
				obj1.stopListening([obj2], [name], [callback]);
	b.  Model
	c.  View
	d.  Collection
	e.  Router && History && history
A.  Events
	a.  核心功能--on trigger off
		1.  this._events
			this._events = {
				aa: [aloneEvent, aloneEvent],
				bb: [aloneEvent]
			};
			(1) 每次添加或移除,都是针对aloneEvent的操作;
		2.  aloneEvent
			{
				callback: 事件回调,
				context: 第三个参数 || undefined,
				ctx: 第三个参数 || this,
				listening: undefined,
			}
		3.  使用 eventsApi 高阶函数确保每次只操作单个;
			var eventsApi = function(iteratee, events, name, callback, opts) {
				if(name && typeof name === "object") {
					names = _.keys(name);
					events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
				}else if(name && /\s+/.test(name)) {
					names = name.split(/\s+/);
					events = iteratee(events, names[i], callback, opts); 
				}else {
					events = iteratee(events, name, callback, opts); 
				}
				return events;
			};
		4.  this.on();核心
			var onApi = function(events, name, callback, opts) {
				var handlers = events[name] || (events[name] = []);
				handlers.push({callback: callback, context: opts.context, ctx: opts.context || opts.ctx, listening: opts.listening});
				if(listening) {
                    listening.count++;
                }
			};
		5.  this.off();核心函数
			if(!name && !callback && !context) {
				return;//其实就是 events = undefined;
			}
			//如果传入name,则删除的一定是name下的aloneE
			//未传入name,那就取this._events下的所有name;
			//两种情形都是比较callback与context;
			var names = name ? [name] : _.keys(events);
			for(i = 0, j = names.length; i < j; i++) {
				name = names[i];
                handlers = events[name];
                remaining = [];
                for(m=0,n=handlers.length;m< n;m++) {
                	aloneE = handlers[m];
                	if(callback !== aloneE.callback ||
                        context !== aloneE.context) {
                        //不需要保留的 aloneE
                        remaining.push(aloneE);
                    }else {//不需要保留的 aloneE
                    	//即不将aloneE保留在remaining
                    	//但是要操作this.listeningTo和this.listeners
                    }
                }
                if(remaining.length) {
                	//像"aa": []重新赋值
                    events[name] = remaining;
                }else {
                    delete events[name];
                }
			}
			return events;
		6.  this.trigger();
			(1) 触发事件时必定触发"all"事件;
			(2) all 事件的第一个参数为当前的eventName;
			var triggerApi = function(events, name, callback, args) {
				if(events[name]) {
                    triggerEvents(events[name], args);
                }
                if(events["all"]) {
                    triggerEvents(events["all"], [name].concat(args));    
                }
			};
			var triggerEvents = function(eventsArr, args) {
				for(i = 0, j = eventsArr.length; i < j; i++) {
                    aloneE = eventsArr[i];
                    aloneE.callback.apply(aloneE.ctx, args);
                }   
			};
	b.  核心功能--listenTo stopListening
		1.  实例
			var obj1 = _.clone(Backbone.Events);
			var obj2 = _.clone(Backbone.Events);
			obj1.listenTo(obj2, "all", function(type) {
				console.log(type);
			});
			==
			obj2.on("all", function(type) {
				console.log(type);
			}, obj1);
		2.  this._listeningTo && this._listeners
			obj1._listenId = "l1";
			obj2._listenId = "l2";
			obj1._listeningTo = {
				l2: listening
			};
			obj2._listeners = {
				l1: listening
			};
			listening = {
				id: "l1",//主动监听方 id
				objId: "l2",//被监听对象 id
				obj: obj,//被监听对象
				count: 0,
				listeningTo: this._listeningTo
			}
		3.  obj1.listenTo(obj2, name, callback);
			var listeningTo = this._listeningTo || (this._listeningTo = {});
			var listening = listeningTo[objId];
			if(!listening) {
				listening = {
					id: this._listenId,
					objId: obj._listenId,
					obj: obj,
					listeningTo: this._listeningTo
				};
				listeningTo[objId] = listening;
			}
			var listeners = obj._listeners || (obj._listeners = {});
			listeners[this._listenId] = listening;
			internalOn(obj, name, callback, this, listening);
		4.  obj1.stopListening([obj2], [name], [callback]);
			var listeningTo = this._listeningTo;
			var ids = obj ? [obj._listenId] : _.keys(listeningTo);
			for(i = 0, j = ids.length; i < j; i++) {
                var listening = listeningTo[ids[i]];
                listening.obj.off(name, callback, this);
            }
A.  Model
	a.  设计思想
		1.  没有控制器
			carView.listenTo(carModel, "change", carView.render);
		2.  设置新值时触发相应的事件
			carM.on("change", function(model, options) {});
			carM.on("change:name", function(model, name, options) {});
			carM.set({name: "宝马2"});
	b.  this._validate(attrs, options);
		1.  开启验证前提
			options.validate = true;
			this.validate = function() {};//需声明
		2.  验证通过时返回 true;
		3.  验证不通过时返回 true,
			并触发 this.trigger("invalid"..);//无效的
	b.  主函数 this.set: function(key, val, options) {}
		1.  必须先通过验证
			if(!this._validate(attrs, options)) {
                return false;
            }
        2.  更新三者的值
        	this.attributes;
        	this.changed;
        	this._previousAttributes;
        3.  核心源码
        	this._previousAttributes = _.clone(this.attributes);
        	this.changed = {};
        	var current = this.attributes;
        	var changes = [];
        	for(var attr in attrs) {//遍历要设置的属性群
        		val = attrs[attr];
        		if(!_.isEqual(current[attr], val)) {
                    changes.push(attr);
                    this.changed[attr] = val;
                }else {
					delete this.changed[attr];
            	}
            	if(this.idAttribute in attrs) {
                    this.id = this.get(this.idAttribute);
                }
        	}
        	for(i = 0, j = changes.length; i < j; i++) {
        		var newVal = current[changes[i]];
                this.trigger("change:" + changes[i], this, newVal, options);
            }   
            if(!options.silent) {
                this.trigger("change", this, options);
            }
A.  View
	a.  使用案例
		var CarView = Backbone.View.extend({
			initialize: function(){
				this.render();
			},
			render: function(a, b) {
			    var template = _.template($("#search_template").html());
			    this.$el.html(template({
			    	data: this.model.attributes
			    }));
			},
			events: {
				"click .search_button": "clickView",
			},
			clickView: function() {}
		});
		var carView1 = new CarView({
			el: $("#search_container"),
			model: car1
		});
		carView1.listenTo(car1, "change", carView1.render);
	b.  主功能函数 
		delegate: function(eventName, selector, listening) {
            this.$el.on(eventName + ".delegateEvents" + this.cid, selector, listening);
        },
    c.  undelegate(eventName, selector, listening);
        this.$el.off(eventName + ".delegateEvents" + this.cid, selector, listening);
A.  Router && History && history
	a.  Backbone.history = new History();
	b.  History.start(options);
		addEventListener("hashchange", this.checkUrl, false);
		addEventListener("popstate", this.checkUrl, false);
		this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
	c.  this.stop();
		removeEventListener("popstate", this.checkUrl);
	d.  this.loadUrl();  
		所有的路由变化都是执行这个回调
		用现在的url的哈稀值,跟this.handlers里面的哈稀值作对比;
		而且是用_.some();来遍历,所以它肯定是只执行单个回调;
	e.  this.route();
		this.handlers.unshift({route: route, callback: callback});
		前置添加,确保跟_.some时能被执行
	f.  Router
		1. this.route();
		route: function(route, name, callback) {
			Backbone.history.route(route, function(fragment) {
				router.trigger("route:" + name, args);
                router.trigger("route", name, args);
                Backbone.history.trigger("route", router, name, args);
			});
		}
		2.  this.execute();  真正执行的回调
