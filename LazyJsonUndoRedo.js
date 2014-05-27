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

        if (!LazyJsonUndoRedo.checkSupport()) {
            throw 'This environment doesn\'t fully support the ES6 Object.observe()'; 
        }

        this._history = [];
        // this._observedObjects = [];
        this._pointer = -1;

        this._recChanges = this._recChanges.bind(this);

        this.observeTree(obj);
    }

    var p = LazyJsonUndoRedo.prototype;

    p.observeTree = function (obj) {

        getObserveFn(obj)(obj, this._recChanges);

        Object.keys(obj).forEach(function (key) {
          
            if (typeof(obj[key]) === 'object') {
console.log('also observe', key)
                this.observeTree(obj[key]);
            }
        }, this);
    };

    p.unobserveTree = function(obj) {

        getUnobserveFn(obj)(obj, this._recChanges);

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
                console.log('new rec', rec);
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
    }

    p._reverseRecord = function (rec) {

        if (typeof(rec) === 'number') {//it's a flag
            return;
        }

        var temp;

        getUnobserveFn(rec.object)(rec.object, this._recChanges);

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

        getObserveFn(rec.object)(rec.object, this._recChanges);
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

        return wrapper.bind(fn, ctx);
        
        function wrapper(fn, ctx) {

            var endFlag = that.startFlag();

            fn.apply(ctx, Array.prototype.slice.call(arguments,  2));

            that.endFlag(endFlag);
        }
    };




    function getObserveFn(obj) {
        return obj.constructor && obj.constructor.observe || Array.isArray(obj) ? Array.observe : Object.observe
    }

    function getUnobserveFn(obj) {
        return obj.constructor && obj.constructor.unobserve || Array.isArray(obj) ? Array.unobserve : Object.unobserve
    }

    LazyJsonUndoRedo.checkSupport = function () {

        if (typeof(Object.observe) !== 'function') {
            return false;
        }

        if (typeof(Array.observe) !== 'function') {
            return false;
        }

        return true;
    }


    return LazyJsonUndoRedo;
}));