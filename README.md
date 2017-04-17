

LazyJsonUndoRedo [![Build Status](https://travis-ci.org/azazdeaz/LazyJsonUndoRedo.svg?branch=master)](https://travis-ci.org/azazdeaz/LazyJsonUndoRedo)
================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/azazdeaz/LazyJsonUndoRedo?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

***Update: The world [has](http://www.ybrikman.com/writing/2015/02/06/are-static-typing-and-functional/) [changed](http://www.sitepoint.com/immutability-javascript/) and [Object.observe() will not going to be a thing anymore](https://esdiscuss.org/topic/an-update-on-object-observe). I leave this repo here as a fun experiment.***

An experimental tool to create a 'drop in' history handler with automatic undo/redo functionality for nested javascript objects, using Object.observe() or Polymer shim.

Can be usefull for small editor tools but it's not recommended to be used in production.

Object.observe() is only supported in Chrome 36+, Opera 23+, io.js and Nodejs 11.13+ yet, but LJUR is also usable with [polymer](https://github.com/polymer/polymer)([observe-js](https://github.com/Polymer/observe-js))

#### Demo
[edit json](http://codepen.io/azazdeaz/pen/ucqAm?editors=001)

[edit maze](http://codepen.io/azazdeaz/pen/AEgGe?editors=001)

#### Install
```
bower install --save LazyJsonUndoRedo
npm install --save lazy-json-undo-redo
```

#### Unit tests
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
 //the changes between the start- end endFlag calls will be treated as one step 
 //in the history  
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
 changerFn();//all changes are reversible with one undo() call


Force save
 //fast changes can be merged by the api (specially if you're using shim)
 o = {}, ljur = new LazyJsonUndoRedo(o);
 o.g = {};
 o.g.h = 1;
 ljur.undo();
 console.log(o); //{}

 //to avoid this, you can force the history save with ljur.rec()
 o.i = {};
 ljur.rec();
 o.i.j = 2;
 ljur.undo();
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
 ljur.undo();
 console.log(o); // {c: 8}
 
 ljur.getWhitelist(o); //['a', 'b']
 ljur.removeWhiteList(o);//whitelists are removable


Use blacklists
 //works the same as whitelists
 ljur.setBlacklist(object, blacklistedKeys);
 ljur.removeBlacklist(object);


Use global black- and whitelist
 //you can use this two list for all of the objects added to ljur
 ljur.addToGlobalWhitelist('a', 'b', 'x', 'd', 'e');
 ljur.removeFromGlobalWhitelist('e', 'x');
 ljur.addToGlobalBlacklist('a', 'b', 'x', 'd', 'e');
 ljur.removeFromGlobalBlacklist('e', 'x');



Listen to more objects
 ljur.observeTree(o2);
 ljur.observeTree(o3);


Check support
 LazyJsonUndoRedo.checkSupport();//true is native Object.observe() or Polymer is present
 ljur.usingShim;//true if the instance is using Polymer shim

```
