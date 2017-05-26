A、 Backbone框架结构
	一、 factory为什么会是个函数
		factory是一个函数,即在执行处()内声明的函数
		那么为什么需要这样写呢?因为一般匿名函数立即执行时,(function(a){})(a)处的a都是个全局变量
		因为Backbone是有可以在服务器端(node)运行的(但服务端不具备window变量)
		(所以要装它封装成函数,让它能在服务端和浏览器端二套不同的环境运行)
		(核心其实二点,root取值跟封装成模块的方法不完全一样)
		而且服务器端又分成二种:一个是AMD,一个是CommonJS
		当然,因为backnone重度依赖underscore,需要先在node安装underscore模块(npm install underscore)
		(function(factory) {
			factory();//AMD
			factory();//CommonJS
			factory();//浏览器
		})(function(root, Backbone, _, $) {
			return Backbone;
		});
	二、 root的值其实有二种可能
		其实backbone里面除了url部分,其它部分都没有使用window这个全局变量,而是以root来代替
		这时的root其实共有二种值的可能,
		1. 一个是window(浏览器端),
		2. 一个是global(服务端)
		(function(factory) {
			var root = (typeof self == "object" && self.self == self && self) || 
            		(typeof global == "object" && global.global == global && global);
		})(function(root, Backbone, _, $) {
			return Backbone;
		});
	三、 探讨factory的四个参数
		1. root = (window || global)
		2. Backbone = ({} || exports)
		3. _ = (underscore || (define("underscore") || require("underscore")))
		4. $ = ((jQuery || Zepto || ender || $) || (define("jquery") || require("jquery")))
		从中可以得出:
		$其实是可以取各种值的,并不是非要jQuery.js(这里需要注意一点,其实Backbone是可以不使用$的);
		_重度依赖,浏览器端为underscore.js,服务器端为underscore模块(npm install underscore);
		Backbone默认设值其实都为{},但是浏览器端为{},在服务器端为exports,
		其实服务器端的exports本质上也是个空{},但是这个 exports 在AMD和CommonJS各有不同,
		CommonJS里的exports为一个全局对象{},用于绑定模块
		AMD里的exports则需要加载exports模块,也是用于声明模块,应该也是个空{}
	四、 backbone.js使用的三种情形
		即factory函数调用的三种可能(AMD,CommonJS,浏览器)
		这里需要注意一个细节,在这三种情形中,作为浏览器和AMD调用,Backbone都会被绑在root.Backbone下成为一个全局对象,但唯独在CommonJS并没有绑在root下,
		(因为在CommonJS调用模块一般会这样执行var Backbone = require("Backbone.js");使用)
		(function(factory) {
            //backbone.js使用的三种情形--node中的AMD(异步)使用
		    if(typeof define == "function" && define.amd) {
		        define(["underscore", "jquery", "exports"], function(_, $, exports) {
		            root.Backbone = factory(root, exports, _, $);
		        });

		    //backbone.js使用的三种情形--node中的CommonJS(同步)使用
		    }else if(typeof exports != "undefined") {
		        var _ = require("underscore"),
		            $;
		        try{
		            $ = require("jquery")
		        }catch(e) {}
		        factory(root, exports, _, $);
		        //注意,并不是 root.Backbone = factory(root, exports, _, $);

		    //backbone.js使用的三种情形--浏览器端
		    }else {
		        root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
		    }
		})(function(root, Backbone, _, $) {
			return Backbone;
		});
	五、 Backbone作为一个{},并不是一个类(函数),那么它的下面到底有什么(对象 方法 属性)
		总的来说,Backbone就是由五个子类和二个对象组成的MVC框架
		当然,除了这七个主体部分,还有部分东西,包括Backbone.Event下的所有方法,
		和Backbone.$,Backbone.ajax,Backbone.noConflict,Backbone.sync
		1. Backbone.Model 	 	是一个类
		2. Backbone.View 		是一个类
		3. Backbone.Router 		是一个类
		4. Backbone.History		是一个类
		5. Backbone.Collection  是一个类
		6. Backbone.Events 		是一个{},并不是一个类
		7. Backbone.history		是一个由Backbone.History实例化的对象,并不是一个类
		(function(factory) {
		})(function(root, Backbone, _, $) {
			var Model = Backbone.Model = function() {};
			Model.prototype = {};

			var View = Backbone.View = function() {};
			View.prototype = {};

			var Router = Backbone.Router = function() {};
			Router.prototype = {};

			var History = Backbone.History = function() {};
			History.prototype = {};

			var Collection = Backbone.Collection = function() {};
			Collection.prototype = {};

			var Event = Backbone.Event = {};

			var history = Backbone.history = new History();

			var extend = function() {};
			Model.extend = View.extend = Router.extend =  History.extend = Collection.extend = extend;

			Backbone.$ = $;
			Backbone.ajax = function() {};
			Backbone.noConflict = function() {};
			Backbone.sync = function() {};
			_.extend(Backbone, Backbone.Events);

			return Backbone;
		});
	六、 extend 伟大的圣杯模式
		圣杯模式有几点是必须要实现的
		1. prototype 和 prototype.__proto__
			父类的 prototype 必须是子类的 prototype.__proto__(可借助一个F空类来实现)
			var Child = Parent.extend({});中{}的属性和方法必须是子类的prototype属性
		2. 父类和子类的构造器指向
			父类中的构造器属性constructor必须指向父类自己(F.prototype.constructor = parent;)
			子类中的构造器属性constructor必须指向子类自己(child.prototype.constructor = child;)
		3. 无论是父类还是子类,new时必须是初始化父类的构造器
			var child = function() {
	            parent.apply(this, arguments);
	        };
		var extend = function(options) {
	        var parent = this;
	        
	        var F = function() {};
	        F.prototype = parent.prototype;
	        F.prototype.constructor = parent;

	        var child = function() {
	            parent.apply(this, arguments);
	        };
	        child.prototype = new F();
	        child.prototype.constructor = child;
	        for(var name in options) {
	            child.prototype[name] = options[name];
	        }

	        return child;
	    };
	    有一点需要注意:在初始化构造器时,在构造器结尾处必须调用父类的initialize(函数)
	    即this.initialize.apply(this, arguments);而且这个initialize在类中必须是个空函数,
	    一般在扩展子类时会声明一个新的initialize类来代替父类的initialize,
	    这样在new时就有了一个回调
B、 Backbone的精髓在什么地方
	通过Backbone框架结构的了解,已对Backbone的框架有了很熟识的了解,这个很重要,
	以后了解框架或类库就可站在这个全新的高度去看了
	但是最重要的尚未了解,就是这个Backbone的精髓到底在哪里呢
	一、 类与实例化
		1、 声明类 
			首先,声明一个类,落实到脚本的执行时,其实就是赋二个值,说白了其实就是脚本执行二步就完成
			即类的构造器赋值,类的prototype赋值
		2、 扩展一个新类
			扩展一个新类,其实主要就三步,
			第一步子类构造器赋值
			第二步将父类的prototype绑到子类的prototype.__proto__中
			第三步将extend({})参数中的属性赋值到子类的prototype属性中去
			并不涉及到构造器的调用(空F不算),其实真正落实到脚本执行,也就十几行
		3、 初始化一个实例对象(使用父类或子类)
			应当说声明一个类和扩展一个类,对于所有的类手法几乎一模一样,没有什么值得好研究的
			但是到初始化实例对象其实就三步
			var car = new Car({name: "xbl", id: 101});
			等价于
			var car = {};
			car.__proto__ = Car.prototype;
			Car.call(car, {name: "xbl", id: 101});
			对于一个类来说,有二点其实是很重要的,一个是API的设计,一个是构造器的初始化

			构造器的初始化对于类来说其实很重要,到底干了些什么呢?
			1) 给每个实例化对象赋一个唯一的id值
				this.cid = _.uniqueId("c");
				this.cid = _.uniqueId("v");
			2) 在构造器函数结尾处调用初始化函数
				this.initialize.apply(this, arguments);
			3) this下的各种值的设置
				首先this下的值其实一共可分成三种:
				(1) 有接口可供改变型
					如: this.name = options.name;
						this.attributes.name = options.name;
					这种值的设置一般都会通过接口方法来设置
					即:
						this.setName(option.name);
				(2) 无接口可供改变型-在new时可设置
					如: this.status = options.status;
				(3) 无接口可供改变型-在new时不可设置
					这种其实还可分成二种,一种就是标记型,一种是值保存型
					如: this._hasPushState = "onpopstate" in window;  
						this.handlers = [];
						this._events = {};
						this.changed = {};
			4) 启动监听事件
				这种一般较少,但是有一点需要注意,其实非原生的'事件'监听,
				其实是通过接口的回调设置来实现,像Backbone.Events的事件
				应该说Backbone的精髓就是实现了这一套非原生'事件'监听的一整套监听
	二、 Backbone的精髓体验
		通过调用book1.set("title", "book111");有二个地方的事件被触发了
		应当说精髓就在这里,通过操作Model的对象,在各处声明的回调事事件都可被执行
		这样用户只需关注操作Model的对象即可
		var Book = Backbone.Model.extend({  
			default : {  
				title:'default'  
			}
		});  
		var book1 = new Book({title : 'book1'});   
		var book2 = new Book({title : 'book2'});  
		var book3 = new Book({title : 'book3'});  
		book1.on("change:title", function(model, user) {
			console.log("新用书名为:" + user);
		});
		book2.on("change:title", function(model, user) {
			console.log("新用书名为:" + user);
		});
		  
		BookShelf = Backbone.Collection.extend({    
			model : Book   
		});  
		var bookShelf = new BookShelf([book1, book2, book3]);   
		bookShelf.on("change:title", function() {
			console.log("集合中有属性被更新了")
		});
		book1.set("title", "book111");
	三、 Backbone的MVC
		1. MVC框架
			M-Model
			V-View
			C-Router(旧版为controller)(其实这玩样主要是监听url的哈稀值)
C、 Backbone中七个主部分的功能都是些啥
	一、 Backbone.Events(这是一个对象,并不是一个类)
		1. 核心功能一:监听事件、 触发事件、 移除事件
			Events.on(name, callback, [context]);
			Events.trigger(name, [*args]);
			Events.off([name], [callback], [context]);
			其实这些'事件'都不是原生的事件,都是通过操作this._events这个对象还有在接口方法设置对应的回调来完成的
		2. 核心对象 Events._events 
			这玩样是保存被监听的函数对象,那么它的具体格式是什么呢
			Events.trigger("add");那么add对应的数组下的事件都会被调用(也包括listenTo添加的)
			object1.on("add", function(msg) {
				console.log(msg);//xbl
				console.log(this.name);//宝马
			}, {name: "宝马"});
			object1.trigger("add", "xbl");
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
						listening: undefined
					}
				]
			};
		3. Events不是一个类,但它却普遍使用了this,这个很重要,如
			Events.on = function(name, callback, context) {
	            return internalOn(this, name, callback, context);
	        };
	        Events.trigger = function(name) {
	            if(!this._events) {
	                return this;
	            }
	        };
	        这个this是指向这些方法的所有者,在这里是Events,当然,如果这些方法被其它对象所克隆或扩展,
	        那么这个this理所当然的指向被扩展的对象而不是this;
	        一旦使用克隆或将Events下的方法复制到各个类下的prototype,
	        那么实例化的对象就会有Events下的这一整套功能,this就会指向实例化对象
	        当然,包括this._events下的this
	        所以Events是一个能被复制的一套api(只要复制了Events下的九个api接口即可使用)
	    4. 那么都有哪些类扩展了这个Events了呢
	    	其实都扩展了,Backbone还有Backbone下的五个类都复制了Events这一套功能
	    	所以其它所有的由Backbone的五个类或其子类实例化出来的对象,都具备Events这一套功能
	    	Backbone 		_.extend(Backbone, Backbone.Events);
			Model			_.extend(Model.prototype, Backbone.Events, {});
			View			_.extend(View.prototype, Backbone.Events, {});
			Router			_.extend(Router.prototype, Backbone.Events, {});
			Collection		_.extend(Collection.prototype, Backbone.Events, {});
			History			_.extend(History.prototype, Backbone.Events, {});
		5. 核心功能二:一个对象可以监听另一个对象的一种事件是否触发
			object1.listenTo(object2, 'alert1', function() {});
			当object2.trigger("alert1");那么listenTo里绑定的回调就会触发
			(注:如果此时object1也绑定了alert1事件,那么该事件会不会触发呢?当然不会)
			这一点非常的重要,因为Events的事件只能在本对象监听本对象触发,
			那么对象之间的联系就无法建立
			1) 自己监听的事件,只有自身才能触发
			2) 不同对象之间的联系是通过object1.listenTo(object2, 'alert1', function() {});建立
				当object2触发alert1事件时,那么listenTo里的函数也会被执行(当然,object1的alert1事件并不会触发)
				使用object1.listenTo(object2, type, fn)方法,对于object1._events并没有发生变化,事件是添加到了object2._events中;
				object2._events.alert1[1].listening就不会再是undefined
				object1会新增加一个object1._listeningTo对象,
				object2则会新增一个object2._listeners对象
				这二个东西(_listeningTo和_listeners)的值其实是一样的,只是key用对方的cid,{id:object1.cid, objId:object2.cid,count:1}
			3) object2在触发事件时,因为listenTo的事件就是增加object2上,所以会一起触发
			var object1 = _.clone(Backbone.Events);
			var object2 = _.clone(Backbone.Events);
			object1.on("alert1", function(msg) {//触发
				console.log(msg);
			});
			object1.on("alert2", function(msg) {
				console.log(msg);
			});
			object2.on("alert1", function(msg) {//并没有触发
				console.log(msg);
			});
			object2.on("alert2", function(msg) {
				console.log(msg);
			});
			//object2作为被监听方,即object2.trigger("alert1");时该函数才会触发
			object1.listenTo(object2, 'alert1', function(a) {//触发
				console.log(this);//this是指向object1
				console.log(a);
			});
			object2.trigger("alert1", "xbl");
	二、 Backbone.Model
		1. 核心功能一:当调用api(set接口)设置其值时,若绑定了监听的事件,则该监听事件自动触发
			var Car = Backbone.Model.extend({});
			var car1 = new Car({
				user: "xbl",
				name: "宝马"
			});
			car1.on("change:user", function(model, user) {
				console.log("新用户名为:" + user);
			});
			car1.on("change:name", function(model, name) {
				console.log("新车名为:" + name);
			});
			car1.set({name: "宝马2"});//触发change:name事件
		2. 核心功能二:将实例化对象的attributes数据同步到服务器上
			1) 同步数据使用this.sync(method, this, options);进行同步
				method为GET之类的,
				this指向实例化对象(在Backbone.sync中取出 attributes),
				options一般包括四个参数,
				{
					parse: true,
					validate: true,
					success: function() {},
					error: function() {}
				}
			2) Model中其实一共有三个api接口使用了this.sync
				this.fetch 		去获取服务器中的数据并保存到this.attributes
				this.save 		将this.attributes保存到服务器
				this.destroy 	销毁服务器中的数据(应该是将里面的值都置空了)
			3) 有一点需要注意的是,当调用this.set方法时,并不会将数据发送到服务器,
				只有要调用this.save()之后才会发起更新到服务器
			4) 绑定request事件,只要将请求发送到服务器,都会触发这个事件
				car1.on("request", function(model, xhr, options)() {});
		3. 重要属性:attributes({})
			var car1 = new Car({
				user: "xbl",
				name: "宝马"
			});
			像new里的参数,user和name,其实都被绑到car1.attributes里去了
			即attributes的值为
			{
				user: "xbl",
				name: "宝马"
			}
		4. 重要属性:_previousAttributes({})
			刚初始化时,_previousAttributes对象是个空{};
			_previousAttributes其实就是调用set之前上一个attributes
			当调用一次set方法时,可以理解为:
			attributes的整个属性都被会转到_previousAttributes
			attributes则会生成一个新的{}值
		5. 重要属性:changed({})
			刚初始化时,changed也是个空{}
			changed其实是最后一次调用set时被改变的实例化的属性
			当car1.set({name: "宝马2"})之后,car1.changed值为{name: "宝马2"}
			当car1.set({user: "xbl12"})之后,car1.changed值为{user: "xbl12"},
			而不是{user: "xbl12", name: "宝马2"},它只保留最后一次set方法的属性
		6. 重要属性:_pending(options/false)
			只在set中使用
			默认值为false,别的值取this._pending = options;
			并在set的结尾时设为false
			这个应该是用于触发change(注意不是change:user这些)事件用的(而且不管set的参数有如何,change都只触发一次)
		7. 重要属性:_changing(true/false)
			在set和changedAttributes中使用
			这个应该是防止attributes在同一时刻被改变二次或多次所设的,按道理在浏览器端,
			脚本都是单线程的,不会发生这种可能,但是考虑到如果在node服务器运行,就要考虑这种可能了
	三、 Backbone.View
		1. 初始化
			1) 一般来说它在new时需要二个参数,一个是model实例,一个是dom元素,如
				new CarView({model: car1, el: "#search_container"});
				new CarView({model: car1, tagName: "ul"});//没插入到文档树
			2) 绑定model对象
			3) 根据el或tagName(新标签)属性生成this.el和this.$el
			4) 解绑事件	
				this.$el.off(type + '.delegateEvents' + this.cid, selector, listener);
			5) 将所有事件委派到el中
				所有的事件都是通过
				this.$el.on(type + '.delegateEvents' + this.cid, selector, listener);
				来绑定的
				这样的事件并没有通过Events来绑定,当然,提供的off解绑事件接口也是根据绑定的方式制定的
			6) 这里需要注意,其实在new时并没有将model的内容渲染进模板中去
				View虽然也有render方法,但它像initialize一样是一个空函数
			7) 还有一点需要注意,当调用car1.set方法时,页面中的内容也并没有跟着变化,
				而是必须调用一次render才可
		2. 核心功能:绑定事件
			其实View的功能真的比较简单,就是将events里的方法绑定到$el中去;
			生成el和$el,绑定Model对象,其它就没有什么了,
			连页面渲染也是要自己写
		3. 属性:this.el 和 this.$el
		4. 属性:this.model
	四、 Backbone.Router
		1. 核心功能:当启动Backbone.history.start();时,它能监听url的哈稀变化并触发相应的回调
			var AppRouter = Backbone.Router.extend({
				routes: {
					"help":                 "help",
					"help/a":        		"search1",
				},
				help: function() {
					console.log("help1");
				},
				search1: function(query, page) {
					console.log("search1");
				}
			});
			var app_router = new AppRouter();
			Backbone.history.start();
		2. 应当说,其实它跟Model跟View并没有任何关系,可以把它理解为MVC中的C,但它的实际功能和
			MVC中要担当的C其实并没有关点关系,而且有一点,它是做到兼容ie6,这一点很重要,
			因为做到ie9跟ie6的源码是相当极大的,
			而且,还有一点,它只能new一次(或以最后的一次new为本)
		3. 重要属性:this.routes
			其实就是将 this.routes = options.routes;
			routes: {
				"help":                 "help",
				"help/a":        		"search1",
			},
		4. Router实例化的对象,它的事件对象(route与callback)并不是保存在Router实例化的对象中,
			而是保存在Backbone.history.handlers(数组)中,至于为什么会这样呢?应该是减少它们之间的解耦
			因为hash变化的监听是写在Backbone.history中,如果将事件保存在Router实例化对象中,
			那么就会造成Backbone.history对Router的依赖
			Backbone.history.handlers = [
				{
					route: /^help(?:\?([\s\S]*))?$/,
					callback: function() {}
				},{
					route: /^help\/a(?:\?([\s\S]*))?$/,
					callback: function() {}
				}
			];
	五、 Backbone.History 与 Backbone.history
		1. 重要属性:this.handlers
			初始化时 this.handlers = [];
		2. 重要属性:this.checkUrl(函数)
			this.checkUrl这是History的一个接口API,这是个很重要的函数,绑定哈稀变化的回调和
			解绑哈稀变化回调函数都是使用this.checkUrl这个函数
		3. 属性:this.location
			其实就是 this.location = window.location;
		4. 属性:this.history
			其实就是 this.history = window.history;
		5. 有一点需要注意的是,History作为一个类,
			但是其实构造器在初始化时并没有执行this.initialize这个函数
		6. 还有一点,应当说如果没有执行Backbone.history.start();这段代码,Backbone.
			history其实就只有handlers,checkUrl,location,history这四个属性(不含API)
		7. 属性:History.started 注意这个是类的一个属性,而不是this的
			它的作用是用于监测this.start是否已经启动了,若启动了则这上值为true
			它在三个函数用到,一个是this.start(在函数开始时设为true),一个是this.stop(在this.
			stop结尾设为false)
			从这个属性可以看出,其实一个类History(不含扩展)其实只有一个实例化对象是有用的
		8. Backbone.history.start();这个当然是启动history的功能,其实核心就是启动监听url的哈稀变化
			启动这个服务之后,就在this下增加了很多个属性,都是服务于监听url里的哈希变化
			1) this.options = _.extend({root: '/'}, this.options, options);
			2) this.root = this.options.root; //到底这个有什么用呢?
			3) this.fragment = this.getFragment(); //指#help中#之后的help的哈稀值
			4) this._hasHashChange = 'onhashchange' in window && 
				判断是否【想】使用window.onhashchange 进行监听
				(作用仅限服务于this._useHashChange)
			5) this._wantsHashChange = this.options.hashChange !== false;
				判断浏览器是否【支持】window.onhashchange
				(作用仅限服务于this._useHashChange)
			6) this._useHashChange   = this._wantsHashChange && this._hasHashChange;
				判断是否用window.onhashchange 进行监听hash
			7) this._wantsPushState = !!this.options.pushState;
				判断是否【想】使用window.onpopstate进行监听
				(作用仅限服务于this._usePushState)
			8) this._hasPushState = !!(this.history && this.history.pushState);
				判断浏览器是否【支持】window.onpopstate
				(作用仅限服务于this._usePushState)
			9) this._usePushState = this._wantsPushState && this._hasPushState;
				判断是否用window.onpopstate 进行监听hash
			10) this.interval 不使用onpopstate和onhashchange而定时器方案时,
				这个参数是定时器的时间(默认值为50)
			11) this._checkUrlInterval 不使用onpopstate和onhashchange而定时器方案时,
				这个参数是定时器的id
		9. 关于如何监听url的哈稀变化,其实代码中一共提供了三套方案
			addEventListener('popstate', this.checkUrl, false);//优先使用
			addEventListener('hashchange', this.checkUrl, false);
			this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
	六、 Backbone.Collection
		1. 核心功能:当多个model对象组合成一个Collection(如carColl)之后,
			执行
			carColl.add(car1),
			carColl.remove(car1),
			carColl.set(car1)//可触发update,add,remove三种事件
			方法之后;对应的事件会触发
			bookList.on("update", function() {});//bookList都会触发
			bookList.on("add", function() {});
			bookList.on("remove", function() {});
		2. 核心功能:Collection对象里面的多个model对象,它们之间是怎么联系的
			比方说某一个model对象更新属性后,其它的对象会如何
		3. 核心功能:sort排序(到底是如何实现的呢)
			bookList.sort();之后,可触发排序事件,
			bookList.on("sort", function() {});
		4. 核心功能:类数组的一套API(push,pop,shift,unshift等),
			增加类的都是通过add-set来完成的
			删除类的都是通过remove-_removeModels来完成的
		5. 核心功能:_.数组里的几乎一整套api的仿用
			_[method].apply(_, args);
		6. 重要属性:models(值与_byId必须对上)
			保存Model对象的数组,如[book1, book2];
		7. 重要属性:_byId
			保存Model对象的对,如
			this._byId = {
				c1: book1,
				c2: book2
			}
		8. 事件:bookList.reset 与 bookList.on("reset", function() {});
		8. 属性:this.length
		9. this._byId下的每个子model对象,其实都有一个collection对象,
			而且这个collection对象就是指向this
			这个属性在this._prepareModel函数中完成
			attrs(model).collection = this;return attrs;
			那到底这个collection都有些什么用呢?
		10. this.url
		

D、其它
	一、 Backbone.sync作为将model数据同步到服务器的api
		其实一共在二个类中使用了,一个是Model,一个是 Collection
		二个类都是将Backbone.sync转化成了自已的this.sync(return Backbone.sync.apply(this, arguments);)
		 Backbone.sync(method, model, options);

	