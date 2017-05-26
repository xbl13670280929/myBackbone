Backbone.View
A、 view 的核心功能到底是什么?
	a、 监听模型变化然后渲染
		var CarView = Backbone.View.extend({
			initialize: function(){
				this.render();
			},
			render: function(a, b) {
			    var template = _.template($("#search_template").html());
			    this.$el.html(template({
			    	data: this.model.attributes
			    }));
			}
		});
		var carView1 = new CarView({
			el: $("#search_container"),
			model: car1
		});
		carView1.listenTo(car1, "change", carView1.render);
	b、 为view绑定事件
		var CarView = Backbone.View.extend({
			clickView: function() {
				console.log("双击view的dom节点");
			},
			search: function() {
				console.log("点击view下dom节点的一小点");
			},
			events: {
				"dblclick"                		: "clickView",
				"click .search_button"         	: "search"
			}
		});
	c、 解绑事件接口
		一、 carView1.undelegateEvents();//该函数没有参数,解绑所有参数
		二、 carView1.undelegate(type, selector, listener);//解绑个别事件
	d、 绑定事件接口
		一、 carView1.delegate(type, selector, listener);//该函数没有参数
		二、 carView1.delegateEvents(events);//该函数没有参数
	e、 view.remove();意味着什么?
		carView1.remove();
		其实carView1这个之后,carView1这个对象依然存在;
		但是页面上的被carView1渲染的view却被删除了
B、 view 功能实现
	a、 new 初始化
		一、 给view对象分配 cid
			this.cid = _.uniqueId('view');
		二、 执行 initialize 函数
			this.initialize.apply(this, arguments);
		三、 执行 this._ensureElement(); 初始化view
			1. 如果没有传入 this.el, 那么根据 this.tagName 生成dom节点(待插入)
			1. this.undelegateEvents(); 解绑事件
			2. this.delegateEvents(); 	绑定事件
			3. 生成 this.el 和 this.$el
		四、 将 new CarView({});中的参数赋值给this
			_.extend(this, _.pick(options, viewOptions));
			_.pick(options, viewOptions);这个的意思是在 options 参数中只取出
			['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events']
	b、 this._ensureElement();
		一、 this.el 有值
			if(this.el) {
                this.setElement(this.el);
            }else {
            }
		二、 this.el 无值(使用 this.tagName)
			if(this.el) {
            }else {
				this.setElement(document.createElement(this.tagName));
            }
            这里有一点需要注意,就是新生成的dom节点它并没有id,className和其它attributes属性;
            这其实是需要给它们添加的,但是在this.el有值的情况下却并不需要给它们添加
    c、 this.setElement(elem);
    	一、 解绑事件
    		this.undelegateEvents();
    		1. this.undelegateEvents();
    			this.$el.off(".delegateEvents" + this.cid);
    	二、 生成 this.el 和 this.$el
    		 this._setElement(elem);
    	三、 绑定事件
    		this.delegateEvents(events);
    		这个又分成二种情况,一种是 events 无值,这里相当于初始化,就取 this.events 的值
    		另一种就是有值
    d、 绑定事件和解绑事件
    	一、 绑定
    		1. 绑定单个 this.delegate(eventName, selector, listener)
	    		真正的绑定方式为:(eventName + '.delegateEvents' + this.cid)
	    		this.$el.on("click.delegateEventsview2", ".search_button", callback)
	    	2. 绑定多个 this.delegateEvents(events)
	    		this.delegate(eventName, selector, _.bind(method, this));
		二、 解绑
    		1. 解绑单个 this.undelegate(eventName, selector, listener)
    			真正代码为:
    			this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
    		2. 解绑所有(this.undelegateEvents())
    			真正代码为:
    			this.$el.off('.delegateEvents' + this.cid);
    			(注意:这里解绑所有其实用到了jQ解绑事件里的一个重要方式:即不使用像click这样的type)
    			即this.$el.off(".delegateEventsview2")可以解绑.之前的各种参数
    e、 移除 carView1.remove();
    	这里的移除只干二件事,一个是停止监听 this.stopListening();
    	另一个是将dom节点从文档树中移除 this.$el.remove();
C、 辅助 api
	a、 this.$(selector)

