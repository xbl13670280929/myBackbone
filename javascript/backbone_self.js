(function(factory) {
    //取root值:浏览器端为window,服务器端为global
    var root = (typeof self == "object" && self.self == self && self) || 
            (typeof global == "object" && global.global == global && global);

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

    //backbone.js使用的三种情形--浏览器端
    }else {
        root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
    }
})(function(root, Backbone, _, $) {
    //全局通用 start
    var wrapError = function(model, options) {
        var error = options.error;
        options.error = function(resp) {
            error && error.apply(options.context, model, resp, options);
            model.trigger("error", model, resp, options);
        };
    };
    var addUnderscoreMethods = function(Class, methods, attributes) {
        _.each(methods, function(length, method) {
            if(_[method]) {
                Class.prototype[method] = addMethod(length, method, attributes);
            }
        });
    };
    var addMethod = function(length, method, attributes) {
        return function() {
            var args = [].slice.call(arguments);
            args.unshift(this[attributes]);
            _[method].apply(_, args);
        };
    };
    var urlError = function() {
        throw new Error("必须声明一个url")
    };
    //全局通用 end
    
    //Event start .....
    (function(Backbone) {
        var Events = {};
        var eventsApi = function(iteratee, events, name, callback, opts) {
            var i, j,
                names,
                eventSplitter = /\s+/;

            if(name && typeof name === "object") {
                names = _.keys(name);
                for(i = 0, j = names.length; i < j; i++) {
                    //使用events = eventsApi()而不是events = iteratee()
                    //因为names[i]它可含有空格,所以需要再次遍历
                    events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
                }
            }else if(name && eventSplitter.test(name)) {
                names = name.split(eventSplitter);
                for(i = 0, j = names.length; i < j; i++) {
                    events = iteratee(events, names[i], callback, opts); 
                }
            }else {
                events = iteratee(events, name, callback, opts); 
            }
            return events;
        };
        Events.on = function(name, callback, context) {
            return internalOn(this, name, callback, context);
        };
        var internalOn = function(obj, name, callback, context, listening) {
            obj._events = obj._events || {};
            eventsApi(onApi, obj._events, name, callback, {
                context: context,
                ctx: obj,
                listening: listening
            });

            if(listening) {
                var listeners = obj._listeners || (obj._listeners = {});
                listeners[listening.id] = listening;
            }
            return obj;
        };
        var onApi = function(events, name, callback, options) {
            if(callback) {
                var handlers = events[name] || (events[name] = []);
                var context = options.context, ctx = options.ctx, listening = options.listening;
                handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
                if(listening) {
                    listening.count++;
                }
            }
            return events;
        };
        Events.trigger = function(name) {
            if(!this._events) {
                return this;
            }
            var args = [].slice.call(arguments, 1);

            eventsApi(triggerApi, this._events, name, null, args);
            return this;
        };
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
        var triggerEvents = function(eventsArr, args) {
            var i, j,
                ev;

            if(eventsArr && eventsArr.length) {
                for(i = 0, j = eventsArr.length; i < j; i++) {
                    ev = eventsArr[i];
                    ev.callback.apply(ev.ctx, args);
                }   
            }
        };
        Events.off = function(name, callback, context) {
            if(!this._events) {
                return this;
            }
            eventsApi(offApi, this._events, name, callback, {
                context: context,
                listeners: this._listeners
            }); 
            return this;
        };
        var offApi = function(events, name, callback, opts) {
            if(!events) {
                return;
            }
            var i, j, m, n,
                handlers, handler,
                listeners = opts.listeners,
                listening, listeningTo,
                context = opts.context;

            if(!name && !callback && !context) {
                var ids = _.keys(listeners);
                for(i = 0, j = ids.length; i < j; i++) {
                    listening = listeners[ids[i]];
                    delete listeners[listening.id];
                    delete listening.listeningTo[listening.objId];
                }
                return;
            }

            var names = name ? [name] : _.keys(events);
            for(i = 0, j = names.length; i < j; i++) {
                name = names[i];
                handlers = events[name];
                if(!handlers) {
                    break;
                }
                var remaining = [];
                for(m = 0, n = handlers.length; m < n; m++) {
                    handler = handlers[m];

                    //若 handlers[m] 需要保留下来,则保存在 remaining 中
                    //当 handlers 遍历完后,若 remaining 有值,则 events[name] = remaining;
                    //若 remaining 无值,则说明这个 events[name] 应该被删除了
                    //callback !== handler.callback._callback 这种可能是针对 once 绑定的事件
                    if((callback && callback !== handler.callback && callback !== handler.callback._callback) ||
                        (context && context !== handler.context)) {
                        remaining.push(handler);
                    }else {//不需要保留的 handler
                        listening = handler.listening;
                        if(listening && --listening.count === 0) {
                            delete listeners[listening.id];
                            delete listening.listeningTo[listening.objId];
                        }
                    }
                }

                if(remaining.length) {
                    events[name] = remaining;
                }else {
                    delete events[name];
                }
            }

            return events;
        };
        Events.listenTo = function(obj, name, callback) {
            if(!obj) {
                return this;
            }

            var objId = obj._listenId || (obj._listenId = _.uniqueId('l'));
            var thisId = this._listenId || (this._listenId = _.uniqueId('l'));

            var listeningTo = this._listeningTo || (this._listeningTo = {});
            var listening = listeningTo[objId];

            if(!listening) {
                listening = {
                    objId: objId, 
                    obj: obj, 
                    id: thisId, 
                    listeningTo: listeningTo, 
                    count: 0
                };
                listeningTo[objId] = listening;
            }

            internalOn(obj, name, callback, this, listening);
            return this;
        };
        Events.stopListening = function(obj, name, callback) {
            var listeningTo = this._listeningTo;
            if(!listeningTo) {
                return this;
            }

            var ids = obj ? [obj._listenId] : _.keys(_.listeningTo);

            for(var i = 0, j = ids.length; i < j; i++) {
                var listening = listeningTo[ids[i]];
                listening.obj.off(name, callback, this);
            }
            return this;
        };
        Events.once = function(name, callback, context) {
            var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
            return this.on(events, undefined, context);
        };
        Events.listenToOnce = function(obj, name, callback) {
            //务必要为 this.stopListening 绑定第一个参数:obj
            var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
            return this.listenTo(obj, events);
        };
        var onceMap = function(map, name, callback, off) {
            if(callback) {
                var once = map[name] = _.once(function() {
                    off(name, once);
                    callback.apply(this, arguments);
                });
                once._callback = callback;
            }
            return map;
        };
        Events.bind = Events.on;
        Events.unbind = Events.off;
        Backbone.Events = Events;
    })(Backbone);
    //Event end   .....

    //Model start .....
    (function(Backbone) {
        var Model = Backbone.Model = function(attributes, options) {
            this.cid = _.uniqueId(this.cidPrefix);
            this.attributes = {};

            var attrs = attributes || {};

            options || (options = {});
            if(options.collection) {
                this.collection = options.collection;
            }

            if(options.parse) {
                attrs = this.parse(attrs, options) || {};
            }
            var defaults = _.result(this, "defaults");
            attrs = _.extend({}, defaults, attrs);
            
            this.set(attrs, options);
            this.changed = {};

            this.initialize.apply(this, arguments);
        };
        Model.prototype = {
            cidPrefix: "c",
            idAttribute: "id",
            changed: null,
            validationError: null,
            initialize: function() {},
            set: function(key, val, options) {
                if(key == null) {
                    return this;
                }

                var attrs;
                if(typeof key === "object") {
                    attrs = key;
                    options = val;
                }else {
                    attrs = {};
                    attrs[key] = val;
                }
                options || (options = {});

                //如果attrs没有通过this.validate函数的认证,则返回false
                //有一点要注意:是 this.validate 返回 false 才能通过验证
                if(!this._validate(attrs, options)) {
                    return false;
                }

                var current = this.attributes;
                //changes,用于触发 change:[attribute]
                var changes = [];

                this._previousAttributes = _.clone(this.attributes);
                var prev = this._previousAttributes;

                this.changed = {};
                var changed = this.changed;
                
                for(var attr in attrs) {
                    val = attrs[attr];
                    
                    if(!_.isEqual(current[attr], val)) {
                        changes.push(attr);
                    }

                    if(!_.isEqual(prev[attr], val)) {
                        changed[attr] = val;
                    }else {
                        delete changed[attr];
                    }

                    options.unset ? delete current[attr] : current[attr] = val;
                }

                if(this.idAttribute in attrs) {
                    this.id = this.get(this.idAttribute);
                }

                if(!options.silent) {
                    for(var i = 0, j = changes.length; i < j; i++) {
                        this.trigger("change:" + changes[i], this, current[changes[i]], options);
                    }   
                }
                
                if(!options.silent) {
                    this.trigger("change", this, options);
                }

                return this;
            },
            get: function(attr) {
                return this.attributes[attr];
            },
            has: function(attr) {
                return this.get(attr) != null;
            },
            toJSON: function() {
                return _.clone(this.attributes);
            },
            escape: function(attr) {
                return _.escape(this.get(attr));
            },
            clear: function(options) {
                var attrs = {}, attributes = this.attributes;
                for(var attr in attributes) {
                    attrs[attr] = undefined;
                }
                return this.set(attrs, _.extend({}, options, {unset: true}));
            },
            unset: function(attr, options) {
                return this.set(attr, undefined, {unset: true});
            },
            hasChanged: function(attr) {
                if(!attr) {
                    return _.isEmpty(this.changed);
                }
                return _.has(this.changed, attr);
            },
            clone: function() {
                return new this.constructor(this.attributes);
            },
            sync: function() {
                return Backbone.sync.apply(this, arguments);
            },
            _validate: function(attrs, options) {
                if(!options.validate || !this.validate) {
                    return true;
                }
                attrs = _.extend({}, this.attributes, attrs);
                var error = this.validationError = this.validate(attrs, options) || null;
                if(!error) {
                    return true;
                }
                this.trigger("invalid", this, error, _.extend(options, {validationError: error}));
                return false;
            },
            isValid: function(options) {
                this._validate(this.attributes, _.extend({}, options, {validate: true}));
            },
            changedAttributes: function(diff) {
                if(!diff) {
                    return this.hasChanged() ? _.clone(this.changed) : false;
                }
                var old = this.attributes;
                var changed = {};
                for(var attr in diff) {
                    var val = diff[attr];
                    if(_.isEqual(val, old[attr])) {
                        continue;
                    }
                    changed[attr] = val;
                }

                return _.size(changed) ? changed : false;
            },
            previousAttributes: function() {
                return _.clone(this._previousAttributes);
            },
            previous: function(attr) {
                if(attr == null || !this._previousAttributes) {
                    return null;
                }
                return this._previousAttributes[attr];
            },
            url: function() {
                var base = _.result(this, "urlRoot") || _.result(this.collection, "url");
                if(this.isNew()) {
                    return base;
                }
                var id = this.get(this.idAttribute);
                return base + "/" + encodeURIComponent(id);
            },
            isNew: function() {
                return !this.has(this.idAttribute);
            },
            fetch: function(options) {
                options = _.extend({parse: true}, options);
                var model = this;

                var success = options.success;
                options.success = function(resp) {
                    var serverAttrs = options.parse ? model.parse(resp, options) : resp;
                    //如果没有通过验证
                    if(!model.set(serverAttrs, options)) {
                        return false;
                    }

                    success && success.call(options.context, model, resp, options);
                    model.trigger("sync", model, resp, options);
                };
                wrapError(this, options);

                return this.sync("read", this, options);
            },
            save: function(key, val, options) {
                var attrs;
                if(key == null || typeof key === "object") {
                    attrs = key;
                    options = val;
                }else {
                    attrs = {};
                    attrs[key] = val;
                }
                options = _.extend({parse: true, validate: true}, options);

                var model = this;
                var wait = options.wait;

                //是否立即将 save 里的key-val 立即调用this.set
                if(attrs && !wait && !this.set(attrs, options)) {
                    return false;
                }else if(!this._validate(attrs, options)) {
                    return false;
                }

                //保存原model.attributes的值(因为调用this.sync时attrs里的值必须被保存到this.attriutes)
                var attributes = model.attributes;
                if(attrs && wait) {
                    this.attributes = _.extend({}, attributes, attrs);
                }

                var success = options.success;
                options.success = function(resp) {
                    //取出不含attrs的model.attributes的值
                    model.attributes = attributes;
                    var serverAttrs = options.parse ? model.parse(resp, options) : resp;
                    if(wait) {
                        serverAttrs = _.extend({}, attrs, serverAttrs);
                    }
                    if(serverAttrs && !model.set(serverAttrs, options)) {
                        return false;
                    }
                    
                    success && success.call(options.context, model);
                    model.trigger("sync", model, resp, options);
                };

                wrapError(model, options);

                var method = "create";
                var xhr = this.sync(method, this, options);
                return xhr;
            },
            destroy: function(options) {
                options || (options = {});
                var model = this;
                var wait = options.wait;

                var destroy = function() {
                    model.stopListening();
                    model.trigger("destroy", model, model.collection, options);
                };

                var success = options.success;
                options.success = function(resp) {
                    if(wait) {
                        destroy();
                    }
                    success && success.apply(options.context, model, resp, options);
                    if(!model.isNew()) {
                        model.trigger("sync", model, resp, options);
                    }
                };

                var xhr = false;
                if(this.isNew()) {
                    _.defer(options.success);
                }else {
                    wrapError(model, options);
                    xhr = this.sync("delete", this, options);    
                }

                if(!wait) {
                    destroy();
                }
                
                return xhr;
            },
            parse: function(resp, options) {
                return resp;
            }
        };
        _.extend(Model.prototype, Backbone.Events, {});
    })(Backbone);
    //Model end   .....

    //View start .....
    (function(Backbone) {
        var View = Backbone.View = function(options) {
            this.cid = _.uniqueId("view");
            _.extend(this, _.pick(options, ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events']));
            this._ensureElement();
            this.initialize.apply(this, arguments);
        };
        View.prototype = {
            tagName: "div",
            $: function(selector) {
                return this.$el.find(selector);
            },
            initialize: function() {},
            render: function() {
                return this;
            },
            _ensureElement: function() {
                if(this.el) {
                    this.setElement(this.el);
                }else {
                    this.setElement(this._createElement(this.tagName));
                    //只有使用tagName新生成的dom才会去添加id,class,attributes
                    var attrs = _.extend({}, _.result(this, "attributes"));
                    if(this.id) {
                        attrs.id = _.result(this, "id");
                    }
                    if(this.className) {
                        attrs['class'] = _.result(this, "className");
                    }
                    this._setAttributes(attrs);
                }
            },
            setElement: function(elem) {
                this.undelegateEvents();
                this._setElement(elem);
                this.delegateEvents();
                return this;
            },
            _setElement: function(elem) {
                this.$el = Backbone.$(elem);
                this.el = this.$el[0];
            },
            delegate: function(eventName, selector, listening) {
                this.$el.on(eventName + ".delegateEvents" + this.cid, selector, listening);
                return this;
            },
            delegateEvents: function(events) {
                events = events || _.result(this, "events");
                if(!events) {
                    return this;
                }
                this.undelegateEvents();
                for(var key in events) {
                    var delegateEventSplitter = /^(\S+)\s*(.*)$/;
                    var method = events[key];
                    if(!_.isFunction(method)) {
                        method = this[method];
                    }
                    if(!method) {
                        continue;
                    }
                    var match = key.match(delegateEventSplitter);
                    this.delegate(match[1], match[2], _.bind(method, this));
                }
                return this;
            },
            undelegate: function(eventName, selector, listening) {
                this.$el.off(eventName + ".delegateEvents" + this.cid, selector, listening);
                return this;
            },
            undelegateEvents: function() {
                if(this.$el) {
                    this.$el.off(".delegateEvents" + this.cid);
                }
                return this;
            },
            _setAttributes: function(attrs) {
                this.$el.attr(attrs);
            },
            _createElement: function(tagName) {
                return document.createElement(tagName);
            },
            remove: function() {
                this._removeElement();
                this.stopListening();
                return this;
            },
            _removeElement: function() {
                this.$el.remove();
            }
        };
        _.extend(View.prototype, Backbone.Events, {});
    })(Backbone);
    //View end   .....

    //History start .....
    (function(Backbone) {
        var History = Backbone.History = function() {
            this.handlers = [];
            this.checkUrl = _.bind(this.checkUrl, this);
            if(typeof window !== "undefined") {
                this.location = window.location;
                this.history = window.history;
            }
        };
        History.prototype = {
            interval: 50,
            atRoot: function() {
                var path = this.location.pathname + "/";
                return (path === this.root) && !this.getSearch();
            },
            matchRoot: function() {
                var path = this.location.pathname;
                var rootPath = path.slice(0, this.root.length - 1) + "/";
                return rootPath === this.root;
            },
            getHash: function(window) {
                var match = (window || this).location.href.match(/#(.*)$/);
                return match ? match[1] : "";
            },
            getSearch: function() {
                var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
                return match ? match[0] : "";
            },
            getPath: function() {
                var path = this.location.pathname + this.getSearch();
                return path;
            },
            getFragment: function(fragment) {
                if(fragment == null) {
                    fragment = this.getHash();
                }
                return fragment.replace(/^[#\/]|\s+$/g);
            },
            start: function(options) {
                if(History.started) {
                    throw new Error("Backbone.history has already been started");
                }
                History.started = true;

                this.options = _.extend({root: "/"}, this.options, options);
                this.root = this.options.root;
                this.root = ("/" + this.root + "/").replace(/^\/+|\/+$/g, "/");

                this.fragment = this.getFragment();

                this._wantsHashChange = !!(this.options.hashChange !== false);
                this._hasHashChange = "onhashchange" in window;
                this._useHashChange = this._wantsHashChange && this._hasHashChange;

                this._wantsPushState = !!(this.options.pushState !== false);
                this._hasPushState = "onpopstate" in window;   
                this._usePushState = this._wantsPushState && this._hasPushState;

                var addEventListener = window.addEventListener || function(eventName, listener) {
                    return attachEvent("on" + eventName, listener);
                };

                if(this._usePushState) {
                    addEventListener("popstate", this.checkUrl, false);
                }else if(this._useHashChange) {
                    addEventListener("hashchange", this.checkUrl, false);
                }else {
                    this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
                }

                if(!this.options.silent) {
                    return this.loadUrl();
                }
            },
            stop: function() {
                var removeEventListener = window.removeEventListener ||  function(name, listener) {
                    window.detachEvent("on" + name, listener);
                };

                if(this._usePushState) {
                    removeEventListener("popstate", this.checkUrl);
                }else if(this._useHashChange) {
                    removeEventListener("hashchange", this.checkUrl);
                }else if(this._checkUrlInterval) {
                    clearInterval(this._checkUrlInterval);
                }
                
                History.started = false;

                return this;
            },
            checkUrl: function() {
                return this.loadUrl();
            },
            loadUrl: function(fragment) {
                fragment = this.fragment = this.getFragment(fragment);
                return _.some(this.handlers, function(handler) {
                    if(handler.route == fragment) {
                        handler.callback();
                        return true;
                    }
                });
            },
            route: function(route, callback) {
                this.handlers.unshift({route: route, callback: callback});
            },
            navigate: function(fragment, options) {
                if(!History.started) {
                    return false;
                }
                if(!options || options === true) {
                    options = {trigger: true};    
                }
                fragment = this.getFragment(fragment);
                if(fragment === this.fragment) {
                    return;
                }

                this._updateHash(this.location, fragment, options.replace);
                if(options.trigger) {
                    return this.loadUrl(fragment);
                }
            },
            _updateHash: function(location, fragment, replace) {
                if(replace) {
                    var href = location.href.replace(/#.*$/, "");
                    location.replace(href + "#" + fragment);
                }else {
                    location.hash = "#" + fragment;
                }
            }
        };
        _.extend(History.prototype, Backbone.Events, {});
        Backbone.history = new History();
    })(Backbone);
    //History end   .....

    //Router start .....
    (function(Backbone) {
        var Router = Backbone.Router = function(options) {
            options || (options = {});
            if(options.routes) {
                this.routes = options.routes;
            }
            this._bindRoutes();
            this.initialize.apply(this, arguments);
        };
        Router.prototype = {
            initialize: function() {},
            route: function(route, name, callback) {
                if(_.isFunction(name)) {
                    callback = name;
                    name = "";
                }
                if(!callback) {
                    callback = this[name];
                }

                var router = this;
                Backbone.history.route(route, function(fragment) {
                    var args = [];
                    if(router.execute(callback, args) !== false) {
                        router.trigger("route:" + name, args);
                        router.trigger("route", name, args);
                        Backbone.history.trigger("route", router, name, args);
                    }
                });
                return this;
            },
            execute: function(callback, args) {
                if(callback) {
                    callback.apply(this, args);
                }
            },
            navigate: function(fragment, options) {
                Backbone.history.navigate(fragment, options);
                return this;
            },
            _bindRoutes: function() {
                if(!this.routes) {
                    return;
                }
                this.routes = _.result(this, "routes");
                var routes = _.keys(this.routes),
                    route,
                    i, j;

                for(i = 0, j = routes.length; i < j; i++) {
                    route = routes[i];
                    this.route(route, this.routes[route]);
                }
            }
        };
        _.extend(Router.prototype, Backbone.Events, {});
    })(Backbone);
    //Router end .....

    //Collection start .....
    (function(Backbone) {
        var setOptions = {add: true, remove: true, merge: true};
        var addOptions = {add: true, remove: false};
        var splice = function(array, insert, at) {
            at = Math.min(Math.max(0, at), array.length);

            for(var i = 0, j = insert.length; i < j; i++) {
                array.splice(i + at, 0, insert[i]);
            }
        };
        var Collection = Backbone.Collection = function(models, options) {
            options || (options = {});
            if(options.model) {
                this.model = options.model;
            }
            if(options.comparator) {
                this.comparator = options.comparator;
            }
            this._reset();
            this.initialize.apply(this, arguments);
            if(models) {
                this.reset(models, _.extend({silent: true}, options));
            }
        };
        Collection.prototype = {
            model: Backbone.Model,
            initialize: function() {},
            toJSON: function(options) {},
            sync: function(options) {
                return Backbone.sync.apply(this, arguments);
            },
            add: function(models, options) {
                return this.set(models, _.extend({merge: false}, options, {add: true, remove: false}));
            },
            remove: function(models, options) {
                var singular = !_.isArray(models);
                options = _.extend({}, options);
                if(singular) {
                    models = [models];
                }
                var removed = this._removeModels(models, options);
                if(removed.length && !options.silent) {
                    options.changed = {
                        added: [],
                        merged: [],
                        removed: removed
                    };
                    this.trigger("update", this, options);
                }
                return singular ? removed[0] : removed;
            },
            set: function(models, options) {
                if(!models) {
                    return;
                }

                var singular = !_.isArray(models);
                if(singular) {
                    models = [models];
                }

                options = _.extend({add: true, remove: true, merge: true}, options);

                var add = options.add;
                var merge = options.merge;
                var remove = options.remove;
                var at = options.at;
                if(at > this.length) {
                    at = this.length;
                }

                var set = [];
                var toAdd = [];
                var toMerge = [];
                var toRemove = [];
                var modelMap = {};
                
                var sort, orderChanged;

                //操作参数models,这一步只增加this._byId,
                //并不会改变this.models与this.length
                var model;
                for(var i = 0, j = models.length; i < j; i++) {
                    model = models[i];
                    var existing = this.get(model);
                    modelMap[model.cid] = true;
                    set.push(model);

                    if(existing) {
                        //为什么它不是相对于原组合保持不变的元素的组合
                        if(model !== existing) {
                            toMerge.push(model);
                        }
                    }else if(add) {
                        //这里有一步很重要,就是取该 model;若该 model是从服务器传回来的,
                        //这时该model显然不能被这样操作
                        model = models[i] = this._prepareModel(model);
                        toAdd.push(model);
                        this._addReference(model);
                    } 
                }

                //如果需要走这一步的话,那么modelMap中的cid都要保留,其它全部删除
                //这一步就是要操作this.models,this._byId,this.length
                if(remove) {
                    for(var m = 0, n = this.length; m < n; m++) {
                        model = this.models[m];
                        if(!modelMap[model.cid]) {//删除
                            toRemove.push(model);
                        }
                    }
                    if(toRemove.length) {
                        this._removeModels(toRemove, options);
                    }
                }

                //操作this.models
                if(set.length && add && remove) {//全部替换型
                    this.models.length = 0;
                    splice(this.models, set, 0);
                    this.length = this.models.length;
                }else if(toAdd.length) {//只添加型
                    splice(this.models, toAdd, at == null ? this.length : at);
                    this.length = this.models.length;
                }

                //触发事件
                if(!options.silent) {
                    for(i = 0, j = toAdd.length; i < j; i++) {
                        model = toAdd[i];
                        model.trigger("add", model, this, options);
                    }
                    if(toAdd.length || toMerge.length || toRemove.length) {
                        options.changed = {
                            added: toAdd,
                            removed: toRemove,
                            merged: toMerge
                        };
                        this.trigger("update", this, options);
                    }
                    if(sort && orderChanged) {
                        this.trigger("sort", this, options);
                    }
                }

                return singular ? models[0] : models;
            },
            reset: function(models, options) {
                var i, j;
                options || (options = {});
                for(i = 0, j = this.models.length; i < j; i++) {
                    this._removeReference(this.models[i], options);
                }
                options.previousModels = this.models;
                this._reset();
                models = this.add(models, _.extend({silent: true}, options));
                if(!options.silent) {
                    this.trigger("reset", this, options);
                }
                return models;
            },
            push: function(model, options) {
                return this.add(model, _.extend({at: this.length}, options));
            },
            pop: function(options) {
                var model = this.models[this.length - 1];
                return this.remove(model, options);
            },
            unshift: function(model, options) {
                return this.add(model, _.extend({at: 0}, options));
            },
            shift: function(options) {
                var model = this.models[0];
                return this.remove(model, options);
            },
            slice: function() {
                return [].slice.apply(this.models, arguments);
            },
            get: function(obj) {
                if(obj == null) {
                    return;
                }

                return this._byId[obj] || 
                    (obj.cid && this._byId[obj.cid]) ||
                    (this._byId[this.modelId(obj.attributes || obj)]);
            },
            has: function(obj) {
                return this.get(obj) != null;
            },
            at: function(index) {
                if(index < 0) {
                    index = this.length - 1;
                }
                return this.models[index];
            },
            where: function(attrs, first) {
                return this[first ? "find" : "filter"](attrs);
            },
            findWhere: function(attrs) {
                return this.where(attrs, true);
            },
            sort: function(options) {
                var comparator = this.comparator;
                if(!comparator) {
                    throw new Error("没有声明比较器");
                }
                options || (options = {});
                //取出参数的长度
                var length = comparator.length;
                if(_.isFunction(comparator)) {
                    comparator = _.bind(comparator, this);
                }
                if(length === 1 || _.isString(comparator)) {
                    this.models = this.sortBy(comparator);
                }else {
                    this.models.sort(comparator);
                }

                if(!options.split) {
                    this.trigger("sort", this, options);
                }
                return this;
            },
            pluck: function() {},
            fetch: function(options) {
                options = _.extend({parse: true}, options);

                var collection = this;
                var success = options.success;
                options.success = function(resp) {
                    var method = options.reset ? "reset" : "set";
                    collection[method](resp, options);
                    success && success.call(options.context, collection, resp, options);
                    collection.trigger("sync", collection, resp, options);
                };
                wrapError(this, options);
                return this.sync("get", this, options);
            },
            create: function(model, options) {
                options = options ? _.clone(options) : {};
                var model = this._prepareModel(model, options);
                if(!model) {
                    return false;
                }
                if(!options.wait) {
                    this.add(model, options);
                }
                var collection = this;
                var success = options.success;
                options.success = function(resp) {
                    if(options.wait) {
                        this.add(model, options);
                    }
                    success && success.call(collection.context, collection, resp, options);
                };
                model.save(null, options);
                return model;
            },
            parse: function(resp, options) {
                return resp;
            },
            clone: function() {
                return new this.constructor(this.models, {
                    model: this.model,
                    comparator: this.comparator
                });
            },
            modelId: function(attrs) {
                return attrs[this.model.prototype.idAttribute || "id"]
            },
            _reset: function() {
                this.length = 0;
                this.models = [];
                this._byId = {};
            },
            _prepareModel: function(attrs, options) {
                if(this._isModel(attrs) && !attrs.collection) {
                    attrs.collection = this;
                    return attrs;
                }
                options = options ? _.clone(options) : {};
                options.collection = this;
                var model = new this.model(attrs, options);
                if(!model.validationError) {
                    return model;
                }
                this.trigger("invalid", this, model.validationError, options);
                return false;
            },
            _removeModels: function(models, options) {
                var removed = [],
                    i, j,
                    model;

                for(i = 0, j = models.length; i < j; i++) {
                    model = this.get(models[i]);
                    if(!model) {
                        continue;
                    }
                    removed.push(model);

                    var index = this.indexOf(model);
                    splice(this.models, model, index);
                    this.length--;

                    delete this._byId[model.cid];
                    var id = this.modelId(model.attributes);
                    if(id) {
                        delete this._byId(id)
                    }

                    if(!options.silent) {
                        options.index = index;
                        model.trigger("remove", this, options);
                    }

                    this._removeReference(model, options);
                }

                return removed;
            },
            _isModel: function(model) {
                return model instanceof Backbone.Model;
            },
            _addReference: function(model, options) {
                this._byId[model.cid] = model;
                var id = this.modelId(model.attributes);
                if(id) {
                    this._byId[id] = model;
                }
                model.on("all", this._onModelEvent, this);
            },
            _removeReference: function(model, options) {
                delete this._byId[model.cid];
                var id = this.modelId(model.attributes);
                if(id) {
                    delete this._byId[id];
                }
                model.off("all", this._onModelEvent, this);
            },
            _onModelEvent: function(event, model, collection, options) {
                if(model) {
                    //只有 model.trigger("add", model, collection) 事件才能往下跑
                    if((event === "add" || event === "remove") && collection !== this) {
                        return;
                    }
                    if(event === "destroy") {
                        this.remove(model, options);
                    }
                    if(event === "change") {
                        var id = this.modelId(model.attributes);
                        var prevId = this.modelId(model.previousAttributes());
                        if(id !== prevId) {
                            if(prevId != null) {
                                delete this._byId[prevId];
                            }
                            if(id != null) {
                                this._byId[id] = model;
                            }
                        }
                    }
                }
                this.trigger.apply(this, arguments);
            },
            indexOf: function(model) {
                var index = -1,
                    models = this.models;

                for(var i = 0, j = models.length; i < j; i++) {
                    if(model == models[i]) {
                        index = i;
                        break;
                    }
                }
                return index;
            }
        };
        _.extend(Collection.prototype, Backbone.Events);

        var collectionMethods = {forEach: 3, each: 3, map: 3, collect: 3, reduce: 0,
              foldl: 0, inject: 0, reduceRight: 0, foldr: 0, find: 3, detect: 3, filter: 3,
              select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
              contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
              head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
              without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
              isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
              sortBy: 3, indexBy: 3, findIndex: 3, findLastIndex: 3};
        addUnderscoreMethods(Collection, collectionMethods, 'models');
    })(Backbone);
    //Collection end   .....

    //Backbone下的API start .....
    Backbone.VERSION = "1.1.1";
    Backbone.sync = function(method, model, options) {
        var methodMap = {
            'create': 'POST',
            'update': 'PUT',
            'patch': 'PATCH',
            'delete': 'DELETE',
            'read': 'GET'
        };
        var type = "GET" || methodMap[method];
        var params = {type: type, dataType: "json"};

        if(!options.url) {
            params.url = _.result(model, "url") || urlError();
        }
        params.data = model.toJSON(model.attributes);

        var beforeSend = options.beforeSend;
        options.beforeSend = function() {
            beforeSend && beforeSend.apply(this, arguments);
        };

        var error = options.error;
        options.error = function() {
           error && error.apply(this, arguments); 
        };

        var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
        model.trigger("request", model, xhr, options);
        return xhr;
    };
    Backbone.$ = $;
    Backbone.ajax = function() {
        return Backbone.$.ajax.apply(this, arguments);
    };
    //这时的Backbone并没有被绑定到 root 上,所以这里的 root.Backbone 为别的 Backbone 或 undefined
    var previousBackbone = root.Backbone;
    Backbone.noConflict = function() {
        root.Backbone = previousBackbone;
        return this;
    };
    _.extend(Backbone, Backbone.Events);
    //Backbone下的API end .....

    //扩展方法 start .....
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
    Backbone.Model.extend = Backbone.View.extend = Backbone.Router.extend = Backbone.Collection.extend =  Backbone.History.extend = extend;
    //扩展方法 end   .....

    return Backbone;
});