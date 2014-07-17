(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        root.LazyJsonUndoRedo = factory();

        define(function () {
            return root.LazyJsonUndoRedo;
        });
    } else if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        root.LazyJsonUndoRedo = factory();
    }
}(this, function () {
    'use strict';

    var flagCounter = 0;
    
    function LazyJsonUndoRedo(obj) {

        var support = LazyJsonUndoRedo.checkSupport();

        if (support === 'polymer') {
            this.usePolymerShim();
        }
        else if (!support) {
            throw Error('This environment doesn\'t support the ES6 Object.observe()'); 
        }

        this._history = [];
        this._whitelists = [];
        this._blacklists = [];
        this._globalWhitelist = [];
        this._globalBlacklist = [];
        this._pointer = -1;
        this._recChanges = this._recChanges.bind(this);

        this.observeTree(obj);
    }

    var p = LazyJsonUndoRedo.prototype;







    p.observeTree = function (obj, route) {

        if (!obj || typeof(obj) !== 'object') {
            return;
        }

        route = (route || []).concat([obj]);

        this.observe(obj);

        Object.keys(obj).forEach(function (key) {

            if (typeof(obj[key]) === 'object' &&
                route.indexOf(obj[key]) === -1 && //avoid circular reference
                this._isListenable(obj, key))
            {
                this.observeTree(obj[key], route);
            }
        }, this);
    };

    p.unobserveTree = function(obj, route) {

        if (!obj || typeof(obj) !== 'object') {
            return;
        }

        route = (route || []).concat([obj]);

        this.unobserve(obj);

        Object.keys(obj).forEach(function (key) {
          
            if (typeof(obj[key]) === 'object' &&
                route.indexOf(obj[key]) === -1) 
            {
                this.unobserveTree(obj[key]);
            }
        }, this);
    };


    p.observe = function (obj) {

        var observeFn = obj.constructor && obj.constructor.observe || Array.isArray(obj) ? Array.observe : Object.observe;
        observeFn(obj, this._recChanges);
    };

    p.unobserve = function (obj) {

        var unobserveFn = obj.constructor && obj.constructor.unobserve || Array.isArray(obj) ? Array.unobserve : Object.unobserve;
        unobserveFn(obj, this._recChanges);
    };

    LazyJsonUndoRedo.checkSupport = function () {

        if (typeof(Object.observe) === 'function' && typeof(Array.observe) === 'function') {
            
            return 'native';
        }
        else if (typeof(exports) !== 'object' && Platform && typeof(Platform.performMicrotaskCheckpoint) === 'function' &&
            typeof(ObjectObserver) === 'function' && typeof(ArrayObserver) === 'function')
        {
            return 'polymer';
        }

        return false;
    };



    p._recChanges = function(changes) {

        if (this._pointer < this._history.length - 1) {

            this._history.splice(this._pointer + 1);
        }

        changes.forEach(function (change) {

            if (typeof(change) === 'number') {//it's a flag

                this._history.push(change);

                ++this._pointer;
            }
            else if (this._isListenable(change.object, change.name)) {

                var rec = Object.create(null);

                Object.keys(change).forEach(function (key) {

                    rec[key] = change[key];
                });

                this._history.push(rec);

                this.observeTree(change.object);

                ++this._pointer;
            }
        }, this);
    };

    p.undo = function() {

        this.rec();

        if (this._pointer < 0) {

            return false;
        }

        var rec = this._history[this._pointer--];

        if (typeof(rec) === 'number') {

            var startFlagIdx = this._history.indexOf(rec - 1);

            if (startFlagIdx !== -1) {

                while (this._pointer !== startFlagIdx) {

                    this._reverseRecord(this._history[this._pointer--]);
                }

                this._pointer--;
            }
        }
        else {
            this._reverseRecord(rec);
        }
    };

    p.redo = function() {

        this.rec();

        if (this._pointer >= this._history.length - 1) {

            return false;
        }

        var rec = this._history[++this._pointer];
        
        if (typeof(rec) === 'number') {

            var endFlagIdx = this._history.indexOf(rec + 1);

            if (endFlagIdx !== -1) {

                while (++this._pointer !== endFlagIdx) {

                    this._reverseRecord(this._history[this._pointer]);
                }
            }
        }
        else {
            this._reverseRecord(rec);
        }
    };

    p.rec = function () {

        Object.deliverChangeRecords(this._recChanges);
    };

    p._reverseRecord = function (rec) {

        if (typeof(rec) === 'number') {//it's a flag
            return;
        }

        var temp;

        this.unobserve(rec.object);

        switch (rec.type) {

            case 'add':
                rec.type = 'delete';
                rec.oldValue = rec.object[rec.name];
                delete rec.object[rec.name];
                break;

            case 'update':
                temp = rec.object[rec.name];
                rec.object[rec.name] = rec.oldValue;
                rec.oldValue = temp;
                break;

            case 'delete':
                rec.type = 'add';
                rec.object[rec.name] = rec.oldValue;
                delete rec.oldValue;
                break;

            case 'splice':
                temp = Array.prototype.splice.apply(rec.object, [rec.index, rec.addedCount].concat(rec.removed));
                rec.addedCount = rec.removed.length;
                rec.removed = temp;
                break;
        }

        this.observe(rec.object);
    };






    p.startFlag = function () {

        this.rec();

        this._recChanges([flagCounter++]);
        return flagCounter++;
    };

    p.endFlag = function (flag) {

        this.rec();
        this._recChanges([flag]);
    };

    p.wrap = function (fn, ctx) {

        var that = this;

        return function () {

            var endFlag = that.startFlag();

            fn.apply(ctx, Array.prototype.slice.call(arguments,  2));

            that.endFlag(endFlag);
        };
    };





//--------------------------------------------------------------------------------------------------
//  White- and blacklisting
//--------------------------------------------------------------------------------------------------


    p.setWhitelist = function (obj, list) {

        this.removeWhitelist(obj);

        this._whitelists.push({obj: obj, list: list});
    };

    p.getWhitelist = function (obj) {

        for (var i = 0, l = this._whitelists.length; i < l; ++i) {

            if (this._whitelists[i].obj === obj) {

                return this._whitelists[i];
            }
        }
    };

    p.removeWhitelist = function (obj) {

        for (var i = 0; i < this._whitelists.length; ++i) {

            if (this._whitelists[i].obj === obj) {

                this._whitelists.splice(i--, 1);
            }
        }
    };

    p.setBlacklist = function (obj, list) {

        this.removeBlacklist(obj);

        this._blacklists.push({obj: obj, list: list});
    };

    p.getBlacklist = function (obj) {

        for (var i = 0, l = this._blacklists.length; i < l; ++i) {

            if (this._blacklists[i].obj === obj) {

                return this._blacklists[i];
            }
        }
    };

    p.removeBlacklist = function (obj) {

        for (var i = 0; i < this._blacklists.length; ++i) {

            if (this._blacklists[i].obj === obj) {

                this._blacklists.splice(i--, 1);
            }
        }
    };

    p.addToGlobalWhitelist = function (/*...keys*/) {

        var args = arguments;

        for (var i = 0, l = args.length; i < l; ++i) {

            this._globalWhitelist.push(args[i]);
        }
    };

    p.removeFromGlobalWhitelist = function (/*...keys*/) {

        var args = arguments;

        this._globalWhitelist = this._globalWhitelist.filter(function (paramName) {

            return Array.prototype.indexOf.call(args, paramName) === -1;
        });
    };

    p.addToGlobalBlacklist = function (/*...keys*/) {

        var args = arguments;

        for (var i = 0, l = args.length; i < l; ++i) {

            this._globalBlacklist.push(args[i]);
        }
    };

    p.removeFromGlobalBlacklist = function (/*...keys*/) {

        var args = arguments;

        this._globalBlacklist = this._globalBlacklist.filter(function (paramName) {

            return Array.prototype.indexOf.call(args, paramName) === -1;
        });
    };

    p._isListenable = function (obj, paramName) {

        var wl = this.getWhitelist(obj),
            bl = this.getBlacklist(obj);

        if (wl && wl.list.indexOf(paramName) === -1) {

            return false;
        }
        
        if (bl && bl.list.indexOf(paramName) !== -1) {

            return false;
        }

        if (this._globalWhitelist.length !== 0 && this._globalWhitelist.indexOf(paramName) === -1) {

            return false;
        }

        if (this._globalBlacklist.indexOf(paramName) !== -1) {

            return false;
        }

        return true;
    };









//--------------------------------------------------------------------------------------------------
//  Polymer plugin
//--------------------------------------------------------------------------------------------------
    
    p.usePolymerShim = function () {

        if (this._isPolymerShimInited) {
            return;
        }
        this._isPolymerShimInited = true;
        this.usingShim = true;

        var observers = [], observeds = [];

        this.rec = function () {

            Platform.performMicrotaskCheckpoint();
        };

        this.observe = function (obj) {

            Array.isArray(obj) ? observeArr.call(this, obj) : observeObj.call(this, obj);
        };

        this.unobserve = function (obj) {

            var idx = observeds.indexOf(obj);

            if (idx !== -1) {

                observeds.splice(idx, 1);
                observers.splice(idx, 1)[0].close();
            }
        };

        function isObserved(obj) {

            return observeds.indexOf(obj) !== -1;
        }

        function observeObj(obj) {

            if (isObserved(obj)) {
                return;
            }
            
            var that = this, observer = new ObjectObserver(obj);

            observeds.push(obj);
            observers.push(observer);

            observer.open(function(added, removed, changed, getOldValueFn) {
              
                var changes = [];

                Object.keys(added).forEach(function(property) {
                    changes.push({object:obj, type: 'add', name: property});
                });

                Object.keys(removed).forEach(function(property) {
                    changes.push({object:obj, type: 'delete', name: property, oldValue: getOldValueFn(property)});
                });

                Object.keys(changed).forEach(function(property) {
                    changes.push({object:obj, type: 'update', name: property, oldValue: getOldValueFn(property)});
                });

                that._recChanges(changes);
            });
        }

        function observeArr(arr) {

            if (isObserved(arr)) {
                return;
            }
            
            var that = this, observer = new ArrayObserver(arr);

            observeds.push(arr);
            observers.push(observer);

            observer.open(function(splices) {
              
                splices.forEach(function(splice) {
                    
                    splice.object = arr;
                    splice.type = 'splice';
                });

                that._recChanges(splices);
            });
        }
    };


    return LazyJsonUndoRedo;
}));