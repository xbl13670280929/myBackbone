Backbone.Collection
A、 核心功能
	a、 组合增删改及事件(包含组合和个体二种)
		bookList.add(car1),
		bookList.remove(car1),
		bookList.set(car1)//可触发update,add,remove三种事件
		事件回调：
		bookList.on("add", function() {});
		bookList.on("remove", function() {});
		bookList.on("update", function() {});//bookList都会触发
		car1.on("add", function() {});
		car1.on("remove", function() {});
	b、 排序及事件
		bookList.sort();
		bookList.on("sort", function() {});
	c、 重设及事件
		bookList.reset();
		bookList.on("reset", function() {});
	d、 fetch 及 sync事件 read事件
		bookList.on("sync", function() {});
		bookList.on("read", function() {});
	e、 all 事件(bookList)
		其实,组合类的 add 及 remove 事件,是置于 all 事件中触发的
	d、 其它事件
		1. invalid 事件
		2. on 事件
		3. 
B、 功能分析
	a、 实例化对象
		实例化对象其实就三个属性,但是这里的 book1 对象下的 book1.collection 指向了 this
		1. this.length;
		2. this.models 数组
			this.models = [book1, book2, book3];
		3. this._byId 对象
			this._byId = {
				c1: book1,
				c2: book2,
				c2: book3
			};
	b、 这里有个极其重要的问题,就是如果 book1.set();更改 book1 的属性后,与 book1 一起组成 bookList
		的其它对象(book2,book3)或者 bookList 会不会也能触发相应的回调呢?
		这里可以很肯定的回答,book1.set();调用后,bookList 对象及其下的子对象是监听不到的
		但是有个问题,就是在 Model 类下确实有三个方法用到 collection 属性;
		1. 一个是在 Model 的构造器里,
			if (options.collection) this.collection = options.collection;
			这个的作用是在初始化时就指定该对象属于这个列表
		2. 一个是在 book.destroy();里面
			model.trigger('destroy', model, model.collection, options);
			如果一个特定的 book 对象要执行销毁操作,那么可以在其对应的 
			book.on("destroy", function(model, collection, options) {});
			里让 collection 执行相应的操作
		3. 一个是在 book.url();里面
			var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url');
			说白了就是该 book 对象取不到 url,就取 bookList 里的 url
		小结:应当说,book私下的操作,除了 book.destroy();操作外,其它的任何操作与 bookList 无关
	c、 总的来说,collection 的核心功能其实就是 增-删 这二个功能,还有其对应的回调
B、 核心api
	a、 构造器
		1. this.model 赋值
			if(options.model) {
                this.model = options.model;
            }
        2. this.comparator 赋值 (比较器)
        	if(options.comparator) {
                this.comparator = options.comparator;
            }
        3. this._reset(); 重置三大属性(不会触发相应事件)
        	_reset: function() {
				this.length = 0;
				this.models = [];
				this._byId  = {};
		    },
		4. 使用 静默 方式设置三大属性的值(不会触发相应事件)
			if(models) {
                this.reset(models, _.extend({silent: true}, options));
            }
	b、 this.set(models, options);
		1. options 分析
			(1) options.add 	 true/false
			(2) options.remove 	 true/false
			(3) options.merge 	 true/false
			(4) options.at 	 	 true/false
			(5) options.parse 	 true/false
			(6) options.sort 	 true/false
			(7) options.silent 	 true/false
			(8) options.index 	 true/false
			(9) options.changes  true/false
		2. 返回值(返回被它操作的 models)
			应当说,this.set(models, options);的返回值是返回models
			但是 models 里有二个可能,一个是数组,一个是像 book 这样的单对象;
			var singular = !_.isArray(models);
            if(singular) {
                models = [models];
            }
            return singular ? models[0] : models;
        3. options 值扩展
        	options = _.extend({add: true, remove: true, merge: true}, options);
        4. 设计原理
        	(1) 应用场景(二种)
        		(1 this.add(models, options)	this.models 的值会增加models(只增加不重复的)
        		(2 this.set(models, options)  	this.models 的值会被重设为 models
        	(2) 可能情况
        		(1 纯增加 		this.add(models, options) 这种只需要在指定位置插入即可
        		(2 全部替换  	this.set(models, options)
        		(3 有没有可能是合并呢?
        			其实不存在合并这种可能,
        			那么为什么要采用如此复杂的写法呢?
        			其实原因在于它的事件机制;
        			bookList1.on("add", function(newChild, list) {
						console.log(newChild);
						console.log(list);
					});
					bookList1.on("remove", function(removeChild, list) {
						console.log(removeChild);
						console.log(list);
					});
					bookList1.on("update", function(list, changeObj) {
						console.log(list);
						console.log(changeObj);
					});
					像这样的事件
					bookList1.set([book1, book2, book3]);
					bookList1.set([book3, book4, book5]);
					在第二步中,要触发的事件 add 中,要触发二次 add,第一次为 book4,第二次为 book5
					并不触发 book3 的;而且还要触发二次 remove,第一次为 book1,第二次为 book2;
					只触发一次 update 事件
				(4 this.set();函数的本质,其实要干的事有二件,一个是完成this.models 的更替
					(新增或全部替换,不存在新旧合并的可能);另一个是提取出其新增的 add 数组,用于触发
					add 事件(还有提取出remove数组用于触发remove事件,还有update对象及事件),
        5. 实现规则
        	(1) 遍历 models,其实要干四件事,
        		一个是将 models 分成 已存在(toMerge) 和 新加(toAdd) 二种,
        		一个是保存 models 的 cid
        		一个是复制一份 models 到 set
        		一个是将 models 里的对象(新增的)添加到 this._byId 中去,
        			但是需要删除的并没被删除(同时会被新增的绑定all事件)
        		var model;
                for(var i = 0, j = models.length; i < j; i++) {
            	}
	            (1 遍历 models 中,把 models 分成 [已存在] 和 [新加] 二种
	            	这里其实要特别注意,这里的已存在其实并不是说原列表中有这一个单体对象了
	            	比如说原列表为[book1, book2],
	            	新的列表为[book2, book3];这时book2的值其实并不能算入toMerge里面
	            	那到底为什么需要这个判断条件呢?狂想中~~
	            	for(var i = 0, j = models.length; i < j; i++) {
						if(this.get(model)) {
	                        if(model !== existing) {
	                            toMerge.push(model);
	                        }
	                    }else if(add) {
	                        toAdd.push(model);
	                    } 
	            	}
	            	其中,新加的要特别注意,因为凡是新加的都需要绑定一个all事件,
	            	这个all事件绑定的callback都是this._onModelEvent
	            	model.off('all', this._onModelEvent, this);
	            (2 遍历 models 中,把 models 的 cid 保存到 modelMap = {};中
	            	var model;
	                for(var i = 0, j = models.length; i < j; i++) {
	                	modelMap[model.cid] = true;
	            	}
	            (3 遍历 models 中,复制一份 models 到 set
	            	for(var i = 0, j = models.length; i < j; i++) {
	                	set.push(model);
	            	}
	            (4 遍历 models 中,把新增的个体对象添加到 this._byId(同时会被新增的绑定all事件)
	            	for(var i = 0, j = models.length; i < j; i++) {
	                	if(existing) {
	                    }else if(add) {
	                        this._addReference(model);
	                    } 
	            	}
	        (2) 遍历 this.models,其实也要干二件事
	        	(1 取出要删除的数组 toRemove(取出的标准是 modelMap[model.cid] 中没有的)
		        	for(var m = 0, n = this.length; m < n; m++) {
	                    model = this.models[m];
	                    if(!modelMap[model.cid]) {//删除
	                        toRemove.push(model);
	                    }
	                }
	            (2 根据取出的 toRemove 数组,删除 this._byId 中与 toRemove 对应的个体对象
	            	同时删除该个体对象的all事件
	            	for(var m = 0, n = this.length; m < n; m++) {
	                    if (toRemove.length) {
	                    	this._removeModels(toRemove, options);
	                    }
	                }
	        (3) 将 toAdd 与 toMerge 整合到 this.models 中去
	        	这种整合分成二种情况,一种是原 this.models 不变,纯添加型;
	        	还有一种就是全部替换型
	        	if(set.length && add && remove) {//全部替换型
                    this.models.length = 0;
                    splice(this.models, set, 0);
                    this.length = this.models.length;
                }else if(toAdd.length) {//只添加型
                    splice(this.models, toAdd, at == null ? this.length : at);
                    this.length = this.models.length;
                }
                走到这一步后,其实this.set()的设置就算完成了,后面的就是根据 toAdd,toMerge,toRemove触发相应的事件
	        (4) 触发 个体add 组合sort 组合update 事件
	        	(这里特别注意:这里并没有组合add 组合remove事件,因为这二个事件是放到个体all里面的callback里去触发了)
	        	(1 触发单体对象的 add 事件
	        		for(i = 0, j = toAdd.length; i < j; i++) {
	                    model = toAdd[i];
	                    model.trigger("add", model, this, options);
	                }
	                触发单体对象事件的时候,其实单体对象的all事件也被触发了,
	                而此时单体对象都绑定了的all事件,而这个all事件的callback都为 this._onModelEvent 函数
	                在这个 this._onModelEvent 函数里,
	                但这里还有个问题,this._onModelEvent(event, model, collection, options);共有四个参数,这些参数是怎么传过去的呢?其实是和单体对象事件的参数一模一样,
	                因为事件来自单体对象的all
				(2 触发组合的 update 事件
					if(toAdd.length || toMerge.length || toRemove.length) {
	                    options.changed = {
	                        added: toAdd,
	                        removed: toRemove,
	                        merged: toMerge
	                    };
	                    this.trigger("update", this, options);
	                }
	            (3 触发组合的 sort 事件
	            	if(sort && orderChanged) {
	                    this.trigger("sort", this, options);
	                }
	c、 this.add(models, options);
		应当说,add是使用this.set();来完成的
		return this.set(models, _.extend({merge: false}, options, {add: true, remove: false}));
	d、 this.remove(models, options);
		1. 返回值
			var singular = !_.isArray(models);
            if(singular) {
                models = [models];
            }
            return singular ? models[0] : models;
        2. 核心代码在 this._removeModels(models, options)
        3. 获取 this._removeModels(models, options) 的返回值,即得到真正被删除的元素数组
        	然后触发 update 事件
        	if(removed.length && !options.silent) {
                options.changed = {
                    added: [],
                    merged: [],
                    removed: removed
                };
                this.trigger("update", this, options);
            }
    e、 this._removeModels(models, options)
    	1. 返回值(这个返回值是用于触发update事件的,因为删除功能的update事件并不在这里触发)
    		_removeModels: function(models, options) {
                var removed = [];
                var i, j,
                    model;
                for(i = 0, j = models.length; i < j; i++) {
                    model = this.get(models[i]);
                    if(!model) {
                        continue;
                    }
                    removed.push(model);
                }
                return removed;
            },
		2. 遍历 models
			(1) 操作 this._byId 与 this.models
				_removeModels: function(models, options) {
	                for(i = 0, j = models.length; i < j; i++) {
	                    var index = this.indexOf(model);
	                    splice(this.models, model, index);
	                    this.length--;

	                    delete this._byId(model.cid);
	                    var id = this.modelId(model.attributes);
	                    if(id) {
	                        delete this._byId(id)
	                    }
	                    
	                    this._removeReference(model, options);
	                }
	            },
	        (2) 触发单体 remove 事件(当然,会一起触发单体all事件,然后在这过程中触发组合 remove 事件)
	        	if(!options.silent) {
                    options.index = index;
                    model.trigger("remove", this, options);
                }
	d、 this.reset(models, options)
		1. 事件
			重设是不会触发 add remove update 事件的
			只会触发 "reset" 事件
		2. 核心代码
			reset: function(models, options) {
                this._reset();
                models = this.add(models, _.extend({silent: true}, options));
                return models;
            },
        3. 移除原this._byId 里的 all 事件
        	for(i = 0, j = this.models.length; i < j; i++) {
                this._removeReference(this.models[i], options);
            }
        4. 生成 options.previousModels 对象
        	options.previousModels = this.models;
        	但是为什么需要这个对象呢?~~狂想中
        	} else if (add) {
	          model = models[i] = this._prepareModel(model, options);
	        }
	    5. 触发 reset 事件
	    	if(!options.silent) {
                this.trigger("reset", this, options);
            }
    e、 this.where(attrs, first);
    	1. 用法
    		bookList1.findWhere({
				title: "book2"
			});//book2对象
		2. 理解
    		按代码上的理解,其实就是二种可能
    		this.find(attrs); this.filter(attrs);
    	3. 核心还是在 扩展_的方法上(失败了)
    f、	this.sort(options);
    	1. 使用
    		var BookList = Backbone.Collection.extend({  
				model : Book,
				comparator: function(m1, m2) {
					var price1 = m1.get('price');
					var price2 = m2.get('price');

					if (price1 > price2) {
						return 1;
					} else {
						return 0;
					}
				}   
			});  
			bookList1.on("sort", function(newChild, list) {
				console.log(333);
			});
			bookList1.sort();
		2. 取出 comparator 参数的长度
			var length = comparator.length;
		3. 为 comparator 绑定 this
			if(_.isFunction(comparator)) {
                comparator = _.bind(comparator, this);
            }
        4. 核心代码
        	if(length === 1 || _.isString(comparator)) {
                this.models = this.sortBy(comparator);
            }else {
                this.models.sort(comparator);
            }
        5. 执行 sort 事件
			if(!options.split) {
                this.trigger("sort", this, options);
            }
    g、 this.fetch(options);
    	1. 设置url
    		var BookList = Backbone.Collection.extend({    
				"url": "data/saveRole.json",
				model : Book   
			}); 
		2. options.success 设置
			var collection = this;
            var success = options.success;
            options.success = function(resp) {
                success && success.call(options.context, collection, resp, options);
            };
        3. options.error 设置
        	wrapError(this, options);
        4. 发起异步
        	return this.sync("get", this, options);
        5. 成功回调
        	(1) 重新设置 collection 的值
				这里就有使用 this.reset 和 this.set 二种可能
				如果 options.reset 不为true,则采用 this.set 设置
				var method = options.reset ? "reset" : "set";
                collection[method](resp, options);
            (2) options.success 执行
            	success && success.call(options.context, collection, resp, options);
            (3) collection 的 sync 事件执行
            	collection.trigger("sync", collection, resp, options);
    h、 this.create(model, options);
    	(1) 核心代码
    		create: function(model, options) {
                this.add(model);
                model.save(null, options);
            },
        (2) options.success
        	var success = options.success;
            options.success = function(resp) {
            };
        (3) 是否立即添加
        	if(!options.wait) {
                this.add(model, options);
            }
            options.success = function(resp) {
                if(options.wait) {
                    this.add(model, options);
                }
            };
        (4) 发起 model.save(null, options);异步
        	model.save(null, options);
C、 辅助api
	a、 this._addReference(model, options);
		1. 将 this._byId[model.cid] 更新为 model
			this._byId[model.cid] = model;
		2. 为 model 绑定 all 事件
			model.on("all", this._onModelEvent, this);
		3. 取出 model.id 值(从中可以看出,其实 this._byId 对象中,一个子对象可能会支持二种写法,
			一个是cid,一个是id)
			var id = this.modelId(model.attributes);
            if(id) {
                this._byId[id] = model;
            }
	b、 this._removeReference(model, options);
		1. 将 this._byId[model.cid] 删除
			delete this._byId[model.cid]
		2. 移除 model 的 all 事件
			model.off("all", this._onModelEvent, this);
		3. 取出 model.id 值
			var id = this.modelId(model.attributes);
            if(id) {
                delete this._byId[id];
            }
    c、 this._onModelEvent(event, model, collection, options);
    	1. 这函数到底是干啥用的呢?
    		这玩样的主功能其实是用来触发 组合 的 add 和 remove 事件的
    		this.trigger.apply(this, arguments); //arguments 里的第一个参数通常为 add 或 remove
    	2. 但它还针对 model 再进行事件触发,到底为啥要这样设计呢?
    d、 
D、 属性群
	a、 this.model 与 this.__proto__.model
		this.__proto__.model 肯定指向 Model 类
		this.model 指向 Model 扩展的类,如 Book;
	b、 this.comparator
		有在三个函数使用:this.set();this.sort();this.clone();
		主要应该是在 this.sort();里使用;值应该有二种可能,
		一个是函数,一个是字符串;
		应该是指明排序的规则