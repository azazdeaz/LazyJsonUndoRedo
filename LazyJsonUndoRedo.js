(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        root.LazyJsonUndoRedo = factory()

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

    var flagCounter = 0, maxHistoryLength = -1;
    
    function LazyJsonUndoRedo(obj) {

        var support = LazyJsonUndoRedo.checkSupport();

        if (support === 'polymer') {
            this.usePolymerShim();
        }
        else if (!support) {
            throw Error('This environment doesn\'t support the ES6 Object.observe()'); 
        }

        this._history = [];

        this._pointer = -1;

        this._recChanges = this._recChanges.bind(this);

        this.observeTree(obj);
    }

    var p = LazyJsonUndoRedo.prototype;

    p.observeTree = function (obj) {

        this.observe(obj);

        Object.keys(obj).forEach(function (key) {
          
            if (typeof(obj[key]) === 'object') {

                this.observeTree(obj[key]);
            }
        }, this);
    };

    p.unobserveTree = function(obj) {

        this.unobserve(obj);

        Object.keys(obj).forEach(function (key) {
          
            if (typeof(obj[key]) === 'object') {

                this.unobserveTree(obj[key]);
            }
        }, this);
    };

    p._recChanges = function(changes) {

        var that = this;

        if (this._pointer < this._history.length - 1) {

            this._history.splice(this._pointer + 1);
        }

        changes.forEach(function (change) {

            if (typeof(change) === 'number') {//it's a flag

                that._history.push(change);
            }
            else {
                var rec = Object.create(null);

                Object.keys(change).forEach(function (key) {

                    rec[key] = change[key];
                });

                that._history.push(rec);

                that.observeTree(change.object);
            }

        });

        this._pointer += changes.length;
    };

    p.undo = function() {

        this.deliverChangeRecords();

        if (this._pointer < 0) {

            return false;
        }

        var rec = this._history[this._pointer--];

        if (typeof(rec) === 'number') {

            for (var startFlagIdx = this._pointer; startFlagIdx >= 0; --startFlagIdx) {

                if (this._history[startFlagIdx] === rec - 1) {

                    do {
                        this._reverseRecord(this._history[this._pointer--]);
                    } 
                    while (this._pointer >= startFlagIdx);

                    break;
                }
            }
        }
        else {
            this._reverseRecord(rec);
        }
    };

    p.redo = function() {

        this.deliverChangeRecords();

        if (this._pointer >= this._history.length - 1) {

            return false;
        }

        var rec = this._history[++this._pointer];
        
        if (typeof(rec) === 'number') {

            for (var endFlagIdx = this._pointer; endFlagIdx < this._history.length; ++endFlagIdx) {

                if (this._history[endFlagIdx] === rec + 1) {

                    do {
                        this._reverseRecord(this._history[this._pointer++]);
                    } 
                    while (this._pointer <= endFlagIdx);

                    break;
                }
            }
        }
        else {
            this._reverseRecord(rec);
        }
    };

    p.deliverChangeRecords = function () {

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

        this.deliverChangeRecords();

        this._recChanges([flagCounter++]);
        return flagCounter++;
    };

    p.endFlag = function (flag) {

        this.deliverChangeRecords();
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
        else if (window.Platform && typeof(Platform.performMicrotaskCheckpoint) === 'function' &&
            typeof(window.ObjectObserver) === 'function' && typeof(window.ArrayObserver) === 'function')
        {
            return 'polymer';
        }

        return false;
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

        this.deliverChangeRecords = function () {

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