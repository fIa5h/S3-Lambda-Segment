"use strict";

var test = require("tape");
var assert = require("assert");
var map = require("./");

test("should map object", function(t) {
	var obj = map({ foo: 2, bar: 5 }, function(key) {
		return key + "baz";
	});
	assert(Object.keys(obj).length === 2);
	assert(obj.foobaz === 2);
	assert(obj.barbaz === 5);
});
