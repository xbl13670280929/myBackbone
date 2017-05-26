Backbone.Router
A、 核心功能
	a、 监听哈稀变化
		一、 主体代码
			var AppRouter = Backbone.Router.extend({
				routes: {
					"help":  					"helpFn", 
					"search/kiwis":  			"seachFn"
				},
				helpFn: function(query, page) {
					console.log("help");
				},
				seachFn: function(query, page) {
					console.log("search");
				}
			});
			var app_router = new AppRouter();
			Backbone.history.start();
		二、 参数--query
			<a href="?user=xbl#search/kiwis">22</a>
			seachFn1: function(query, page) {
				console.log(query);//user=xbl
			},
		三、 参数--page
			<a href="#search/kiwis/p1">33</a>
			<a href="#search/kiwis/p2">33</a>
			"search/kiwis/p:1":  		"seachFn2" 	//能匹配到p1 p2 p3等多页面
			seachFn2: function(query, page) {
				console.log(page);//2
			}
	b、 重要接口  this.route(route, name, [callback]);
	c、 重要接口  this.navigate(name, [options]);
	d、 其实Router并不会真的将 this.routes 添加到 Backbone.history.handlers 数组对象中,
		并不是马上就绑定这些事件到 window.onhashchange 中
	e、 多个Router被扩展、多个Router对象被实例化
		应当说,在实质应用上,情况确实是这样的;
	f、 其实总的来说,Router其实就二个功能,一个是将 route-callback 添加到 Backbone.history.handlers
		另一个是在 callback 里触发三种route事件
B、 功能实现
	a、 初始化构造器
		一、 this.routes 赋值
			this.routes = options.routes;
		二、 this.initialize.apply(this, arguments);
		三、 this._bindRoutes(); 这函数的核心功能在于把扩展的类中的哈稀值跟其回调都保存到 
			Backbone.history.handlers 数组对象中
	b、 this.execute(callback, args);  //执行回调函数
		execute: function(callback, args) {
            if(callback) {
                callback.apply(this, args);
            }
        },
    c、 
    	Backbone.history.on("route", function() {
			console.log("Backbone.history:route");
		});
	d、 this.navigate(fragment, options);
		navigate: function(fragment, options) {
	    	Backbone.history.navigate(fragment, options);
	    },
	d、 this.route(route, name, [callback])
		1. 使用可能
			(1) this.route(route, name);
				this.route("help", "helpFn");
			(2) this.route(route, callback);
				this.route("help", function() {});
			(3) this.route(route, name, callback);
				this.route("help", "helpFn", function() {});
		2. name 用途
			准确来说,其实 this.route 并不需要用到 name,只需要 route 与 callback
			那么这个 name 到底是干什么用的呢?
			其实它是用于触发三种事件的,哪三种事件呢?
          	router.trigger('route:' + name, args);
          	router.trigger('route', name, args);
          	Backbone.history.trigger('route', router, name, args);
          	这三种事件并不是哈稀变化的回调,而是通过如下添加的
          	router12.on("route", function() {
				console.log("哈稀变化");
			});
			router12.on("route:helpFn", function() {
				console.log("哈稀变化:helpFn");
			});
			Backbone.history.on("route", function() {
				console.log("哈稀变化:history");
			});
		3. 处理参数的不同
			(1) 如果 name 为 callback
				if(_.isFunction(name)) {
	                callback = name;
	                name = "";
	            }
        	(2) 如果  callback 不存在
	        	if(!callback) {
	                callback = this[name];
	            }
	    4. 核心代码:调用  Backbone.history.route(route, callback) 添加到 Backbone.history.handlers
	    	(1) 简单型
	    		Backbone.history.route(route, function(fragment) {
	                var args = [];
	                router.execute(callback, args);
	            });
	        (2) 触发 route 事件
	        	router.trigger("route:" + name, args);
                router.trigger("route", name, args);
                Backbone.history.trigger("route", router, name, args);
