/***************************************************************************
    project.......: icb-ws
    description...: HTML5 front-end for ICB
    begin.........: 12/2019
    copyright.....: Sebastian Fedrau
    email.........: sebastian.fedrau@gmail.com
 ***************************************************************************/

/***************************************************************************
    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
    OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
 ***************************************************************************/

export function Storage()
{
	return Object.freeze(
	{
		store: function(key, value)
		{
			localStorage.setItem(key, value);
		},
		storeJSON: function(key, json)
		{
			this.store(key, JSON.stringify(json));
		},
		storeInt: function(key, n)
		{
			this.store(key, n);
		},
		storeBool: function(key, v)
		{
			this.store(key, v ? "true" : "false");
		},
		load: function(key)
		{
			return localStorage.getItem(key);
		},
		loadJSON: function(key)
		{
			return eval("(" + this.load(key) + ")");
		},
		loadInt: function(key)
		{
			return parseInt(this.load(key), 10);
		},
		loadBool: function(key)
		{
			return this.load(key) == "true";
		},
		remove: function(key)
		{
			localStorage.removeItem(key);
		},
	});
}
