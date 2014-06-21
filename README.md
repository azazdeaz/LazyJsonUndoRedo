[![Build Status](https://travis-ci.org/azazdeaz/LazyJsonUndoRedo.svg?branch=master)](https://travis-ci.org/azazdeaz/LazyJsonUndoRedo)

LazyJsonUndoRedo
================

A 'drop in' history handler with automatic undo/redo functionality for nested javascript objects, using ES6 Object.observe() or Polymer shim.

ES6 Object.observe() is only supported in Chrome 36+ and Nodejs 11.13+ yet, but LJUR is also usable with [polymer](https://github.com/polymer/polymer)([observe-js](https://github.com/Polymer/observe-js))

####Demo
[edit json](http://codepen.io/azazdeaz/pen/ucqAm?editors=001)

[edit maze](http://codepen.io/azazdeaz/pen/AEgGe?editors=001)

####Unit test
[native](http://azazdeaz.github.io/LazyJsonUndoRedo/test/test-native.html)

[with polymer shim](http://azazdeaz.github.io/LazyJsonUndoRedo/test/test-polymer.html)

Usage
-----


```javascript

Init
 var o = {}, ljur = new LazyJsonUndoRedo(o);
 
 o.a = 1;
 ljur.undo();
 console.log(o.a); // undefined
 ljur.redo();
 console.log(o.a); // 1


Flagging
 o = {}, ljur = new LazyJsonUndoRedo(o);
 //the changes between the start- end endFlag calls will be treated as one step in the history  
 var endFlagId = ljur.startFlag();
 o.c = {}
 o.c.b = 1
 o.c.e = 2
 o.f = 4;
 ljur.endFlag(endFlagId);
 ljur.undo();
 console.log(o); //{}
 ljur.redo();
 console.log(o); //{c: {b: 1, e: 2}, f: 4}
 
 //or wrap a function between flags:
 var changerFn = ljur.wrap(function () {/*do changes on o*/});
 changerFn();//all changes are reversible with one redo() call


Force save
 //fast changes can be merged by the api (specially if you're using shim)
 o = {}, ljur = new LazyJsonUndoRedo(o);
 o.g = {};
 o.g.h = 1;
 ljur.redo();
 console.log(o); //{}

 //to avoid this, you can force the history save with ljur.deliverChangeRecords()
 o.i = {};
 ljur.deliverChangeRecords();
 o.i.j = 2;
 ljur.redo();
 console.log(o); // {i: {}}


Use whitelists
 //if you want to specify witch properties should be listened on an object, 
 // you can use whitelists: 
 o = {};
 ljur = new LazyJsonUndoRedo();
 ljur.setWhiteList(o, ['a', 'b']);
 ljur.observeTree(o);//you have to set the whitelist before start to observe the object
 o.a = 7; //will be undoable
 o.c = 8; //won't be undoable, because 'c' is not on the whitelist
 
 ljur.removeWhiteList(o);//whitelists are removable
 


Listen to more objects
 ljur.observeTree(o2);
 ljur.observeTree(o3);


Check support
 LazyJsonUndoRedo.checkSupport();//true is native Object.observe() or Polymer is present
 ljur.usingShim;//true if it's usin Polymer shim

```
