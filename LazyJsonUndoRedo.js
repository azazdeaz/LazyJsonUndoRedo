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

        this._history = [];
        // this._observedObjects = [];
        this._pointer = -1;

        this.recChanges = this.recChanges.bind(this);

        this.observeTree(obj);
    }

    var p = LazyJsonUndoRedo.prototype;

    p.observeTree = function (obj) {

        getObserveFn(obj)(obj, this.recChanges);

        Object.keys(obj).forEach(function (key) {
          
            if (typeof(obj[key]) === 'object') {

                this.observeTree(obj[key]);
            }
        }, this);
    };

    p.unobserveTree = function(obj) {

        getUnobserveFn(obj)(obj, this.recChanges);

        Object.keys(obj).forEach(function (key) {
          
            if (typeof(obj[key]) === 'object') {

                this.unobserveTree(obj[key]);
            }
        }, this);
    };

    p.recChanges = function(changes) {

        var that = this;

        if (this._pointer < this._history.length - 1) {

            this._history.splice(this._pointer + 1);
        }

        changes.forEach(function (change) {

            var rec = Object.create(null);

            Object.keys(change).forEach(function (key) {

                rec[key] = change[key];
            });

            that._history.push(rec);
            console.log(rec);
            that.observeTree(change.object);
        });

        this._pointer += changes.length;
    };

    p.undo = function() {

        Object.deliverChangeRecords(this.recChanges);

        if (this._pointer < 0) {

            return false;
        }

        var rec = this._history[this._pointer--];
        this._reverseRecord(rec);
    };

    p.redo = function() {

        Object.deliverChangeRecords(this.recChanges);

        if (this._pointer >= this._history.length - 1) {

            return false;
        }

        var rec = this._history[++this._pointer];
        this._reverseRecord(rec);
    };

    p._reverseRecord = function (rec) {

        var temp;

        getUnobserveFn(rec.object)(rec.object, this.recChanges);

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
                delete rec.oldValue;
                delete rec.object[rec.name];
                break;

            case 'splice':
                temp = Array.prototype.splice.apply(rec.object, [rec.index, rec.addedCount].concat(rec.removed));
                rec.addedCount = rec.removed.length;
                rec.removed = temp;
                break;
        }

        getObserveFn(rec.object)(rec.object, this.recChanges);
    };






    p.startFlag = function () {

        this.recChanges([flagCounter++]);
        return flagCounter++;
    };

    p.endFlag = function (flag) {

        this.recChanges([flag]);
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


    return LazyJsonUndoRedo;
}));