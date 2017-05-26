Backbone-Event
A、 核心对象
	a、 Events._events
		object1._events = {
			"add": [
				{
					context: {name: "宝马"},
					callback: function() {},
					ctx: context || this,
					listening: undefined
				}
			],
			"remove": [
				{
					context: undefined,
					callback: function() {},
					ctx: context || this,
					listening: undefined
				},{
					context: undefined,
					callback: function() {},
					ctx: context || this,
					listening: listening
				}
			]
		};
	b、 listen对象群
		一、 Events._listenId
			当执行 object1.listenTo(object2, name, callback) 这个方法时
			object1 和 object2 都会生成一个值
			object2._listenId = _.uniqueId('l');
			object1._listenId = _.uniqueId('l');
		二、 Events._listeners
			当执行 object1.listenTo(object2, name, callback) 这个方法时
			object2._listeners = {};
			object2._listeners[object1._listenId] = listening
		三、 Events._listeningTo
			当执行 object1.listenTo(object2, name, callback) 这个方法时
			object1._listeners = {};
			object1._listeningTo[object2._listenId] = listening
		备注:
			object2._listeners[object1._listenId] = listening
			object1._listeningTo[object2._listenId] = listening
			其实这个 listening 这个值对于 object1 object2 都是同一个值
			这个 listening 的值 
			listening = {
				obj: obj, 
				objId: object2._listenId, 
				id: object1._listenId, 
				count: 0,
				listeningTo: listening//指向自己
			};
B、核心功能一:on trigger off
	a、 Event.on(name, callback, [context])
		一、 全局观看设计Events.on
			1. 事件委派到internalOn上,第一个参数为this
				Events.on = function(name, callback, context) {
					return internalOn(this, name, callback, context);
				};
			2. 使用eventsApi分解name,使用onApi添加事件对象
				_events这个对象是在 internalOn 函数中添加的
				如果是 listening 的事件,并添加_listeners到obj下(object._listeners)
				var internalOn = function(obj, name, callback, context, listening) {
		            obj._events = obj._events || {};
		            eventsApi(onApi, obj._events, name, callback, {
		                context: context,
		                ctx: obj,
		                listening: listening
		            });
		            return obj;
		        };
		    3. 最终添加到_events对象
		    	在添加时若是 listening 添加的事件则 listening.count++;
		    	var onApi = function(events, name, callback, options) {
		            if(callback) {
		                var handlers = events[name] || (events[name] = []);
		                var context = options.context, ctx = options.ctx, listening = options.listening;
		                handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
		            }
		            return events;
		        };
		二、 internalOn分析
			这个函数的功能应包括这样:
				能绑定on函数的调用者this,
				能绑定callback调用时的上下文context,
				当然还包括name与callback
			这样写的话,那么使用object1.listenTo(object2, name, callback)时也能被调用
			而且对于context也能正确使用,即internalOn(object2, name, callback, undefined);
		三、 eventsApi分析
			1. 功能分析
				(1) 该函数实际是操作events(_events)这个对象
				(2) 核心功能一:针对不同格式的name进行拆分,确保iteratee函数操作的name为单个
					(即是字符串,且无空格,或为undefined)
				(3) 核心功能二:核心操作其实都在参数iteratee中,
					这样就能确保on、trigger、off操作_events对象时都可使用eventsApi
			2. 关键源码分析
				(1) name为:字符串且无空格 或 undefined(在trigger时可能的值)
					var eventsApi = function(iteratee, events, name, callback, opts) {
						if(name && name === "object") {//name为object
						}else if(name && eventSplitter.test(name)) {//name为有空格字符串
						}else {//name为无空格字符串或为undefined
							events = iteratee(events, name, callback, opts); 
						}
					}
				(2) name为字符串且有空格
					var eventsApi = function(iteratee, events, name, callback, opts) {
						if(name && name === "object") {//name为object
						}else if(name && eventSplitter.test(name)) {//name为有空格字符串
							names = name.split(eventSplitter);
			                for(i = 0, j = names.length; i < j; i++) {
			                    events = iteratee(events, names[i], callback, opts); 
			                }
						}else {//name为无空格字符串
						}
					}
				(3) name为一个object
					//此时names为["alert1", "alert2"]之类
					//name[names[i]]是取出其中的callback
					//请注意,这里是使用events = eventsApi()而不是使用events = iteratee(),因为还要考虑到name下的key可能还含有空格的可能
					var eventsApi = function(iteratee, events, name, callback, opts) {
						if(name && name === "object") {//name为object
							names = _.keys(name);
			                for(i = 0, j = names.length; i < j; i++) {
			                    events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
			                }
						}else if(name && eventSplitter.test(name)) {//name为有空格字符串
						}else {//name为无空格字符串
						}
					}
			3. name为一个object
				object1.on({
					"alert2": function() {
						console.log(11);
					},
					"alert3": function() {
						console.log(22);
					}
				});
		四、 关键源码 onApi(events, name, callback, options)
			1. 取出像object1._events['alert1']中的数组
				var handlers = events[name] || (events[name] = []);
			2. 生成待添加对象(共四个属性)
				{callback: callback, context: context, ctx: context || ctx, listening: listening}
			3. 将待添加对象添加到 handlers 中去
				handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
			4. 如果是使用listenTo之类的事件添加的对象,则listening.count++
				if(listening) {
                    listening.count++;
                }
	b、 Event.trigger(name, [*args])  *args一个或多个参数 
		其实name只能是三种可能:无空格字符串 和 有空格字符串 和 undefined
		object1.trigger();其实是不执行任何事件的(当然它会执行name为'all'的事件)
		一、 全局分析Event.trigger(name, [*args])
			1. 取出参数 args,并用 eventsApi 处理name
				Events.trigger = function(name) {
		            var args = [].slice.call(arguments, 1);
		            eventsApi(triggerApi, this._events, name, null, args);
		            return this;
		        };
		    2. 根据name取出事件数组,如果有name为all的事件,则也取出来并执行
		    	var triggerApi = function(events, name, callback, args) {
		            if(events) {
		                var eventsArr = events[name];
		                var eventsArrAll = events.all;
		                if(eventsArr) {
		                    triggerEvents(eventsArr, args);    
		                }
		                if(eventsArrAll) {
		                    triggerEvents(eventsArrAll, [name].concat(args));    
		                }
		            }
		            return events;
		        };
		    3. 执行事件
		    	var triggerEvents = function(eventsArr, args) {
		            if(eventsArr && eventsArr.length) {
		                for(i = 0, j = eventsArr.length; i < j; i++) {
		                    ev = eventsArr[i];
		                    ev.callback.apply(ev.ctx, args);
		                }   
		            }
		        };
	c、 Event.off([name], [callback], [context])
		一、 各种使用可能
			1. Events.off();不带参数
				_events将为undefined
				_listeners将为一个空{}
				_listeningTo(对方的)也为一个空{}
			2. Events.off("alert1");单个字符串
			3. Events.off("alert1 alert2");有空格字符串
				Events.off("alert1");和Events.off("alert2");
			4. Events.off(null, fn1);指定fn回调
				所有事件对象数组中callback为fn的事件都要从数组中被删除
			5. Events.off(null, null, obj1);指定context
				所有事件对象数组中context为obj1的事件都要从数组中被删除
		二、 功能实现分析
		三、 代码实现分析
			1. 直接使用 eventsApi 分解 name
				Events.off = function(name, callback, context) {
		            eventsApi(offApi, this._events, name, callback, {
		                context: context,
		                listeners: this._listeners
		            }); 
		            return this;
		        };
		    2. 最终移除的函数 offApi
		    	 var offApi = function(events, name, callback, options) {
		    	 	delete events[name];
		    	 	return events;
		    	 };
		四、 分解 offApi
			1. 若没有任何参数,即 Events.off();
				(1) 使用return;这样_events的值直接取undefined
				(2) 删除对应的 listeners 和 listeningTo的对象
				if(!name && !callback && !context) {
	                var ids = _.keys(listeners);
	                for(i = 0, j = ids.length; i < j; i++) {
	                    listening = listeners[ids[i]];
	                    delete listeners[listening.id];
	                    delete listening.listeningTo[listening.objId];
	                }
	                return;
	            }
			2. 根据name生成names(到达offApi的name只有二种可能,一种是无空格字符串,一种是undefined)
				若name为"alert1"之类的字符串,直接[name],若name为undefined,则把所有的_events的key(name)取出来组成一个names,最终取出单个name和handlers数组
				var names = name ? [name] : _.keys(events);
            	for(i = 0, j = names.length; i < j; i++) {
            		name = names[i];
      				var handlers = events[name];
            	}
			3. 然后遍历 handlers 数组
				这里很重要,按我们平时的了解,就是把不需的handlers[m]直接删掉;
				然后再将handler为空数组的删掉,即(delete events[name])
				但这里却用了个更有效的方式,当有传参数 callback 或 context 时,
				则将需要保留的 handlers[m] 保存在 remaining = []; 中
				若 remaining 里面有值,就 events[name] = remaining;
				否则 delete events[name];
				for(m = 0, n = handlers.length; m < n; m++) {
                    handler = handlers[m];
                    //再加上前面的context
                }
                (1) 只保留会被保留的 handler
                	for(m = 0, n = handlers.length; m < n; m++) {
                    handler = handlers[m];
                    if((callback && callback !== handler.callback) ||
                        (context && context !== handler.context)) {
                        remaining.push(handler);
                    }else {//不需要保留的 handler
                    }
                }
                (2) 不要保留的 handler 则不执行 remaining.push(handler);
                	而且若这个事件是listenTo的,还要执行 --handler.listening.count
                	然后若
                	if(handler.listening.count === 0) {
						delete listeners[listening.id];
                        delete listening.listeningTo[listening.objId];
                	}
                (3) 若 events[name](数组中),有还需要保留的值(即remaining),
                	则events[name] = remaining;若已无要保留的值,直接delete events[name];
                	if(remaining.length) {
	                    events[name] = remaining;
	                }else {
	                    delete events[name];
	                }
C、核心功能二:listenTo stopListening
	a、 object1.listenTo(object2, name, callback)
		一、 使用可能分析(只有一种可能)
			1. object2.listenTo(object1, "alert2", function() {});
				view.listenTo(model, 'change', view.render);
		二、 注意情况
			1. listenTo 是无法声明 context 的
			2. listenTo 里的 context 为 listenTo 方法的调用者(object1)
			3. listenTo 里的 callback 是无法被 object.off(null, fn)这样来删除的
		三、 功能实现分析
			1. 在 Events.listenTo 取出或生成 obj._listenId 和 this._listenId
			2. 取出或生成 listening;而这个 listening 是取自 this._listeningTo[obj._listenId]
				若没能取出 listening 对象,则生成一个新的 listening 对象,并且 
				this._listeningTo[obj._listenId] = listening;
			3. 执行 internalOn(obj, name, callback, this, listening);
			4. 在执行 internalOn 函数时,若传入 listening,则为 obj 绑定 obj._listeners
			5. 在执行 onApi 函数时,若传入 listening,则为数组中的事件对象添加 listening 对象
				object1._events['alert1'][0].listening = listening;
		四、 源码全局分析
			1. 在 Events.listenTo 取出或生成 listening 对象
				Events.listenTo = function(obj, name, callback) {
					var listening = this._listeningTo[obj._listenId];
					internalOn(obj, name, callback, this, listening);
	    			return this;
				};
			2. 在 internalOn 函数绑定 obj._listeners
				var internalOn = function(obj, name, callback, context, listening) {
				    if (listening) {
				      var listeners = obj._listeners || (obj._listeners = {});
				      listeners[listening.id] = listening;
				    }
				  };
			3. 在 onApi 函数为 handler 绑定 listening 对象并且 listening.count++
				var onApi = function(events, name, callback, options) {
				    if (listening) listening.count++;
				    handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
				};
	b、 object1.stopListening([object2], [name], [callback])
		一、 使用分析
			1. object1.stopListening()  		view.stopListening()
				object1监听下的所有对象的listenTo都要移除
			2. object1.stopListening(object2) 	view.stopListening(model)
				object1监听下的对象为object2的listenTo都要移除
			3. object1.stopListening(object2, "alert1")
				object1监听下的对象为object2的name为"alert1"的listenTo都要移除
			4. object1.stopListening(object2, "alert1", fn2)
				object1监听下的对象为object2的name为"alert1"的且函数为fn2的listenTo都要移除
		二、 功能实现分析
		三、 源码全局分析
			1. 在 Events.stopListening 中取出 this._listeningTo
			2. 在 Events.stopListening 中根据是否传 object2 还是 空值,
				取出要操作的 var ids = obj ? [obj._listenId] : _.keys(this._listeningTo);
			3. 根据 ids 的不同取出要操作的各个 obj,然后移除事件
				for (var i = 0; i < ids.length; i++) {
					listening.obj.off(name, callback, this);
				}
D、 扩展功能 Events.once  Events.listenToOnce
	a、 Events.once(name, callback, [context])
		一、 使用可能
		二、 功能分析
			1. Events.once 在绑定事件后,当 Events.trigger后,在_events中的对象就会被删掉
			2. Events.once 绑定的 callback,确实不是 Events.once(name, callback)的callback,
				而是_.before
			3. 使用 object1.off(null, callback);确实可以移除once绑定的事件
				object1.once("alert4", fn4);
				object1.off(null, fn4);
			4. 使用 Events.once("alert4", fn4) 绑定的事件, handler.callback 确实指向_.before
				但 handler.callback._callback 却指向fn4
			5. 一般的理解,可以使用下面的方式来解决
				Events.once = function(name, callback, context) {
		            var self = this,
		                context = context || this;

		            var once = _.once(function() {
		                self.off(name, once);
		                callback.apply(context || self, arguments);
		            });
		            once._callback = callback;
		            return this.on(name, once, context);
		        };
	            简单粗暴
	            但是这样写有一个很大的问题,就是产生了闭包,即这个 once(内部函数)被 Events._events['alert4'][0].callback 接收了
	            不过,其实就算使用了 var onceMap = function() {};来完成,它其它依然会产生闭包;
	            但是使用 onceMap 产生的闭包,它只有 offer name once callback 不被回收,产生的影响其实小
	        6. 具体的做法是使用 return this.on(events, undefined, context);
	        	这个 events 是生成的一个新的 events,里面只有{"alert4": []}一个值
	        	说白了就是把name与callback封装成一个object传入
	b、 Events.listenToOnce
		Events.listenToOnce = function(obj, name, callback) {
            var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
            return this.listenTo(obj, events);
        };
		具体的做法也是使用 return this.listenTo(obj, events);
		这个 events 是生成的一个新的 events,里面只有{"alert4": []}一个值
	    说白了就是把name与callback封装成一个object传入