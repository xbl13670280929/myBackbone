Backbone.history  Backbone.Router
A、 核心功能
	a、 提供接口--Backbone.history.route(name, callback)
		将 hash 与 callback 保存到 Backbone.history.handlers 中去
	b、 提供接口--Backbone.history.start()
		启动哈稀监听,注意一点,哈稀变化只绑定this.checkUrl事件,
		并不绑定 Backbone.history.handlers数据,触发是根据当前hash值去匹配 Backbone.history.handlers
		中的哈稀值,若数组中有一个的哈稀值与之匹配,则执行其callback
	c、 提供接口--Backbone.history.stop()
		将 Backbone.history.start() 绑定的事件移除
	d、 提供接口--Backbone.history.navigate(fragment, options) 
		主动跳转哈稀值
B、 功能实现
	a、 构造函数初始化
		一、 this.handlers 初始化
			this.handlers = [];
		二、 this.location 赋值(主要用于操作现在url)
			this.location = window.location;
		三、 this.history  赋值(主要用于操作历史url)
			this.history = window.history;
		四、 为 this.checkUrl 函数绑定 this
			this.checkUrl 用于 addEventListener('hashchange', this.checkUrl, false);
			但是这种写法的函数的this一般指向window,所以需要特别为其绑定this
	b、 this.loadUrl(loadUrl);
		这个函数到底是拿来干什么用的呢?
		这个就要说到 window.onhashchange 的绑定方式,首先,事件绑定确实是这样的
		addEventListener('hashchange', this.checkUrl, false);
		并不是 Backbone.history.handlers 里的 callback;
		这样就出来一个问题,当 hashchange 事件触发时,如何才能正确执行到 Backbone.history.handlers
		里对应的回调? 其实就是遍历 this.handlers,当 handler.route == self.getHash() 相同即可
		loadUrl: function(fragment) {
            fragment = this.fragment = this.getFragment(fragment);
            return _.some(this.handlers, function(handler) {
                if(handler.route == fragment) {
                    handler.callback();
                    return true;
                }
            });
        },
    c、 this.stop();
    	移除事件
    	History.started = false;
    d、 this.start(options);
    	1. this.options 赋值
    		this.options = _.extend({root: "/"}, this.options, options);
    	2. this.root 赋值
    		this.root = this.options.root;
    		this.root = ("/" + this.root + "/").replace(/^\/+|\/+$/g, "/");
    		即将多个 this.root 中的 "//" "///"之类的转换为 "/"
    	3. this.fragment 赋值
    		this.fragment = this.getFragment();
    		当然,this.fragment 还会在 this.loadUrl();里赋值
    	4. 使用何种方式监听
    		一共有三种监听方式: popstate  hashchange  setInterval()
		5. options.silent = true/false;
			if(!options.silent) {
                return this.loadUrl();
            }
            正常情况下,当start()启动后,this.loadUrl()应当被执行一遍,
            但如果设置{silent:true}静默,就不用再执行this.loadUrl()一遍
    e、 this.navigate(fragment, options);
    	这个是用于主动跳转哈稀值的,应当说,它主要是给 Router.navigate(fragment, options);来作用的
    	Backbone.history.navigate("help");能使当前url的哈稀跳转到#help中去
    	1. options 取值
    		这里有点特殊,一般来说,当 options 不存在,即取空{},但这里若options为true值,则生成一个{trigger: true}
    		if(!options || options === true) {
                options = {trigger: true};    
            }
            (1) options.trigger
            	this.loadUrl(fragment)
            (2) options.replace
            	this._updateHash(this.location, fragment, options.replace);
        2. fragment 取值
        	fragment = this.getFragment(fragment);
        3. 调用 this._updateHash(fragment); 更新hash 值
        	this._updateHash(this.location, fragment);
        	_updateHash: function(location, fragment, replace) {
	            location.hash = "#" + fragment;
	        }
	f、 this.route(route, callback);
		this.handlers.unshift({route: route, callback: callback});
		确实仅仅是往 this.handlers 插入一个元素而已
C、 辅助功能
	a、 Backbone.history.getHash([window]);//如返回#help中的help
		getHash: function(window) {
            var match = (window || this).location.href.match(/#(.*)$/);
            return match ? match[1] : "";
        },
	b、 Backbone.history.getSearch([window]); 	获取url里的 ?部分
		//如返回backbone.html?abc=12#help中的?abc=12
		getSearch: function() {
            var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
            return match ? match[0] : "";
        },
    c、 Backbone.history.getPath(); 
    	//http://127.0.0.1:8080/backbone.html?abc=12#help
    	中的 backbone.html?abc=12
    	getPath: function() {
            var path = this.location.pathname + this.getSearch();
            return path;
        },
    d、 Backbone.history.atRoot();  判断当前url是就是 Backbone.history.root
    	atRoot: function() {
            return this.location.pathname === this.root;
        },
        若url存在search部分,则返回false
    e、 Backbone.history.matchRoot();
    	若url存在search(?部分),依然返回true
D、 属性群
	a、 Backbone.history.root
		这个属性是在 Backbone.history.start(options);里的options里设置的;
		默认值为"/";若设为 root: "/backbone.html"(会转为"/backbone.html/"),当页面是:http://127.0.0.1:8080/backbone.html
		则 Backbone.history.atRoot(); 返回true
	b、 Backbone.history.fragment
		保存当前url的哈稀值;(不含#)
		每次url的哈希值发生变化,Backbone.history.fragment的值都会更新
	c、 Backbone.history.handlers
		Backbone.history.handlers = [{
			route: "hash1",
			callback: function() {}
		},{
			route: "hash2",
			callback: function() {}
		}];
		要怎样来看待这个 Backbone.history.handlers 呢?
		1. 这个主要是保存 哈稀值 及其对应的 callback,用于判断哈稀变化时执行对应的回调;
		1. 它的值通过是在 Router 里添加的;
		2. 无论 Backbone.history.start(); 是否启动,应当说,callback始终只是保存在这个数组中,
			并没有被绑定到 hashchange 里去,而是哈稀变化后,执行 this.loadUrl() 函数,然后再根据
			现哈稀值对比 Backbone.history.handlers 里的哈稀值,若匹配到对应的哈稀,则执行对应的回调;
	d、 Backbone.history.options
		是在 Backbone.history.start(options); 里添加的,当然这里会有一个扩展进去的默认值{root: "/"}
		一、 options.root
		二、 options.silent
		三、 options.hashChange
		四、 options.pushState
	e、 事件绑定方式(三种)
		一、 window.onpopstate
			Backbone.history._wantsPushState
			Backbone.history._hasPushState
			Backbone.history._usePushState
		二、 window.onhashchange
			Backbone.history._wantsHashChange
			Backbone.history._hasHashChange
			Backbone.history._useHashChange
		三、 this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
	f、  History.started = true/false;

D、 正则表达式
	a、 二种写法
		一、 二种写法之一(字面量)  var patt = /pattern/modifiers;
			/值1/值2 
			var reg1 = /#(.*)$/;    
			var reg2 = /\s+/;
			var reg3 = /hello/g;
		二、 二种写法之一(使用new) var patt = new RegExp(pattern, modifiers);
			new RegExp("值1", "值2")
			var reg1 = new RegExp("#(.*)$");
			var reg2 = new RegExp("\s+");
			var reg3 = new RegExp("hello", "g");
	b、 重要API  reg.test(str);  返回值为 true/false
		var reg1 = /\s/;//空格
		var str1 = "ab cd e f";
		reg1.test(str1);//true
	c、 重要API reg.exec(str);  //str.match(reg)
		一、 返回值 null 或 数组
			此数组的第 0 个元素是与正则表达式相匹配的文本，
			第 1 个元素是与 RegExpObject 的第 1 个子表达式相匹配的文本（如果有的话），
			第 2 个元素是与 RegExpObject 的第 2 个子表达式相匹配的文本（如果有的话），以此类推。
			exec() 方法还返回两个属性。
			index 属性声明的是匹配文本的第一个字符的位置。
			input 属性则存放的是被检索的字符串 string。
	d、 具体写法
		一、 解析 modifiers(修饰符)
			1. i - 修饰符是用来执行不区分大小写的匹配。
				var patt1=/w3cschool/i;
			2. g - 修饰符是用于执行全文的搜索（而不是在找到第一个就停止查找,而是找到所有的匹配）。
			3. m - 执行多行匹配。
		二、 pattern(表达式)主表达式-子表达式
			1. 表达式还可以这样分:
				主表达式(子表达式1)(子表达式2)(子表达式3)
				(1) 例子1
					var str1 = "ab c1 dd1 aef";
					var reg1 = /[a-z][0-9]/;
					var result = reg1.exec(str1);//["c1"]
				(2) 例子2
					var str1 = "a#abc";
					var reg1 = /#(.*)/;
					var result = reg1.exec(str1);//["#abc", "abc"]
					result[0]的值 /#(.*)/ 匹配出来的
					result[1]的值 (.*) 匹配出来的(必须在result[0]上)子表达式 1
				(3) 例子3
					var str1 = "ab c dd12 a213 adf";
					var reg1 = /[a-z]([a-z])([1-9])/;
					var result = reg1.test(str1);//["dd1", "d", "1"]
					result[0]的值 /[a-z]([a-z])([1-9])/ 匹配出来的
					result[1]的值 ([a-z]) 匹配出来的(必须在result[0]上)子表达式 1
					result[2]的值 ([0-9]) 匹配出来的(必须在result[0]上)子表达式 2
		